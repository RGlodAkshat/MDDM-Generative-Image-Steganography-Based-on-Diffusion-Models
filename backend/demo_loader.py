from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional

from .preset_registry import DemoPreset, get_preset, list_presets, sections


class DemoAssetError(Exception):
    pass


class DemoSectionError(DemoAssetError):
    pass


class DemoPresetError(DemoAssetError):
    pass


class DemoFileError(DemoAssetError):
    pass


class DemoLoader:
    def __init__(self, base_dir: Path) -> None:
        self.base_dir = base_dir

    def _resolve_preset(self, section: str, preset_id: str) -> DemoPreset:
        try:
            return get_preset(section, preset_id)
        except KeyError as exc:
            raise DemoPresetError(str(exc)) from exc

    def _results_path(self, section: str, preset_id: str) -> Path:
        preset = self._resolve_preset(section, preset_id)
        return self.base_dir / preset.asset_dir / "results.json"

    def _validate_image_url(self, preset: DemoPreset, image_url: str, field_name: str) -> None:
        expected_prefix = f"/demo_assets/{preset.asset_dir}/"
        if not image_url.startswith(expected_prefix):
            raise DemoFileError(
                f"Preset '{preset.id}' has mismatched {field_name}. "
                f"Expected URL prefix '{expected_prefix}', got '{image_url}'"
            )
        local_path = self.base_dir / image_url.removeprefix("/demo_assets/")
        if not local_path.exists():
            raise DemoFileError(f"Preset '{preset.id}' references missing file: {local_path}")

    def _validate_payload(self, preset: DemoPreset, payload: Dict[str, Any]) -> None:
        if payload.get("preset_id") != preset.id:
            raise DemoFileError(
                f"Preset '{preset.id}' has invalid preset_id in results.json: {payload.get('preset_id')}"
            )

        section = preset.section
        if section == "encode_decode":
            gen = payload.get("generate_response", {})
            dec = payload.get("decode_response", {})
            if not isinstance(gen, dict) or not isinstance(dec, dict):
                raise DemoFileError(f"Preset '{preset.id}' must include generate_response and decode_response")
            self._validate_image_url(preset, str(gen.get("image_url", "")), "generate_response.image_url")
            self._validate_image_url(preset, str(dec.get("image_url", "")), "decode_response.image_url")
            return

        if section == "diversity":
            comp = payload.get("compare_response", {})
            items = comp.get("items", []) if isinstance(comp, dict) else []
            if not isinstance(items, list) or len(items) != 2:
                raise DemoFileError(f"Preset '{preset.id}' must include two compare_response.items")
            for idx, item in enumerate(items):
                if not isinstance(item, dict):
                    raise DemoFileError(f"Preset '{preset.id}' compare_response.items[{idx}] must be an object")
                self._validate_image_url(preset, str(item.get("image_url", "")), f"compare_response.items[{idx}].image_url")
            return

        if section == "tamper":
            block = payload.get("attack_decode_response", {})
            if not isinstance(block, dict):
                raise DemoFileError(f"Preset '{preset.id}' must include attack_decode_response")
            self._validate_image_url(preset, str(block.get("source_image_url", "")), "attack_decode_response.source_image_url")
            self._validate_image_url(preset, str(block.get("attacked_image_url", "")), "attack_decode_response.attacked_image_url")
            return

        if section == "provenance":
            gen = payload.get("generate_response", {})
            dec = payload.get("decode_response", {})
            if not isinstance(gen, dict) or not isinstance(dec, dict):
                raise DemoFileError(f"Preset '{preset.id}' must include generate_response and decode_response")
            self._validate_image_url(preset, str(gen.get("image_url", "")), "generate_response.image_url")
            self._validate_image_url(preset, str(dec.get("image_url", "")), "decode_response.image_url")
            return

        raise DemoSectionError(f"Unknown section: {section}")

    @lru_cache(maxsize=256)
    def _load_json_cached(self, section: str, preset_id: str) -> Dict[str, Any]:
        preset = self._resolve_preset(section, preset_id)
        path = self._results_path(section, preset_id)
        if not path.exists():
            raise DemoFileError(f"Missing demo results file: {path}")
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            raise DemoFileError(f"Malformed JSON in demo preset '{preset_id}' ({section})") from exc
        self._validate_payload(preset, payload)
        return payload

    def load_results(self, section: str, preset_id: str) -> Dict[str, Any]:
        return self._load_json_cached(section, preset_id)

    def _preset_inputs(self, preset: DemoPreset) -> Dict[str, Any]:
        base: Dict[str, Any] = {
            "preset_id": preset.id,
            "prompt": preset.prompt,
            "hidden_message": preset.hidden_message,
            "seed": preset.seed,
            "ecc_mode": preset.ecc_mode,
            "prompt_a": preset.prompt_a,
            "prompt_b": preset.prompt_b,
            "seed_a": preset.seed_a,
            "seed_b": preset.seed_b,
            "attack_type": preset.attack_type,
            "attack_strength": preset.attack_strength,
            "metadata": preset.metadata,
            "num_steps": preset.num_steps,
            "guidance_scale": preset.guidance_scale,
        }
        return {k: v for k, v in base.items() if v is not None}

    def list_presets(self, section: Optional[str] = None) -> Dict[str, List[Dict[str, Any]]] | List[Dict[str, Any]]:
        def _item(preset: DemoPreset) -> Dict[str, Any]:
            return {
                "id": preset.id,
                "section": preset.section,
                "title": preset.title,
                "subtitle": preset.id,
                "description": preset.description,
                "asset_dir": preset.asset_dir,
                "inputs": self._preset_inputs(preset),
            }

        if section:
            try:
                presets = list_presets(section)
            except KeyError as exc:
                raise DemoSectionError(str(exc)) from exc
            return [_item(p) for p in presets]

        out: Dict[str, List[Dict[str, Any]]] = {}
        for sec in sections():
            out[sec] = self.list_presets(sec)  # type: ignore[assignment]
        return out

    def _load_block(self, section: str, preset_id: str, key: str) -> Dict[str, Any]:
        payload = self.load_results(section, preset_id)
        block = payload.get(key)
        if not isinstance(block, dict):
            raise DemoFileError(f"Preset '{preset_id}' in section '{section}' is missing '{key}'")
        return block

    def load_encode_generate(self, preset_id: str) -> Dict[str, Any]:
        return self._load_block("encode_decode", preset_id, "generate_response")

    def load_encode_decode(self, preset_id: str) -> Dict[str, Any]:
        return self._load_block("encode_decode", preset_id, "decode_response")

    def load_diversity_compare(self, preset_id: str) -> Dict[str, Any]:
        return self._load_block("diversity", preset_id, "compare_response")

    def load_tamper_attack_decode(self, preset_id: str) -> Dict[str, Any]:
        return self._load_block("tamper", preset_id, "attack_decode_response")

    def load_tamper_attack(self, preset_id: str) -> Dict[str, Any]:
        payload = self.load_tamper_attack_decode(preset_id)
        return {
            "source_image_id": payload["source_image_id"],
            "source_image_url": payload["source_image_url"],
            "attacked_image_id": payload["attacked_image_id"],
            "attacked_image_url": payload["attacked_image_url"],
            "attack_type": payload["attack_type"],
            "attack_strength": payload["attack_strength"],
        }

    def load_provenance_generate(self, preset_id: str) -> Dict[str, Any]:
        return self._load_block("provenance", preset_id, "generate_response")

    def load_provenance_decode(self, preset_id: str) -> Dict[str, Any]:
        return self._load_block("provenance", preset_id, "decode_response")
