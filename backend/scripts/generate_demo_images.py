from __future__ import annotations

import argparse
import sys
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.preset_registry import sections  # noqa: E402
from backend.scripts.generate_demo_assets import generate_assets, _select_presets  # noqa: E402


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Generate prompt-correct demo images per preset. "
            "This script runs the real MDDM generation pipeline and updates preset assets."
        )
    )
    parser.add_argument("--section", action="append", choices=sections(), help="Only generate image assets for this section.")
    parser.add_argument("--preset-id", action="append", help="Only generate assets for specific preset ID(s).")
    parser.add_argument("--overwrite", action="store_true", help="Regenerate even if files already exist.")
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    presets = _select_presets(args.section or [], args.preset_id or [])
    if not presets:
        raise SystemExit("No presets selected. Check --section / --preset-id filters.")
    print(f"Generating prompt-specific assets for {len(presets)} preset(s)...")
    generate_assets(selected_presets=presets, overwrite=bool(args.overwrite))
    print("Demo image generation completed.")


if __name__ == "__main__":
    main()
