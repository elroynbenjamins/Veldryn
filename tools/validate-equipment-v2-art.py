#!/usr/bin/env python3
"""Strict, deterministic geometry/alpha gate for new Veldryn Equipment 2.0 art.

Usage:
    python tools/validate-equipment-v2-art.py path/to/set-atlas.webp --kind atlas
    python tools/validate-equipment-v2-art.py path/to/item.webp --kind icon
    python tools/validate-equipment-v2-art.py candidate.webp --kind atlas --reference approved.webp

Requires: Pillow. This checks machine-verifiable properties, NOT artistic quality.
Existing legacy atlases are intentionally NOT subject to the stricter EQ2 inset.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

try:
    from PIL import Image
except ImportError as exc:
    raise SystemExit("Pillow is required: python -m pip install Pillow") from exc

CELL = 192
COLUMNS = 5
ROWS = 2
INSET = 26
SLOTS = (
    "helmet", "chest", "gloves", "legs", "boots",
    "weapon", "offhand", "cape", "amulet", "ring",
)
# Current non-2.0 guidance targets 250 KiB per 10-icon WebP.
BUDGET_KIB = {
    "atlas": (250, 350, 500),
    "icon": (32, 45, 70),
}


def analyze(path: Path, kind: str, *, enforce_safe: bool = True) -> dict:
    errors: list[str] = []
    try:
        with Image.open(path) as original:
            fmt = original.format
            mode = original.mode
            width, height = original.size
            has_alpha = ("A" in original.getbands()) or ("transparency" in original.info)
            image = original.convert("RGBA")
            alpha = image.getchannel("A")
            expected = (CELL * COLUMNS, CELL * ROWS) if kind == "atlas" else (CELL, CELL)
            if (width, height) != expected:
                errors.append(f"dimensions:{width}x{height};expected:{expected[0]}x{expected[1]}")
            if fmt not in {"WEBP", "PNG"}:
                errors.append(f"format:{fmt};expected:WEBP_or_PNG")
            if not has_alpha:
                errors.append("missing_alpha_channel")
            if alpha.getextrema()[0] == 255:
                errors.append("not_transparent:entire_image_opaque")

            cols, rows = (COLUMNS, ROWS) if kind == "atlas" else (1, 1)
            cells = []
            for index in range(cols * rows):
                col, row = index % cols, index // cols
                name = SLOTS[index] if kind == "atlas" else "single"
                rect = (col * CELL, row * CELL, (col + 1) * CELL, (row + 1) * CELL)
                if rect[2] > width or rect[3] > height:
                    errors.append(f"{name}:cell_not_in_image")
                    continue

                cell_alpha = alpha.crop(rect)
                bbox = cell_alpha.getbbox()  # Includes *all* nonzero alpha.
                if bbox is None:
                    errors.append(f"{name}:empty_cell")
                    cells.append({"index": index, "slot": name, "bbox": None})
                    continue

                left, top, right, bottom = bbox  # right and bottom exclusive
                cells.append({
                    "index": index, "slot": name,
                    "bbox": [left, top, right, bottom],
                    "width": right - left, "height": bottom - top,
                })
                if enforce_safe and (
                    left < INSET or top < INSET
                    or right > CELL - INSET or bottom > CELL - INSET
                ):
                    errors.append(
                        f"{name}:unsafe_alpha_bounds:"
                        f"{left},{top},{right},{bottom};safe:{INSET}..{CELL-INSET}"
                    )

            return {
                "file": str(path), "kind": kind, "format": fmt,
                "mode": mode, "dimensions": [width, height],
                "has_alpha": has_alpha, "bytes": path.stat().st_size,
                "cells": cells, "errors": errors,
            }
    except (OSError, ValueError) as exc:
        return {"file": str(path), "kind": kind, "cells": [], "errors": [f"unreadable:{exc}"]}


def validate(
    path: Path,
    kind: str,
    reference: Path | None = None,
    waiver: str = "",
) -> dict:
    result = analyze(path, kind)
    errors = result["errors"]
    warnings = []

    if "bytes" in result:
        size_kib = result["bytes"] / 1024
        target, review, reject = BUDGET_KIB[kind]
        if size_kib > review:
            if len(waiver.strip()) < 12:
                errors.append(
                    f"size:{size_kib:.1f}KiB;over_review_{review}KiB;"
                    "require_--waiver_with_review_reason"
                )
            else:
                warnings.append(f"size_waived:{size_kib:.1f}KiB;reason:{waiver.strip()}")
        elif size_kib > target:
            warnings.append(f"above_target_size:{size_kib:.1f}KiB;target:{target}KiB")
        if size_kib > reject:
            warnings.append(f"exceeds_rework_threshold:{size_kib:.1f}KiB;{reject}KiB")

    if reference is not None:
        ref = analyze(reference, kind, enforce_safe=False)
        if ref["errors"]:
            errors.append("reference_invalid:" + ",".join(ref["errors"]))
        else:
            for ours, theirs in zip(result["cells"], ref["cells"]):
                if ours.get("bbox") is None or theirs.get("bbox") is None:
                    continue
                new_span = max(ours["width"], ours["height"])
                old_span = max(theirs["width"], theirs["height"])
                if old_span and not 0.8 <= new_span / old_span <= 1.2:
                    errors.append(
                        f"{ours['slot']}:scale_drift:"
                        f"{new_span}px_vs_reference_{old_span}px;"
                        "must_review_against_approved_slot"
                    )
    else:
        warnings.append("visual_parity_unverified:use_--reference_and_human_review")

    result["warnings"] = warnings
    result["style_lock"] = "veldryn-eq2-icon-v1"
    result["passed"] = not errors
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file", type=Path)
    parser.add_argument("--kind", choices=("atlas", "icon"), required=True)
    parser.add_argument("--reference", type=Path, help="Approved matching-slot reference atlas/icon")
    parser.add_argument("--waiver", type=str, default="", help="Recorded reviewer reason for >review-budget files")
    parser.add_argument("--json", action="store_true", help="Print machine-readable report")
    args = parser.parse_args()

    result = validate(args.file, args.kind, reference=args.reference, waiver=args.waiver)
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        prefix = "PASS" if result["passed"] else "FAIL"
        print(f"{prefix}: {args.file} [{args.kind}] styleLock={result['style_lock']}")
        for err in result["errors"]:
            print(f"  ERROR {err}")
        for warning in result["warnings"]:
            print(f"  WARN  {warning}")
        if result["passed"]:
            print(f"  {len(result['cells'])} contained cell(s), {INSET}px minimum gutter")
    return 0 if result["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
