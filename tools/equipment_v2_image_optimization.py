"""Visually guarded, size-efficient WebP export for Veldryn EQ2 item art.

Important: lossless WebP is always considered; visually passing lossy WebP
competes only if it materially reduces bytes. No quality slider is allowed
to silently degrade item silhouettes to meet a size target.

Run by tools/pack-equipment-v2-atlas.py and synthetic CI tests.
"""
from __future__ import annotations

from hashlib import sha256
from io import BytesIO
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops, ImageStat

# Quality candidates run from smallest likely filesize toward most faithful.
QUALITIES = (80, 84, 88, 92, 96)
VISUAL_WIDTH = 40
MAX_NATIVE_RGB_MAE = 3.5
MAX_40PX_RGB_MAE = 2.0
# Prefer lossless when lossy is within five percent in size.
LOSSLESS_PREFERENCE_FACTOR = 0.95
KINDS = {
    "atlas": {"soft_target_kib": 250, "hard_limit_kib": 500},
    "icon": {"soft_target_kib": 32, "hard_limit_kib": 70},
}
BACKGROUNDS = ((21, 28, 38), (242, 239, 229))


def normalized_rgba(original: Image.Image) -> Image.Image:
    """Ensure a stable, fully transparent matte for efficient compression."""
    image = original.convert("RGBA").copy()
    pixels = bytearray(image.tobytes())
    for offset in range(0, len(pixels), 4):
        if pixels[offset + 3] == 0:
            pixels[offset : offset + 3] = b"\x00\x00\x00"
    return Image.frombytes("RGBA", image.size, bytes(pixels))


def _save_webp(image: Image.Image, *, quality: int | None) -> bytes:
    stream = BytesIO()
    if quality is None:
        image.save(stream, format="WEBP", lossless=True, method=6)
    else:
        image.save(stream, format="WEBP", lossless=False, quality=quality, method=6)
    return stream.getvalue()


def _mae_visible(a: Image.Image, b: Image.Image, *, mask: Image.Image) -> float:
    """Masked RGB MAE (in C via Pillow) over visible item pixels only."""
    if a.size != b.size or mask.size != a.size:
        raise ValueError("comparison_size_mismatch")
    coverage = mask.point(lambda value: 255 if value > 8 else 0)
    if coverage.getbbox() is None:
        return 0.0
    diff = ImageChops.difference(a.convert("RGB"), b.convert("RGB"))
    stats = ImageStat.Stat(diff, mask=coverage)
    return sum(stats.mean) / 3

def _composite(image: Image.Image, background: tuple[int, int, int]) -> Image.Image:
    canvas = Image.new("RGBA", image.size, (*background, 255))
    canvas.alpha_composite(image)
    return canvas.convert("RGB")


