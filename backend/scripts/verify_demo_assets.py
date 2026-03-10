from __future__ import annotations

import argparse
import hashlib
import sys
from pathlib import Path
from typing import Any, Dict, List


ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.demo_loader import DemoLoader  # noqa: E402
from backend.preset_registry import DemoPreset, all_presets, sections  # noqa: E402
from backend.schemas import (  # noqa: E402
    AttackDecodeResponse,
    CompareResponse,
    DecodeProvenanceResponse,
    DecodeResponse,
    GenerateResponse,
    ProvenanceResponse,
)


def _sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _rel_image_path(url: str) -> Path:
    return ROOT_DIR / "backend" / "demo_assets" / url.removeprefix("/demo_assets/")


def _select_presets(section_filters: List[str], preset_filters: List[str]) -> List[DemoPreset]:
    presets = all_presets()
    if section_filters:
        allowed_sections = set(section_filters)
        presets = [p for p in presets if p.section in allowed_sections]
    if preset_filters:
        allowed_ids = set(preset_filters)
        presets = [p for p in presets if p.id in allowed_ids]
    return presets


def verify_assets(selected_presets: List[DemoPreset], strict_content: bool) -> int:
    loader = DemoLoader(ROOT_DIR / "backend" / "demo_assets")
    errors: List[str] = []
    image_hash_owner: Dict[str, str] = {}

    for preset in selected_presets:
        try:
            payload = loader.load_results(preset.section, preset.id)
        except Exception as exc:
            errors.append(f"{preset.id}: failed to load preset -> {exc}")
            continue

        try:
            if preset.section == "encode_decode":
                gen = GenerateResponse(**payload["generate_response"])
                dec = DecodeResponse(**payload["decode_response"])
                gen_path = _rel_image_path(gen.image_url)
                dec_path = _rel_image_path(dec.image_url)
                if gen_path != dec_path:
                    errors.append(f"{preset.id}: generate/decode image path mismatch")
                image_hash = _sha256(gen_path)
                if strict_content and image_hash in image_hash_owner and image_hash_owner[image_hash] != preset.id:
                    errors.append(f"{preset.id}: image content reused from {image_hash_owner[image_hash]}")
                image_hash_owner.setdefault(image_hash, preset.id)

            elif preset.section == "diversity":
                comp = CompareResponse(**payload["compare_response"])
                if len(comp.items) != 2:
                    errors.append(f"{preset.id}: diversity requires exactly two items")
                    continue
                p0 = _rel_image_path(comp.items[0].image_url)
                p1 = _rel_image_path(comp.items[1].image_url)
                if p0 == p1:
                    errors.append(f"{preset.id}: image_a and image_b paths are identical")
                if _sha256(p0) == _sha256(p1):
                    errors.append(f"{preset.id}: image_a and image_b content are identical")

                for idx, item in enumerate(comp.items):
                    h = _sha256(_rel_image_path(item.image_url))
                    owner = f"{preset.id}:item{idx}"
                    if strict_content and h in image_hash_owner and image_hash_owner[h] != owner:
                        errors.append(f"{preset.id}: diversity image content reused from {image_hash_owner[h]}")
                    image_hash_owner.setdefault(h, owner)

            elif preset.section == "tamper":
                atk = AttackDecodeResponse(**payload["attack_decode_response"])
                src = _rel_image_path(atk.source_image_url)
                dst = _rel_image_path(atk.attacked_image_url)
                if src == dst:
                    errors.append(f"{preset.id}: original and attacked image paths are identical")
                if _sha256(src) == _sha256(dst):
                    errors.append(f"{preset.id}: original and attacked image content are identical")

                src_hash = _sha256(src)
                dst_hash = _sha256(dst)
                if strict_content and src_hash in image_hash_owner and image_hash_owner[src_hash] != f"{preset.id}:source":
                    errors.append(f"{preset.id}: source image reused from {image_hash_owner[src_hash]}")
                image_hash_owner.setdefault(src_hash, f"{preset.id}:source")
                if strict_content and dst_hash in image_hash_owner and image_hash_owner[dst_hash] != f"{preset.id}:attacked":
                    errors.append(f"{preset.id}: attacked image reused from {image_hash_owner[dst_hash]}")
                image_hash_owner.setdefault(dst_hash, f"{preset.id}:attacked")

            elif preset.section == "provenance":
                gen = ProvenanceResponse(**payload["generate_response"])
                dec = DecodeProvenanceResponse(**payload["decode_response"])
                gp = _rel_image_path(gen.image_url)
                dp = _rel_image_path(dec.image_url)
                if gp != dp:
                    errors.append(f"{preset.id}: generate/decode image path mismatch")
                image_hash = _sha256(gp)
                if strict_content and image_hash in image_hash_owner and image_hash_owner[image_hash] != preset.id:
                    errors.append(f"{preset.id}: provenance image content reused from {image_hash_owner[image_hash]}")
                image_hash_owner.setdefault(image_hash, preset.id)

            else:
                errors.append(f"{preset.id}: unknown section {preset.section}")

            print(f"[ok  ] {preset.id}")
        except Exception as exc:
            errors.append(f"{preset.id}: schema/content check failed -> {exc}")

    if errors:
        print("\nVerification failed:")
        for err in errors:
            print(f"- {err}")
        return 1

    print("\nVerification passed for all selected presets.")
    return 0


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Verify MDDM demo asset integrity.")
    parser.add_argument("--section", action="append", choices=sections(), help="Only verify presets from this section.")
    parser.add_argument("--preset-id", action="append", help="Only verify a specific preset ID.")
    parser.add_argument(
        "--allow-content-duplicates",
        action="store_true",
        help="Allow identical image content across different presets.",
    )
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    presets = _select_presets(args.section or [], args.preset_id or [])
    if not presets:
        raise SystemExit("No presets selected for verification.")

    code = verify_assets(selected_presets=presets, strict_content=not args.allow_content_duplicates)
    raise SystemExit(code)


if __name__ == "__main__":
    main()
