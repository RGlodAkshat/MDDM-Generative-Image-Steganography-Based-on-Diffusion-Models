from __future__ import annotations

from io import BytesIO

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter


def apply_attack(image: Image.Image, attack_type: str, attack_strength: float = 1.0) -> Image.Image:
    img = image.convert("RGB")

    if attack_type == "jpeg":
        # strength in [0,1], mapped to quality [50,95]
        q = int(95 - max(0.0, min(1.0, attack_strength)) * 45)
        buf = BytesIO()
        img.save(buf, format="JPEG", quality=q)
        buf.seek(0)
        return Image.open(buf).convert("RGB")

    if attack_type == "resize":
        scale = max(0.3, min(1.0, attack_strength))
        w, h = img.size
        w2, h2 = max(16, int(w * scale)), max(16, int(h * scale))
        return img.resize((w2, h2), Image.BICUBIC).resize((w, h), Image.BICUBIC)

    if attack_type == "blur":
        radius = max(0.1, attack_strength)
        return img.filter(ImageFilter.GaussianBlur(radius=radius))

    if attack_type == "brightness":
        factor = max(0.2, attack_strength)
        return ImageEnhance.Brightness(img).enhance(factor)

    if attack_type == "contrast":
        factor = max(0.2, attack_strength)
        return ImageEnhance.Contrast(img).enhance(factor)

    if attack_type == "rotation":
        angle = max(-15.0, min(15.0, attack_strength))
        return img.rotate(angle, resample=Image.BICUBIC)

    if attack_type == "crop":
        crop_frac = max(0.5, min(1.0, attack_strength))
        w, h = img.size
        cw, ch = int(w * crop_frac), int(h * crop_frac)
        left = (w - cw) // 2
        top = (h - ch) // 2
        cropped = img.crop((left, top, left + cw, top + ch))
        return cropped.resize((w, h), Image.BICUBIC)

    if attack_type == "occlusion":
        frac = max(0.02, min(0.3, attack_strength))
        arr = np.array(img).copy()
        h, w = arr.shape[:2]
        occ_h = max(4, int(h * frac))
        occ_w = max(4, int(w * frac))
        y0 = h // 2 - occ_h // 2
        x0 = w // 2 - occ_w // 2
        arr[y0:y0 + occ_h, x0:x0 + occ_w, :] = 0
        return Image.fromarray(arr)

    raise ValueError(f"Unsupported attack type: {attack_type}")
