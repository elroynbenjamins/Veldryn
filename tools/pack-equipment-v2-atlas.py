#!/usr/bin/env python3
"""Aspect-preserving compositor for *approved* Equipment 2.0 source PNGs.

Requires Pillow. This does not generate art and does not certify artistic style.
Source pixels touching the canvas edge are rejected rather than silently clipped.

Examples:
  python tools/pack-equipment-v2-atlas.py atlas --folder art/approved --out /tmp/set.webp
  python tools/pack-equipment-v2-atlas.py icon --slot weapon --input art/weapon.png --out /tmp/weapon.webp

In atlas mode, --folder must contain helmet.png, chest.png, gloves.png, legs.png,
boots.png, weapon.png, offhand.png, cape.png, amulet.png and ring.png.
"""
from __future__ import annotations

import argparse
import json
from equipment_v2_image_optimization import write_optimized
from pathlib import Path
import sys

try:
    from PIL import Image
except ImportError as exc:
    raise SystemExit("Pillow is required: python -m pip install Pillow") from exc

CELL = 192
SAFE_INSET = 26
SLOTS = ("helmet", "chest", "gloves", "legs", "boots", "weapon", "offhand", "cape", "amulet", "ring")
# Stable *maximum object spans* in the canvas; these are conservative at 40px.
# They do not change by item tier, rarity, or reward source.
SLOT_MAX_SPAN = {
    "helmet": 126, "chest": 136, "gloves": 128, "legs": 130,
    "boots": 130, "weapon": 138, "offhand": 130, "cape": 136,
    "amulet": 94, "ring": 86,
}


def normalize(src: Path, slot: str) -> Image.Image:
    with Image.open(src) as original:
        if not (("A" in original.getbands()) or ("transparency" in original.info)):
            raise ValueError(f"{slot}:source_missing_alpha:{src}")
        rgba = original.convert("RGBA")
    alpha = rgba.getchannel("A")
    bbox = alpha.getbbox()
    if bbox is None:
        raise ValueError(f"{slot}:source_empty:{src}")
    l, t, r, b = bbox
    if l == 0 or t == 0 or r == rgba.width or b == rgba.height:
        raise ValueError(f"{slot}:source_touches_canvas_edge:{src};regenerate_uncropped")
    cropped = rgba.crop(bbox)
    max_size = SLOT_MAX_SPAN[slot]
    w, h = cropped.size
    factor = min(max_size / w, max_size / h)
    new_size = (max(1, round(w * factor)), max(1, round(h * factor)))
    # Nearest-neighbor keeps crisp hand-authored hard pixel clusters intact.
    # If this produces poor results on a specific generated source, revise the
    # source artwork instead of silently changing the production renderer.
    fitted = cropped.resize(new_size, Image.Resampling.NEAREST)
    output = Image.new("RGBA", (CELL, CELL), (0, 0, 0, 0))
    x, y = (CELL - new_size[0]) // 2, (CELL - new_size[1]) // 2
    output.alpha_composite(fitted, (x, y))
    out_bbox = output.getchannel("A").getbbox()
    if out_bbox is None or (
        out_bbox[0] < SAFE_INSET or out_bbox[1] < SAFE_INSET
        or out_bbox[2] > CELL - SAFE_INSET or out_bbox[3] > CELL - SAFE_INSET
    ):
        raise ValueError(f"{slot}:unsafe_output_bounds:{out_bbox}")
    return output


def export(art: Image.Image, out: Path, quality: int) -> dict:
    """Select lossless or quality-guarded WebP; never ship a blind q78 encode."""
    kind = "atlas" if art.size == (960, 384) else "icon"
    return write_optimized(art, out, kind=kind, min_quality=quality)

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    subs = parser.add_subparsers(dest="mode", required=True)

    atlas = subs.add_parser("atlas", help="Compile ten slot-named PNG masters")
    atlas.add_argument("--folder", required=True, type=Path)
    atlas.add_argument("--out", required=True, type=Path)
    atlas.add_argument("--quality", type=int, default=80, help="Minimum lossy candidate quality; lossless always considered")
    atlas.add_argument("--report", type=Path, help="Write JSON report outside mobile assets")

    icon = subs.add_parser("icon", help="Compile one standalone reward icon")
    icon.add_argument("--slot", required=True, choices=SLOTS)
    icon.add_argument("--input", required=True, type=Path)
    icon.add_argument("--out", required=True, type=Path)
    icon.add_argument("--quality", type=int, default=80, help="Minimum lossy candidate quality; lossless always considered")
    icon.add_argument("--report", type=Path, help="Write JSON report outside mobile assets")

    args = parser.parse_args()
    if not (1 <= args.quality <= 100):
        parser.error("--quality must be between 1 and 100")
    try:
        if args.mode == "icon":
            result = normalize(args.input, args.slot)
        else:
            result = Image.new("RGBA", (CELL * 5, CELL * 2), (0, 0, 0, 0))
            for index, slot in enumerate(SLOTS):
                source = args.folder / f"{slot}.png"
                result.alpha_composite(normalize(source, slot), ((index % 5) * CELL, (index // 5) * CELL))
        report = export(result, args.out, args.quality)
        if args.report is not None:
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    except (OSError, ValueError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1
    print(f"EXPORTED: {args.out} ({result.width}x{result.height}; transparent WebP)")
    print("  Encoded: {} quality={} size={} B, PNG-equivalent saved {}%".format(report["codec"], report["quality"], report["output_bytes"], report["png_equivalent_savings_pct"]))
    if report["above_target"]:
        print("  WARN: above preferred runtime size target; art review recommended")
    print("NEXT: run tools/validate-equipment-v2-art.py and human style/material QA")
    return 0


if __name__ == "__main__":
    sys.exit(main())
