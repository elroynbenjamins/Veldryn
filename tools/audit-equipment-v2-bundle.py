#!/usr/bin/env python3
"""Audit new Equipment 2.0 runtime art for unnecessary mobile bundle growth.

Only one optimized RGBA WebP per asset is allowed. PNG masters, @2x/@3x
duplicates and exact duplicate bytes are rejected. This does not inspect
legacy art or claim actual AAB savings: report only measures checked-in bytes.
"""
from __future__ import annotations

from collections import defaultdict
from hashlib import sha256
from pathlib import Path
import argparse
import json
import sys

try:
    from PIL import Image
except ImportError as exc:
    raise SystemExit("Pillow is required: python -m pip install Pillow") from exc


def audit(root: Path, *, warn_mib: float = 12.0, hard_mib: float = 20.0) -> dict:
    if warn_mib < 0 or hard_mib <= warn_mib:
        raise ValueError("invalid_bundle_budget")
    result = {
        "folder": str(root),
        "passed": True,
        "asset_count": 0,
        "checked_in_bytes": 0,
        "checked_in_mib": 0.0,
        "warnings": [],
        "errors": [],
        "counts_by_type": {"atlas": 0, "icon": 0},
        "assets": [],
    }
    if not root.exists():
        result["warnings"].append("no_Eq2_runtime_assets_folder:expected_until_art_approved")
        return result
    files = [path for path in root.rglob("*") if path.is_file()]
    hashes: dict[str, list[str]] = defaultdict(list)

    for path in sorted(files):
        relative = path.relative_to(root).as_posix()
        if path.suffix.lower() != ".webp":
            result["errors"].append(f"non_webp_runtime_file:{relative}")
            continue
        if any(segment in path.stem.lower() for segment in ("@2x", "@3x", "_master", "-master", "_source", "-source")):
            result["errors"].append(f"unwanted_density_or_master_variant:{relative}")
        data = path.read_bytes()
        signature = sha256(data).hexdigest()
        hashes[signature].append(relative)
        kind = "atlas" if path.name.endswith("-atlas.webp") else "icon"
        expected = (960, 384) if kind == "atlas" else (192, 192)
        try:
            with Image.open(path) as im:
                if im.format != "WEBP":
                    result["errors"].append(f"format_not_webp:{relative}")
                if im.size != expected:
                    result["errors"].append(f"dimensions_mismatch:{relative}:{im.size}!={expected}")
                if not (("A" in im.getbands()) or ("transparency" in im.info)):
                    result["errors"].append(f"missing_alpha:{relative}")
        except (OSError, ValueError) as exc:
            result["errors"].append(f"unreadable:{relative}:{exc}")
        result["asset_count"] += 1
        result["checked_in_bytes"] += len(data)
        result["counts_by_type"][kind] += 1
        result["assets"].append({"path": relative, "kind": kind, "bytes": len(data), "sha256": signature})

    for paths in hashes.values():
        if len(paths) > 1:
            result["errors"].append("identical_assets_must_share_single_path:" + ",".join(paths))

    mib = result["checked_in_bytes"] / (1024 * 1024)
    result["checked_in_mib"] = round(mib, 4)
    if mib > hard_mib:
        result["errors"].append(f"new_Eq2_assets_over_hard_budget:{mib:.2f}MiB>{hard_mib:.2f}MiB")
    elif mib > warn_mib:
        result["warnings"].append(f"new_Eq2_assets_near_budget:{mib:.2f}MiB>{warn_mib:.2f}MiB")
    result["passed"] = not result["errors"]
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path("apps/mobile/assets/equipment-2-0"))
    parser.add_argument("--warn-mib", type=float, default=12)
    parser.add_argument("--hard-mib", type=float, default=20)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    report = audit(args.root, warn_mib=args.warn_mib, hard_mib=args.hard_mib)
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print("{}: {} runtime asset(s), {:.3f} MiB".format(
            "PASS" if report["passed"] else "FAIL",
            report["asset_count"],
            report["checked_in_mib"],
        ))
        for warning in report["warnings"]:
            print("  WARN " + warning)
        for error in report["errors"]:
            print("  ERROR " + error)
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