def fidelity(reference: Image.Image, webp: bytes) -> dict[str, Any]:
    with Image.open(BytesIO(webp)) as raw:
        encoded = raw.convert("RGBA")
    if encoded.size != reference.size:
        return {"passed": False, "error": "dimensions_changed"}
    if encoded.getchannel("A").tobytes() != reference.getchannel("A").tobytes():
        return {"passed": False, "error": "alpha_changed"}

    # For atlases evaluate EVERY individual 192px cell at 40px. Resizing
    # the entire 960px atlas to 40px would obscure edge/detail damage.
    if reference.size == (960, 384):
        rectangles = [
            ((index % 5) * 192, (index // 5) * 192,
             ((index % 5) + 1) * 192, ((index // 5) + 1) * 192)
            for index in range(10)
        ]
    else:
        rectangles = [(0, 0, reference.width, reference.height)]

    native_error = 0.0
    small_error = 0.0
    for rectangle in rectangles:
        original_cell = reference.crop(rectangle)
        encoded_cell = encoded.crop(rectangle)
        alpha = original_cell.getchannel("A")
        scaled_alpha = alpha.resize((VISUAL_WIDTH, VISUAL_WIDTH), Image.Resampling.BOX)
        for background in BACKGROUNDS:
            a = _composite(original_cell, background)
            b = _composite(encoded_cell, background)
            native_error = max(native_error, _mae_visible(a, b, mask=alpha))
            a_small = a.resize((VISUAL_WIDTH, VISUAL_WIDTH), Image.Resampling.BOX)
            b_small = b.resize((VISUAL_WIDTH, VISUAL_WIDTH), Image.Resampling.BOX)
            small_error = max(small_error, _mae_visible(a_small, b_small, mask=scaled_alpha))
    return {
        "passed": native_error <= MAX_NATIVE_RGB_MAE and small_error <= MAX_40PX_RGB_MAE,
        "native_mae": round(native_error, 4),
        "40px_mae": round(small_error, 4),
        "alpha_exact": True,
    }

def _png_size(image: Image.Image) -> int:
    stream = BytesIO()
    image.save(stream, format="PNG", optimize=True)
    return len(stream.getvalue())


def encode_best(image: Image.Image, *, kind: str, min_quality: int = 80) -> tuple[bytes, dict[str, Any]]:
    if kind not in KINDS:
        raise ValueError("kind_must_be_atlas_or_icon")
    if not 1 <= min_quality <= 100:
        raise ValueError("min_quality_out_of_range")
    normalized = normalized_rgba(image)
    expected = (960, 384) if kind == "atlas" else (192, 192)
    if normalized.size != expected:
        raise ValueError(f"unexpected_canvas:{normalized.size};expected:{expected}")
    candidates = []
    # Always compute a visually exact fallback. Pillow/libwebp preserves
    # decoded RGBA of the source after normalization for lossless output.
    lossless = _save_webp(normalized, quality=None)
    lossless_fidelity = fidelity(normalized, lossless)
    if not lossless_fidelity["passed"]:
        raise ValueError(f"lossless_webp_roundtrip_failed:{lossless_fidelity}")
    candidates.append({"data": lossless, "codec": "lossless", "quality": None, "fidelity": lossless_fidelity})
    for quality in QUALITIES:
        if quality < min_quality:
            continue
        encoded = _save_webp(normalized, quality=quality)
        metrics = fidelity(normalized, encoded)
        if metrics["passed"]:
            candidates.append({"data": encoded, "codec": "lossy", "quality": quality, "fidelity": metrics})

    exact = candidates[0]
    best = min(candidates, key=lambda row: len(row["data"]))
    if best["codec"] != "lossless" and len(best["data"]) >= len(exact["data"]) * LOSSLESS_PREFERENCE_FACTOR:
        best = exact

    raw_bytes = _png_size(normalized)
    output_bytes = len(best["data"])
    hard_limit = KINDS[kind]["hard_limit_kib"] * 1024
    if output_bytes > hard_limit:
        raise ValueError(
            f"cannot_meet_hard_size_budget_without_quality_damage:{output_bytes}B>{hard_limit}B;"
            "simplify_asset_source_or_request_art_review"
        )

    report = {
        "kind": kind,
        "dimensions": list(normalized.size),
        "source_rgba_sha256": sha256(normalized.tobytes()).hexdigest(),
        "source_png_equivalent_bytes": raw_bytes,
        "output_bytes": output_bytes,
        "png_equivalent_savings_pct": round((1 - output_bytes / raw_bytes) * 100, 2) if raw_bytes else 0,
        "codec": best["codec"],
        "quality": best["quality"],
        "fidelity": best["fidelity"],
        "candidates_passed": len(candidates),
        "target_kib": KINDS[kind]["soft_target_kib"],
        "above_target": output_bytes > KINDS[kind]["soft_target_kib"] * 1024,
        "visual_human_review_required": True,
    }
    return best["data"], report


def write_optimized(image: Image.Image, output: Path, *, kind: str, min_quality: int = 80) -> dict[str, Any]:
    encoded, report = encode_best(image, kind=kind, min_quality=min_quality)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(encoded)
    return report
