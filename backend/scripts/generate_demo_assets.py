from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List

from PIL import Image


ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.attacks import apply_attack  # noqa: E402
from backend.pipeline import MDDMService  # noqa: E402
from backend.preset_registry import DemoPreset, all_presets, sections  # noqa: E402
from backend.utils import ensure_dirs, load_record  # noqa: E402


def _write_json(path: Path, payload: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _copy_image(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    Image.open(src).convert("RGB").save(dst)


def _demo_image_url(preset: DemoPreset, name: str) -> str:
    return f"/demo_assets/{preset.asset_dir}/{name}"


def _select_presets(section_filters: List[str], preset_filters: List[str]) -> List[DemoPreset]:
    presets = all_presets()
    if section_filters:
        allowed_sections = set(section_filters)
        presets = [p for p in presets if p.section in allowed_sections]
    if preset_filters:
        allowed_ids = set(preset_filters)
        presets = [p for p in presets if p.id in allowed_ids]
    return presets


def _log_generation_debug(
    *,
    preset: DemoPreset,
    out: Dict[str, Any],
    record: Dict[str, Any],
    asset_dir: Path,
    prompt: str,
    seed: Optional[int],
) -> None:
    print(f"Preset: {preset.id}")
    print(f"Prompt: {prompt}")
    print(f"Seed: {seed}")
    print(f"Generated image_id: {out.get('image_id')}")
    print(f"Record image path: {record.get('image_path')}")
    print(f"Target folder: {asset_dir}")


def _encode_decode_preset(service: MDDMService, preset: DemoPreset, record_dir: Path, asset_dir: Path) -> None:
    out = service.generate(
        prompt=preset.prompt or "",
        hidden_message=preset.hidden_message or "",
        seed=preset.seed,
        num_steps=preset.num_steps,
        guidance_scale=preset.guidance_scale,
        negative_prompt=preset.negative_prompt,
        ecc_mode=preset.ecc_mode,
    )
    record = load_record(record_dir, out["image_id"])
    _log_generation_debug(
        preset=preset,
        out=out,
        record=record,
        asset_dir=asset_dir,
        prompt=preset.prompt or "",
        seed=int(out["seed"]),
    )
    dec = service.decode(record)

    image_name = "image.png"
    _copy_image(Path(record["image_path"]), asset_dir / image_name)

    image_id = f"demo_{preset.id}"
    image_url = _demo_image_url(preset, image_name)

    payload = {
        "preset_id": preset.id,
        "section": preset.section,
        "title": preset.title,
        "description": preset.description,
        "inputs": {
            "prompt": preset.prompt,
            "hidden_message": preset.hidden_message,
            "seed": int(out["seed"]),
            "ecc_mode": preset.ecc_mode,
            "num_steps": preset.num_steps,
            "guidance_scale": preset.guidance_scale,
        },
        "generate_response": {
            **out,
            "image_id": image_id,
            "image_url": image_url,
        },
        "decode_response": {
            **dec,
            "image_id": image_id,
            "image_url": image_url,
        },
    }
    _write_json(asset_dir / "results.json", payload)


def _diversity_preset(service: MDDMService, preset: DemoPreset, record_dir: Path, asset_dir: Path) -> None:
    msg = preset.hidden_message or ""
    out_a = service.generate(
        prompt=preset.prompt_a or "",
        hidden_message=msg,
        seed=preset.seed_a,
        num_steps=preset.num_steps,
        guidance_scale=preset.guidance_scale,
        negative_prompt=preset.negative_prompt,
        ecc_mode=preset.ecc_mode,
    )
    out_b = service.generate(
        prompt=preset.prompt_b or "",
        hidden_message=msg,
        seed=preset.seed_b,
        num_steps=preset.num_steps,
        guidance_scale=preset.guidance_scale,
        negative_prompt=preset.negative_prompt,
        ecc_mode=preset.ecc_mode,
    )

    rec_a = load_record(record_dir, out_a["image_id"])
    rec_b = load_record(record_dir, out_b["image_id"])
    _log_generation_debug(
        preset=preset,
        out=out_a,
        record=rec_a,
        asset_dir=asset_dir,
        prompt=preset.prompt_a or "",
        seed=int(out_a["seed"]),
    )
    _log_generation_debug(
        preset=preset,
        out=out_b,
        record=rec_b,
        asset_dir=asset_dir,
        prompt=preset.prompt_b or "",
        seed=int(out_b["seed"]),
    )
    dec_a = service.decode(rec_a)
    dec_b = service.decode(rec_b)

    image_a_name = "image_a.png"
    image_b_name = "image_b.png"
    _copy_image(Path(rec_a["image_path"]), asset_dir / image_a_name)
    _copy_image(Path(rec_b["image_path"]), asset_dir / image_b_name)

    item_a = {
        "image_id": f"demo_{preset.id}_a",
        "image_url": _demo_image_url(preset, image_a_name),
        "prompt": preset.prompt_a,
        "seed": int(out_a["seed"]),
        "metrics": dec_a["metrics"],
        "generate_runtime_s": float(out_a["runtime_s"]),
        "decode_runtime_s": float(dec_a["runtime_s"]),
    }
    item_b = {
        "image_id": f"demo_{preset.id}_b",
        "image_url": _demo_image_url(preset, image_b_name),
        "prompt": preset.prompt_b,
        "seed": int(out_b["seed"]),
        "metrics": dec_b["metrics"],
        "generate_runtime_s": float(out_b["runtime_s"]),
        "decode_runtime_s": float(dec_b["runtime_s"]),
    }

    payload = {
        "preset_id": preset.id,
        "section": preset.section,
        "title": preset.title,
        "description": preset.description,
        "inputs": {
            "hidden_message": preset.hidden_message,
            "prompt_a": preset.prompt_a,
            "prompt_b": preset.prompt_b,
            "seed_a": int(out_a["seed"]),
            "seed_b": int(out_b["seed"]),
            "ecc_mode": preset.ecc_mode,
            "num_steps": preset.num_steps,
            "guidance_scale": preset.guidance_scale,
        },
        "compare_response": {
            "items": [item_a, item_b],
            "runtime_s": float(out_a["runtime_s"]) + float(out_b["runtime_s"]) + float(dec_a["runtime_s"]) + float(dec_b["runtime_s"]),
        },
    }
    _write_json(asset_dir / "results.json", payload)


def _tamper_preset(service: MDDMService, preset: DemoPreset, record_dir: Path, asset_dir: Path) -> None:
    out = service.generate(
        prompt=preset.prompt or "",
        hidden_message=preset.hidden_message or "",
        seed=preset.seed,
        num_steps=preset.num_steps,
        guidance_scale=preset.guidance_scale,
        negative_prompt=preset.negative_prompt,
        ecc_mode=preset.ecc_mode,
    )
    record = load_record(record_dir, out["image_id"])
    _log_generation_debug(
        preset=preset,
        out=out,
        record=record,
        asset_dir=asset_dir,
        prompt=preset.prompt or "",
        seed=int(out["seed"]),
    )

    src_img = Image.open(record["image_path"]).convert("RGB")
    attacked_img = apply_attack(src_img, preset.attack_type or "jpeg", float(preset.attack_strength or 1.0))

    original_name = "original.png"
    attacked_name = "attacked.png"
    src_img.save(asset_dir / original_name)
    attacked_img.save(asset_dir / attacked_name)

    dec_attacked = service.decode(record, image_override=attacked_img)

    payload = {
        "preset_id": preset.id,
        "section": preset.section,
        "title": preset.title,
        "description": preset.description,
        "inputs": {
            "prompt": preset.prompt,
            "hidden_message": preset.hidden_message,
            "seed": int(out["seed"]),
            "ecc_mode": preset.ecc_mode,
            "attack_type": preset.attack_type,
            "attack_strength": preset.attack_strength,
            "num_steps": preset.num_steps,
            "guidance_scale": preset.guidance_scale,
        },
        "attack_decode_response": {
            "source_image_id": f"demo_{preset.id}_source",
            "source_image_url": _demo_image_url(preset, original_name),
            "attacked_image_id": f"demo_{preset.id}_attacked",
            "attacked_image_url": _demo_image_url(preset, attacked_name),
            "attack_type": preset.attack_type,
            "attack_strength": preset.attack_strength,
            "metrics": dec_attacked["metrics"],
            "decode_runtime_s": float(dec_attacked["runtime_s"]),
            "runtime_s": float(out["runtime_s"]) + float(dec_attacked["runtime_s"]),
        },
    }
    _write_json(asset_dir / "results.json", payload)


def _provenance_preset(service: MDDMService, preset: DemoPreset, record_dir: Path, asset_dir: Path) -> None:
    metadata = dict(preset.metadata)
    hidden = json.dumps(metadata, ensure_ascii=False)

    out = service.generate(
        prompt=preset.prompt or "",
        hidden_message=hidden,
        seed=preset.seed,
        num_steps=preset.num_steps,
        guidance_scale=preset.guidance_scale,
        negative_prompt=preset.negative_prompt,
        ecc_mode=preset.ecc_mode,
        extra_metadata={"provenance": metadata},
    )
    record = load_record(record_dir, out["image_id"])
    _log_generation_debug(
        preset=preset,
        out=out,
        record=record,
        asset_dir=asset_dir,
        prompt=preset.prompt or "",
        seed=int(out["seed"]),
    )
    dec = service.decode(record)

    recovered_raw = dec["metrics"]["recovered_message"]
    parse_ok = False
    recovered_metadata: Dict[str, Any]
    try:
        recovered_metadata = json.loads(recovered_raw)
        parse_ok = True
    except Exception:
        recovered_metadata = {"raw_text": recovered_raw}

    image_name = "image.png"
    _copy_image(Path(record["image_path"]), asset_dir / image_name)

    image_id = f"demo_{preset.id}"
    image_url = _demo_image_url(preset, image_name)

    payload = {
        "preset_id": preset.id,
        "section": preset.section,
        "title": preset.title,
        "description": preset.description,
        "inputs": {
            "prompt": preset.prompt,
            **metadata,
            "seed": int(out["seed"]),
            "ecc_mode": preset.ecc_mode,
            "num_steps": preset.num_steps,
            "guidance_scale": preset.guidance_scale,
        },
        "generate_response": {
            "image_id": image_id,
            "image_url": image_url,
            "encoded_metadata": metadata,
            "payload_bits": out["payload_bits"],
            "encoded_bits": out["encoded_bits"],
            "runtime_s": float(out["runtime_s"]),
        },
        "decode_response": {
            "image_id": image_id,
            "image_url": image_url,
            "recovered_metadata": recovered_metadata,
            "parse_ok": parse_ok,
            "metrics": dec["metrics"],
            "runtime_s": float(dec["runtime_s"]),
        },
    }
    _write_json(asset_dir / "results.json", payload)


def generate_assets(selected_presets: List[DemoPreset], overwrite: bool) -> None:
    data_paths = ensure_dirs(ROOT_DIR / "backend" / "data")
    service = MDDMService(image_dir=data_paths["images"], record_dir=data_paths["records"])
    demo_base = ROOT_DIR / "backend" / "demo_assets"

    for preset in selected_presets:
        target_dir = demo_base / preset.asset_dir
        if target_dir.exists() and not overwrite:
            print(f"[skip] {preset.id}: target exists (use --overwrite to regenerate)")
            continue
        target_dir.mkdir(parents=True, exist_ok=True)

        print(f"[run ] {preset.id} ({preset.section})")
        if preset.section == "encode_decode":
            _encode_decode_preset(service, preset, data_paths["records"], target_dir)
        elif preset.section == "diversity":
            _diversity_preset(service, preset, data_paths["records"], target_dir)
        elif preset.section == "tamper":
            _tamper_preset(service, preset, data_paths["records"], target_dir)
        elif preset.section == "provenance":
            _provenance_preset(service, preset, data_paths["records"], target_dir)
        else:
            raise ValueError(f"Unsupported section: {preset.section}")
        print(f"[done] {preset.id}")


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate preset-specific demo assets for MDDM demo mode.")
    parser.add_argument("--section", action="append", choices=sections(), help="Only generate presets from this section.")
    parser.add_argument("--preset-id", action="append", help="Generate only the provided preset ID(s).")
    parser.add_argument(
        "--overwrite",
        dest="overwrite",
        action="store_true",
        help="Regenerate preset assets even if target folders already exist (default behavior).",
    )
    parser.add_argument(
        "--skip-existing",
        dest="overwrite",
        action="store_false",
        help="Skip generation for presets whose target folder already exists.",
    )
    parser.set_defaults(overwrite=True)
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    presets = _select_presets(args.section or [], args.preset_id or [])
    if not presets:
        raise SystemExit("No presets selected. Check --section / --preset-id filters.")
    print(f"Selected {len(presets)} preset(s)")
    generate_assets(selected_presets=presets, overwrite=bool(args.overwrite))
    print("Demo asset precompute completed.")


if __name__ == "__main__":
    main()
