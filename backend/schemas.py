from __future__ import annotations

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ECCMode(str, Enum):
    none = "none"
    rep3 = "rep3"


class AttackType(str, Enum):
    jpeg = "jpeg"
    resize = "resize"
    blur = "blur"
    brightness = "brightness"
    contrast = "contrast"
    rotation = "rotation"
    crop = "crop"
    occlusion = "occlusion"


class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    hidden_message: str = Field(..., min_length=1)
    seed: Optional[int] = None
    num_steps: int = 30
    guidance_scale: float = 7.5
    negative_prompt: Optional[str] = None
    ecc_mode: ECCMode = ECCMode.none


class MetricsPayload(BaseModel):
    recovered_message: str
    bit_accuracy: float
    ber: float
    exact_match: bool
    bit_errors: int
    payload_bits: int
    encoded_bits: int
    ecc_mode: ECCMode


class GenerateResponse(BaseModel):
    image_id: str
    image_url: str
    prompt: str
    seed: int
    payload_bits: int
    encoded_bits: int
    ecc_mode: ECCMode
    runtime_s: float


class DecodeRequest(BaseModel):
    image_id: str
    prompt: Optional[str] = None
    num_steps: Optional[int] = None
    guidance_scale: Optional[float] = None
    negative_prompt: Optional[str] = None


class DecodeResponse(BaseModel):
    image_id: str
    image_url: str
    metrics: MetricsPayload
    runtime_s: float


class CompareRequest(BaseModel):
    hidden_message: str = Field(..., min_length=1)
    prompt_a: str = Field(..., min_length=1)
    prompt_b: str = Field(..., min_length=1)
    seed_a: Optional[int] = None
    seed_b: Optional[int] = None
    num_steps: int = 30
    guidance_scale: float = 7.5
    negative_prompt: Optional[str] = None
    ecc_mode: ECCMode = ECCMode.none


class CompareItem(BaseModel):
    image_id: str
    image_url: str
    prompt: str
    seed: int
    metrics: MetricsPayload
    generate_runtime_s: float
    decode_runtime_s: float


class CompareResponse(BaseModel):
    items: List[CompareItem]
    runtime_s: float


class AttackRequest(BaseModel):
    image_id: str
    attack_type: AttackType
    attack_strength: float = 1.0


class AttackResponse(BaseModel):
    source_image_id: str
    source_image_url: str
    attacked_image_id: str
    attacked_image_url: str
    attack_type: AttackType
    attack_strength: float


class AttackDecodeRequest(BaseModel):
    image_id: str
    attack_type: AttackType
    attack_strength: float = 1.0
    prompt: Optional[str] = None
    num_steps: Optional[int] = None
    guidance_scale: Optional[float] = None
    negative_prompt: Optional[str] = None


class AttackDecodeResponse(BaseModel):
    source_image_id: str
    source_image_url: str
    attacked_image_id: str
    attacked_image_url: str
    attack_type: AttackType
    attack_strength: float
    metrics: MetricsPayload
    decode_runtime_s: float
    runtime_s: float


class ProvenanceRequest(BaseModel):
    prompt: str = Field(..., min_length=1)
    experiment_id: str = Field(..., min_length=1)
    team_name: str = Field(..., min_length=1)
    date: str = Field(..., min_length=1)
    model_name: str = "runwayml/stable-diffusion-v1-5"
    notes: Optional[str] = None
    seed: Optional[int] = None
    num_steps: int = 30
    guidance_scale: float = 7.5
    negative_prompt: Optional[str] = None
    ecc_mode: ECCMode = ECCMode.none


class ProvenanceResponse(BaseModel):
    image_id: str
    image_url: str
    encoded_metadata: Dict[str, Any]
    payload_bits: int
    encoded_bits: int
    runtime_s: float


class DecodeProvenanceRequest(BaseModel):
    image_id: str
    prompt: Optional[str] = None
    num_steps: Optional[int] = None
    guidance_scale: Optional[float] = None
    negative_prompt: Optional[str] = None


class DecodeProvenanceResponse(BaseModel):
    image_id: str
    image_url: str
    recovered_metadata: Dict[str, Any]
    parse_ok: bool
    metrics: MetricsPayload
    runtime_s: float


class HealthResponse(BaseModel):
    status: str
    device: str
    model_id: str
    model_loaded: bool
