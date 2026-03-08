from __future__ import annotations

import os
import time
from pathlib import Path
from threading import Lock
from typing import Any, Dict, Iterable, Optional

import numpy as np
import torch
from diffusers import DDIMInverseScheduler, DDIMScheduler, StableDiffusionPipeline
from PIL import Image
from scipy.stats import norm

from .metrics import bit_metrics, bits_to_text, ecc_decode, ecc_encode, text_to_bits, to_bit_list
from .utils import new_id, save_record


class MDDMService:
    def __init__(self, image_dir: Path, record_dir: Path) -> None:
        self.image_dir = image_dir
        self.record_dir = record_dir
        self.lock = Lock()

        self.model_id = os.getenv("SD_MODEL_ID", "runwayml/stable-diffusion-v1-5")
        token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_TOKEN")

        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.dtype = torch.float16 if self.device == "cuda" else torch.float32

        self.pipe = StableDiffusionPipeline.from_pretrained(
            self.model_id,
            torch_dtype=self.dtype,
            token=token,
            use_safetensors=True,
        )
        self.pipe.scheduler = DDIMScheduler.from_config(self.pipe.scheduler.config)
        self.pipe = self.pipe.to(self.device)
        self.pipe.enable_attention_slicing()
        try:
            self.pipe.enable_xformers_memory_efficient_attention()
        except Exception:
            pass

    @staticmethod
    def generate_cardan_grille(total: int, length: int, seed: Optional[int] = None) -> torch.Tensor:
        g = torch.Generator(device="cpu")
        if seed is not None:
            g.manual_seed(int(seed))
        return torch.randperm(total, generator=g)[:length]

    @staticmethod
    def truncation_threshold(total: int, length: int) -> float:
        p = 1.0 - (length / (2.0 * total))
        return float(norm.ppf(p))

    @staticmethod
    def sample_truncated_normal(
        n: int,
        low: Optional[float] = None,
        high: Optional[float] = None,
        generator: Optional[torch.Generator] = None,
    ) -> torch.Tensor:
        if n <= 0:
            return torch.empty((0,), dtype=torch.float32)
        out = []
        needed = n
        while needed > 0:
            batch = torch.randn((max(needed * 2, 1024),), generator=generator)
            mask = torch.ones_like(batch, dtype=torch.bool)
            if low is not None:
                mask &= batch > low
            if high is not None:
                mask &= batch <= high
            accepted = batch[mask]
            if accepted.numel() > 0:
                out.append(accepted)
                needed -= accepted.numel()
        return torch.cat(out)[:n]

    def encode_message_to_noise(self, bits: Iterable[int], c: int = 4, h: int = 64, w: int = 64, seed: Optional[int] = None):
        total = c * h * w
        bits_list = to_bit_list(bits)
        length = len(bits_list)
        if length > total:
            raise ValueError("Message too long for noise size")

        k = self.truncation_threshold(total, length)
        cg = self.generate_cardan_grille(total, length, seed=seed)

        gen = torch.Generator(device="cpu")
        if seed is not None:
            gen.manual_seed(int(seed) + 12345)

        noise = torch.empty((total,), dtype=torch.float32)
        bits_t = torch.tensor(bits_list, dtype=torch.int64)

        left_idx = cg[bits_t == 0]
        right_idx = cg[bits_t == 1]

        if left_idx.numel() > 0:
            noise[left_idx] = self.sample_truncated_normal(left_idx.numel(), low=None, high=-k, generator=gen)
        if right_idx.numel() > 0:
            noise[right_idx] = self.sample_truncated_normal(right_idx.numel(), low=k, high=None, generator=gen)

        mask = torch.ones((total,), dtype=torch.bool)
        mask[cg] = False
        central_idx = torch.where(mask)[0]
        if central_idx.numel() > 0:
            noise[central_idx] = self.sample_truncated_normal(central_idx.numel(), low=-k, high=k, generator=gen)

        return noise.view(1, c, h, w), cg, k

    @staticmethod
    def extract_bits_from_noise(noise: torch.Tensor, cg: torch.Tensor) -> list[int]:
        flat = noise.view(-1)
        vals = flat[cg]
        return (vals > 0).int().cpu().tolist()

    def _inverse_scheduler(self, steps: int) -> DDIMInverseScheduler:
        cfg = dict(self.pipe.scheduler.config)
        cfg.pop("skip_prk_steps", None)
        inv = DDIMInverseScheduler.from_config(cfg)
        inv.set_timesteps(steps)
        return inv

    def _pil_to_latents(self, pil_image: Image.Image) -> torch.Tensor:
        image = np.array(pil_image).astype(np.float32) / 255.0
        if image.ndim == 2:
            image = np.stack([image] * 3, axis=-1)
        image = image[None].transpose(0, 3, 1, 2)
        image_t = torch.from_numpy(image).to(self.device, dtype=self.dtype)
        image_t = 2.0 * image_t - 1.0
        with torch.no_grad():
            latents = self.pipe.vae.encode(image_t).latent_dist.sample()
        scaling = getattr(self.pipe.vae.config, "scaling_factor", 0.18215)
        return latents * scaling

    def _prompt_embeds(self, prompt: str, negative_prompt: Optional[str], do_cfg: bool):
        if hasattr(self.pipe, "encode_prompt"):
            pe, ne = self.pipe.encode_prompt(
                prompt=prompt,
                device=self.device,
                num_images_per_prompt=1,
                do_classifier_free_guidance=do_cfg,
                negative_prompt=negative_prompt,
            )
            return torch.cat([ne, pe]) if do_cfg else pe
        return self.pipe._encode_prompt(prompt, self.device, 1, do_cfg, negative_prompt)

    def ddim_invert(
        self,
        image: Image.Image,
        prompt: str,
        negative_prompt: Optional[str],
        num_steps: int,
        guidance_scale: float,
    ) -> torch.Tensor:
        inv_scheduler = self._inverse_scheduler(num_steps)
        do_cfg = guidance_scale > 1.0
        prompt_embeds = self._prompt_embeds(prompt, negative_prompt, do_cfg)

        latents = self._pil_to_latents(image)
        with torch.no_grad():
            for t in inv_scheduler.timesteps:
                latent_model_input = torch.cat([latents] * 2) if do_cfg else latents
                noise_pred = self.pipe.unet(latent_model_input, t, encoder_hidden_states=prompt_embeds).sample
                if do_cfg:
                    noise_uncond, noise_text = noise_pred.chunk(2)
                    noise_pred = noise_uncond + guidance_scale * (noise_text - noise_uncond)
                latents = inv_scheduler.step(noise_pred, t, latents).prev_sample

        init_sigma = self.pipe.scheduler.init_noise_sigma
        return (latents / init_sigma).detach().cpu()

    def _build_metrics_payload(self, expected_bits: list[int], recovered_encoded_bits: list[int], ecc_mode: str, encoded_bits_len: int) -> Dict[str, Any]:
        payload_hat_bits, _ = ecc_decode(recovered_encoded_bits, mode=ecc_mode, original_len=len(expected_bits))
        m = bit_metrics(expected_bits, payload_hat_bits)
        recovered_text = bits_to_text(payload_hat_bits)
        return {
            "recovered_message": recovered_text,
            "bit_accuracy": float(m["bit_accuracy"]),
            "ber": float(m["ber"]),
            "exact_match": bool(m["exact_match"]),
            "bit_errors": int(m["bit_errors"]),
            "payload_bits": len(expected_bits),
            "encoded_bits": encoded_bits_len,
        }

    def generate(
        self,
        prompt: str,
        hidden_message: str,
        seed: Optional[int],
        num_steps: int,
        guidance_scale: float,
        negative_prompt: Optional[str],
        ecc_mode: str = "none",
        extra_metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        if seed is None:
            seed = int(time.time() * 1000) % 1_000_000

        start = time.perf_counter()
        with self.lock:
            payload_bits = text_to_bits(hidden_message)
            encoded_bits, _ = ecc_encode(payload_bits, mode=ecc_mode)

            c, h, w = 4, 64, 64
            xT, cg, _ = self.encode_message_to_noise(encoded_bits, c=c, h=h, w=w, seed=seed)

            init_sigma = self.pipe.scheduler.init_noise_sigma
            latents = xT.to(self.device, dtype=self.dtype) * init_sigma

            with torch.no_grad():
                result = self.pipe(
                    prompt=prompt,
                    negative_prompt=negative_prompt,
                    num_inference_steps=num_steps,
                    guidance_scale=guidance_scale,
                    eta=0.0,
                    latents=latents,
                    output_type="pil",
                )
            image = result.images[0]

        image_id = new_id("stego")
        image_path = self.image_dir / f"{image_id}.png"
        image.save(image_path)

        record = {
            "image_id": image_id,
            "image_path": str(image_path),
            "image_url": f"/static/images/{image_path.name}",
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "seed": seed,
            "num_steps": num_steps,
            "guidance_scale": guidance_scale,
            "ecc_mode": ecc_mode,
            "payload_text": hidden_message,
            "payload_bits": payload_bits,
            "encoded_bits": encoded_bits,
            "cg": cg.tolist(),
            "metadata": extra_metadata or {},
            "created_at": time.time(),
        }
        save_record(self.record_dir, image_id, record)

        return {
            "image_id": image_id,
            "image_url": record["image_url"],
            "prompt": prompt,
            "seed": seed,
            "payload_bits": len(payload_bits),
            "encoded_bits": len(encoded_bits),
            "ecc_mode": ecc_mode,
            "runtime_s": time.perf_counter() - start,
        }

    def decode(
        self,
        record: Dict[str, Any],
        prompt_override: Optional[str] = None,
        negative_prompt_override: Optional[str] = None,
        num_steps_override: Optional[int] = None,
        guidance_scale_override: Optional[float] = None,
        image_override: Optional[Image.Image] = None,
    ) -> Dict[str, Any]:
        start = time.perf_counter()

        prompt = prompt_override if prompt_override is not None else record["prompt"]
        negative_prompt = negative_prompt_override if negative_prompt_override is not None else record.get("negative_prompt")
        num_steps = int(num_steps_override if num_steps_override is not None else record["num_steps"])
        guidance_scale = float(guidance_scale_override if guidance_scale_override is not None else record["guidance_scale"])
        image = image_override if image_override is not None else Image.open(record["image_path"]).convert("RGB")

        with self.lock:
            xT_hat = self.ddim_invert(
                image=image,
                prompt=prompt,
                negative_prompt=negative_prompt,
                num_steps=num_steps,
                guidance_scale=guidance_scale,
            )

        cg = torch.tensor(record["cg"], dtype=torch.long)
        recovered_encoded_bits = self.extract_bits_from_noise(xT_hat, cg)

        metrics = self._build_metrics_payload(
            expected_bits=record["payload_bits"],
            recovered_encoded_bits=recovered_encoded_bits,
            ecc_mode=record.get("ecc_mode", "none"),
            encoded_bits_len=len(record["encoded_bits"]),
        )

        return {
            "image_id": record["image_id"],
            "image_url": record["image_url"],
            "metrics": {
                **metrics,
                "ecc_mode": record.get("ecc_mode", "none"),
            },
            "runtime_s": time.perf_counter() - start,
        }
