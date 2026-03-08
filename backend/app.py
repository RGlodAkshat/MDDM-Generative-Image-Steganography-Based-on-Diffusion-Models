from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any, Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from PIL import Image

from .attacks import apply_attack
from .pipeline import MDDMService
from .schemas import (
    AttackDecodeRequest,
    AttackDecodeResponse,
    AttackRequest,
    AttackResponse,
    CompareItem,
    CompareRequest,
    CompareResponse,
    DecodeProvenanceRequest,
    DecodeProvenanceResponse,
    DecodeRequest,
    DecodeResponse,
    GenerateRequest,
    GenerateResponse,
    HealthResponse,
    ProvenanceRequest,
    ProvenanceResponse,
)
from .utils import ensure_dirs, load_record, new_id, save_record


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
paths = ensure_dirs(DATA_DIR)

service = MDDMService(image_dir=paths["images"], record_dir=paths["records"])

app = FastAPI(title="MDDM Demo API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(DATA_DIR)), name="static")


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        device=service.device,
        model_id=service.model_id,
        model_loaded=True,
    )


@app.post("/generate", response_model=GenerateResponse)
def generate(req: GenerateRequest) -> GenerateResponse:
    try:
        out = service.generate(
            prompt=req.prompt,
            hidden_message=req.hidden_message,
            seed=req.seed,
            num_steps=req.num_steps,
            guidance_scale=req.guidance_scale,
            negative_prompt=req.negative_prompt,
            ecc_mode=req.ecc_mode.value,
        )
        return GenerateResponse(**out)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=f"Generation failed: {exc}") from exc


@app.post("/decode", response_model=DecodeResponse)
def decode(req: DecodeRequest) -> DecodeResponse:
    try:
        record = load_record(paths["records"], req.image_id)
        out = service.decode(
            record,
            prompt_override=req.prompt,
            negative_prompt_override=req.negative_prompt,
            num_steps_override=req.num_steps,
            guidance_scale_override=req.guidance_scale,
        )
        return DecodeResponse(**out)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Decode failed: {exc}") from exc


@app.post("/generate-compare", response_model=CompareResponse)
def generate_compare(req: CompareRequest) -> CompareResponse:
    start = time.perf_counter()
    try:
        a = service.generate(
            prompt=req.prompt_a,
            hidden_message=req.hidden_message,
            seed=req.seed_a,
            num_steps=req.num_steps,
            guidance_scale=req.guidance_scale,
            negative_prompt=req.negative_prompt,
            ecc_mode=req.ecc_mode.value,
        )
        b = service.generate(
            prompt=req.prompt_b,
            hidden_message=req.hidden_message,
            seed=req.seed_b,
            num_steps=req.num_steps,
            guidance_scale=req.guidance_scale,
            negative_prompt=req.negative_prompt,
            ecc_mode=req.ecc_mode.value,
        )

        rec_a = load_record(paths["records"], a["image_id"])
        rec_b = load_record(paths["records"], b["image_id"])
        dec_a = service.decode(rec_a)
        dec_b = service.decode(rec_b)

        items = [
            CompareItem(
                image_id=a["image_id"],
                image_url=a["image_url"],
                prompt=req.prompt_a,
                seed=a["seed"],
                metrics=dec_a["metrics"],
                generate_runtime_s=float(a["runtime_s"]),
                decode_runtime_s=float(dec_a["runtime_s"]),
            ),
            CompareItem(
                image_id=b["image_id"],
                image_url=b["image_url"],
                prompt=req.prompt_b,
                seed=b["seed"],
                metrics=dec_b["metrics"],
                generate_runtime_s=float(b["runtime_s"]),
                decode_runtime_s=float(dec_b["runtime_s"]),
            ),
        ]
        return CompareResponse(items=items, runtime_s=time.perf_counter() - start)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Compare failed: {exc}") from exc


