from __future__ import annotations

from typing import Dict, Iterable, List, Tuple


def to_bit_list(bits: Iterable[int]) -> List[int]:
    return [int(b) & 1 for b in bits]


def text_to_bits(text: str) -> List[int]:
    data = text.encode("utf-8")
    out: List[int] = []
    for b in data:
        out.extend([(b >> i) & 1 for i in range(7, -1, -1)])
    return out


def bits_to_text(bits: Iterable[int]) -> str:
    data = to_bit_list(bits)
    usable = len(data) - (len(data) % 8)
    data = data[:usable]
    out = []
    for i in range(0, len(data), 8):
        val = 0
        for j in range(8):
            val = (val << 1) | int(data[i + j])
        out.append(val)
    try:
        return bytes(out).decode("utf-8", errors="ignore")
    except Exception:
        return ""


def bit_metrics(ref_bits: Iterable[int], pred_bits: Iterable[int]) -> Dict[str, float | int | bool]:
    ref = to_bit_list(ref_bits)
    pred = to_bit_list(pred_bits)
    n = min(len(ref), len(pred))
    if n == 0:
        return {
            "bit_accuracy": 0.0,
            "ber": 1.0,
            "bit_errors": 0,
            "exact_match": False,
            "n_compared": 0,
        }

    err = sum(int(ref[i] != pred[i]) for i in range(n))
    return {
        "bit_accuracy": 1.0 - (err / n),
        "ber": err / n,
        "bit_errors": err,
        "exact_match": bool(err == 0 and len(ref) == len(pred)),
        "n_compared": n,
    }


def ecc_encode_repetition(bits: Iterable[int], rep: int = 3) -> Tuple[List[int], Dict[str, int | str]]:
    base = to_bit_list(bits)
    out: List[int] = []
    for b in base:
        out.extend([b] * rep)
    return out, {"scheme": f"rep{rep}", "rep": rep, "input_len": len(base), "encoded_len": len(out)}


def ecc_decode_repetition(bits: Iterable[int], rep: int = 3, original_len: int | None = None) -> Tuple[List[int], Dict[str, int | str]]:
    arr = to_bit_list(bits)
    usable = (len(arr) // rep) * rep
    arr = arr[:usable]
    decoded: List[int] = []
    corrected = 0
    for i in range(0, usable, rep):
        group = arr[i:i + rep]
        ones = sum(group)
        maj = 1 if ones > (rep // 2) else 0
        corrected += int(any(x != maj for x in group))
        decoded.append(maj)
    if original_len is not None:
        decoded = decoded[:original_len]
    return decoded, {"scheme": f"rep{rep}", "corrected_groups": corrected, "usable_bits": usable}


def ecc_encode(bits: Iterable[int], mode: str = "none") -> Tuple[List[int], Dict[str, int | str]]:
    if mode == "none":
        base = to_bit_list(bits)
        return base, {"scheme": "none", "input_len": len(base), "encoded_len": len(base)}
    if mode == "rep3":
        return ecc_encode_repetition(bits, rep=3)
    raise ValueError(f"Unsupported ECC mode: {mode}")


def ecc_decode(bits: Iterable[int], mode: str = "none", original_len: int | None = None) -> Tuple[List[int], Dict[str, int | str]]:
    if mode == "none":
        base = to_bit_list(bits)
        if original_len is not None:
            base = base[:original_len]
        return base, {"scheme": "none", "usable_bits": len(base)}
    if mode == "rep3":
        return ecc_decode_repetition(bits, rep=3, original_len=original_len)
    raise ValueError(f"Unsupported ECC mode: {mode}")
