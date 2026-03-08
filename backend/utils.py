from __future__ import annotations

import json
import uuid
from pathlib import Path
from typing import Any, Dict


def ensure_dirs(base_dir: Path) -> Dict[str, Path]:
    images = base_dir / "images"
    records = base_dir / "records"
    images.mkdir(parents=True, exist_ok=True)
    records.mkdir(parents=True, exist_ok=True)
    return {"images": images, "records": records}


def new_id(prefix: str = "img") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def save_record(record_dir: Path, image_id: str, payload: Dict[str, Any]) -> None:
    path = record_dir / f"{image_id}.json"
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def load_record(record_dir: Path, image_id: str) -> Dict[str, Any]:
    path = record_dir / f"{image_id}.json"
    if not path.exists():
        raise FileNotFoundError(f"No record for image_id={image_id}")
    return json.loads(path.read_text(encoding="utf-8"))
