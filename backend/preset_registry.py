from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class DemoPreset:
    id: str
    section: str
    title: str
    description: str
    asset_dir: str
    num_steps: int = 30
    guidance_scale: float = 7.5
    negative_prompt: Optional[str] = None
    prompt: Optional[str] = None
    hidden_message: Optional[str] = None
    seed: Optional[int] = None
    ecc_mode: str = "none"
    prompt_a: Optional[str] = None
    prompt_b: Optional[str] = None
    seed_a: Optional[int] = None
    seed_b: Optional[int] = None
    attack_type: Optional[str] = None
    attack_strength: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


DEMO_PRESETS: Dict[str, List[DemoPreset]] = {
    "encode_decode": [
        DemoPreset(
            id="ed_base_astronaut_none",
            section="encode_decode",
            title="Astronaut Base (ECC none)",
            description="Base encode/decode preset with no ECC redundancy.",
            asset_dir="encode_decode/ed_base_astronaut_none",
            prompt="a photo of an astronaut riding a horse, high quality",
            hidden_message="MDDM demo: hidden message",
            seed=1234,
            ecc_mode="none",
        ),
        DemoPreset(
            id="ed_base_astronaut_rep3",
            section="encode_decode",
            title="Astronaut Base (ECC rep3)",
            description="Same base prompt with repetition ECC for robustness.",
            asset_dir="encode_decode/ed_base_astronaut_rep3",
            prompt="a portrait of a man standing in a colorful flower garden",
            hidden_message="MDDM demo: hidden message (rep3)",
            seed=1235,
            ecc_mode="rep3",
        ),
        DemoPreset(
            id="ed_base_astronaut_hamming",
            section="encode_decode",
            title="Astronaut Base (ECC hamming74)",
            description="Same base prompt with Hamming(7,4) ECC.",
            asset_dir="encode_decode/ed_base_astronaut_hamming",
            prompt="a cinematic portrait of a person wearing sunglasses",
            hidden_message="MDDM demo: hidden message (hamming74)",
            seed=1236,
            ecc_mode="hamming74",
        ),
    ],
    "diversity": [
        DemoPreset(
            id="div_astronaut_photo_vs_watercolor",
            section="diversity",
            title="Astronaut Photo vs Watercolor",
            description="Same payload in two visually different prompt styles.",
            asset_dir="diversity/div_astronaut_photo_vs_watercolor",
            hidden_message="MDDM demo: hidden message",
            prompt_a="a photo of an astronaut riding a horse, high quality",
            prompt_b="a watercolor painting of an astronaut riding a horse at sunset",
            seed_a=101,
            seed_b=202,
            ecc_mode="none",
        ),
        DemoPreset(
            id="div_horse_cinematic_pair",
            section="diversity",
            title="Horse Cinematic Pair",
            description="Same payload across two cinematic horse prompts.",
            asset_dir="diversity/div_horse_cinematic_pair",
            hidden_message="MDDM demo: hidden message",
            prompt_a="a cinematic photograph of a horse in the clouds",
            prompt_b="black-and-white horse silhouette in dramatic clouds",
            seed_a=303,
            seed_b=404,
            ecc_mode="none",
        ),
    ],
    "tamper": [
        DemoPreset(
            id="tamper_jpeg_q60",
            section="tamper",
            title="JPEG q60",
            description="Compression attack at quality ~60.",
            asset_dir="tamper/tamper_jpeg_q60",
            prompt="a photo of an astronaut riding a horse, high quality",
            hidden_message="MDDM demo: hidden message",
            seed=2101,
            ecc_mode="none",
            attack_type="jpeg",
            attack_strength=0.78,
        ),
        DemoPreset(
            id="tamper_rotation_3deg",
            section="tamper",
            title="Rotation 3 deg",
            description="Geometric misalignment stress case.",
            asset_dir="tamper/tamper_rotation_3deg",
            prompt="a portrait of a man standing in a colorful flower garden",
            hidden_message="MDDM demo: tamper rotation case",
            seed=2102,
            ecc_mode="none",
            attack_type="rotation",
            attack_strength=3.0,
        ),
        DemoPreset(
            id="tamper_occlusion_10",
            section="tamper",
            title="Occlusion 10%",
            description="Central occlusion stress case.",
            asset_dir="tamper/tamper_occlusion_10",
            prompt="a cinematic portrait of a person wearing sunglasses",
            hidden_message="MDDM demo: tamper occlusion case",
            seed=2103,
            ecc_mode="none",
            attack_type="occlusion",
            attack_strength=0.1,
        ),
        DemoPreset(
            id="tamper_brightness_1_2",
            section="tamper",
            title="Brightness 1.2",
            description="Brightness shift stress case.",
            asset_dir="tamper/tamper_brightness_1_2",
            prompt="a cinematic photograph of a horse in fog",
            hidden_message="MDDM demo: tamper brightness case",
            seed=2104,
            ecc_mode="none",
            attack_type="brightness",
            attack_strength=1.2,
        ),
        DemoPreset(
            id="tamper_contrast_1_25",
            section="tamper",
            title="Contrast 1.25",
            description="Contrast scaling stress case.",
            asset_dir="tamper/tamper_contrast_1_25",
            prompt="black-and-white horse silhouette in dramatic clouds",
            hidden_message="MDDM demo: tamper contrast case",
            seed=2105,
            ecc_mode="none",
            attack_type="contrast",
            attack_strength=1.25,
        ),
    ],
    "provenance": [
        DemoPreset(
            id="prov_ie663_project",
            section="provenance",
            title="IE663 Project Provenance",
            description="Course-project provenance payload.",
            asset_dir="provenance/prov_ie663_project",
            prompt="a cinematic photograph of a horse in fog",
            seed=3001,
            ecc_mode="none",
            metadata={
                "experiment_id": "IE663-MT-01",
                "team_name": "Akshat Kumar",
                "date": "2026-03-10",
                "model_name": "runwayml/stable-diffusion-v1-5",
                "notes": "IE 663 Course Project provenance demo",
            },
        ),
        DemoPreset(
            id="prov_team_mddm",
            section="provenance",
            title="Team MDDM Provenance",
            description="Alternate provenance payload with team metadata.",
            asset_dir="provenance/prov_team_mddm",
            prompt="a dramatic portrait of a person in a flower garden",
            seed=3002,
            ecc_mode="rep3",
            metadata={
                "experiment_id": "IE663-MT-02",
                "team_name": "Team MDDM",
                "date": "2026-03-10",
                "model_name": "runwayml/stable-diffusion-v1-5",
                "notes": "robustness suite provenance",
            },
        ),
    ],
}


def sections() -> List[str]:
    return list(DEMO_PRESETS.keys())


def list_presets(section: str) -> List[DemoPreset]:
    if section not in DEMO_PRESETS:
        raise KeyError(f"Unknown demo section: {section}")
    return DEMO_PRESETS[section]


def get_preset(section: str, preset_id: str) -> DemoPreset:
    for item in list_presets(section):
        if item.id == preset_id:
            return item
    raise KeyError(f"Unknown preset_id='{preset_id}' for section='{section}'")


def all_presets() -> List[DemoPreset]:
    out: List[DemoPreset] = []
    for sec in sections():
        out.extend(list_presets(sec))
    return out