@app.post("/attack", response_model=AttackResponse)
def attack(req: AttackRequest) -> AttackResponse:
    try:
        record = load_record(paths["records"], req.image_id)
        src_img = Image.open(record["image_path"]).convert("RGB")
        attacked_img = apply_attack(src_img, req.attack_type.value, req.attack_strength)

        attacked_id = new_id("atk")
        attacked_path = paths["images"] / f"{attacked_id}.png"
        attacked_img.save(attacked_path)

        attacked_record = {
            **record,
            "image_id": attacked_id,
            "image_path": str(attacked_path),
            "image_url": f"/static/images/{attacked_path.name}",
            "source_image_id": req.image_id,
            "attack": {
                "type": req.attack_type.value,
                "strength": req.attack_strength,
            },
        }
        save_record(paths["records"], attacked_id, attacked_record)

        return AttackResponse(
            source_image_id=req.image_id,
            source_image_url=record["image_url"],
            attacked_image_id=attacked_id,
            attacked_image_url=attacked_record["image_url"],
            attack_type=req.attack_type,
            attack_strength=req.attack_strength,
        )
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Attack failed: {exc}") from exc


@app.post("/attack-decode", response_model=AttackDecodeResponse)
def attack_decode(req: AttackDecodeRequest) -> AttackDecodeResponse:
    start = time.perf_counter()
    attack_out = attack(AttackRequest(image_id=req.image_id, attack_type=req.attack_type, attack_strength=req.attack_strength))

    attacked_record = load_record(paths["records"], attack_out.attacked_image_id)
    dec = service.decode(
        attacked_record,
        prompt_override=req.prompt,
        negative_prompt_override=req.negative_prompt,
        num_steps_override=req.num_steps,
        guidance_scale_override=req.guidance_scale,
    )

    return AttackDecodeResponse(
        source_image_id=attack_out.source_image_id,
        source_image_url=attack_out.source_image_url,
        attacked_image_id=attack_out.attacked_image_id,
        attacked_image_url=attack_out.attacked_image_url,
        attack_type=req.attack_type,
        attack_strength=req.attack_strength,
        metrics=dec["metrics"],
        decode_runtime_s=float(dec["runtime_s"]),
        runtime_s=time.perf_counter() - start,
    )


@app.post("/generate-provenance", response_model=ProvenanceResponse)
def generate_provenance(req: ProvenanceRequest) -> ProvenanceResponse:
    metadata = {
        "experiment_id": req.experiment_id,
        "team_name": req.team_name,
        "date": req.date,
        "model_name": req.model_name,
        "notes": req.notes,
    }
    hidden = json.dumps(metadata, ensure_ascii=False)

    out = service.generate(
        prompt=req.prompt,
        hidden_message=hidden,
        seed=req.seed,
        num_steps=req.num_steps,
        guidance_scale=req.guidance_scale,
        negative_prompt=req.negative_prompt,
        ecc_mode=req.ecc_mode.value,
        extra_metadata={"provenance": metadata},
    )

    return ProvenanceResponse(
        image_id=out["image_id"],
        image_url=out["image_url"],
        encoded_metadata=metadata,
        payload_bits=out["payload_bits"],
        encoded_bits=out["encoded_bits"],
        runtime_s=out["runtime_s"],
    )


@app.post("/decode-provenance", response_model=DecodeProvenanceResponse)
def decode_provenance(req: DecodeProvenanceRequest) -> DecodeProvenanceResponse:
    record = load_record(paths["records"], req.image_id)
    dec = service.decode(
        record,
        prompt_override=req.prompt,
        negative_prompt_override=req.negative_prompt,
        num_steps_override=req.num_steps,
        guidance_scale_override=req.guidance_scale,
    )

    recovered = dec["metrics"]["recovered_message"]
    parsed: Dict[str, Any] = {}
    parse_ok = False
    try:
        parsed = json.loads(recovered)
        parse_ok = True
    except Exception:
        parsed = {"raw_text": recovered}

    return DecodeProvenanceResponse(
        image_id=dec["image_id"],
        image_url=dec["image_url"],
        recovered_metadata=parsed,
        parse_ok=parse_ok,
        metrics=dec["metrics"],
        runtime_s=float(dec["runtime_s"]),
    )
