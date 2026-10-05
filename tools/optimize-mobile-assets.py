#!/usr/bin/env python3
"""Losslessly convert runtime-referenced React Native PNG assets to WebP.

The script only converts PNG families that are referenced by mobile source code,
keeps @2x/@3x density siblings together, preserves transparent RGB values via
cwebp -exact, and keeps a conversion only when the whole family becomes smaller.

App icons/config-only PNGs are intentionally left untouched.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MOBILE = ROOT / "apps" / "mobile"
ASSETS = MOBILE / "assets"
REPORT = ROOT / "docs" / "mobile-asset-size-pass.json"

TEXT_FILES = [
    *MOBILE.joinpath("src").rglob("*.ts"),
    *MOBILE.joinpath("src").rglob("*.tsx"),
    *MOBILE.joinpath("src").rglob("*.js"),
    *MOBILE.joinpath("src").rglob("*.jsx"),
    *MOBILE.joinpath("tests").rglob("*.ts"),
    *MOBILE.joinpath("tests").rglob("*.tsx"),
    *MOBILE.joinpath("tests").rglob("*.js"),
    *MOBILE.joinpath("tests").rglob("*.jsx"),
    *ROOT.joinpath("tools").glob("*.mjs"),
    *ROOT.joinpath("tools").glob("*.js"),
    *ROOT.joinpath("tools").glob("*.ts"),
    MOBILE / "App.tsx",
    MOBILE / "index.js",
]

# Match quoted relative paths that point into apps/mobile/assets.
ASSET_REF = re.compile(
    r"(?P<quote>['\"])(?P<path>(?:\.\.?/)*assets/[^'\"]+?\.png)(?P=quote)"
)

MIN_SAVING_BYTES = 256
DENSITY_SUFFIX = re.compile(r"@\d+x$")
SKIPPED_UNREADABLE: list[str] = []


def referenced_pngs() -> tuple[set[Path], dict[Path, list[Path]]]:
    referenced: set[Path] = set()
    refs_by_text: dict[Path, list[Path]] = defaultdict(list)
    for text_file in TEXT_FILES:
        if not text_file.exists():
            continue
        data = text_file.read_text(encoding="utf-8")
        for match in ASSET_REF.finditer(data):
            target = (text_file.parent / match.group("path")).resolve()
            try:
                target.relative_to(ASSETS.resolve())
            except ValueError:
                continue
            if target.exists():
                referenced.add(target)
                refs_by_text[text_file].append(target)
    return referenced, refs_by_text


def family_for(path: Path) -> tuple[Path, ...]:
    stem = DENSITY_SUFFIX.sub("", path.stem)
    members: list[Path] = []
    base = path.with_name(stem + ".png")
    if base.exists():
        members.append(base)
    for candidate in sorted(path.parent.glob(stem + "@*x.png")):
        if candidate not in members:
            members.append(candidate)
    if path.exists() and path not in members:
        members.append(path)
    return tuple(members)


def convert_family(family: tuple[Path, ...]) -> tuple[bool, int, int]:
    before = sum(p.stat().st_size for p in family)
    outputs: list[tuple[Path, Path]] = []
    try:
        for png in family:
            webp = png.with_suffix(".webp")
            tmp = webp.with_suffix(".webp.tmp")
            subprocess.run(
                [
                    "cwebp",
                    "-quiet",
                    "-lossless",
                    "-exact",
                    "-m",
                    "6",
                    "-q",
                    "100",
                    "-mt",
                    str(png),
                    "-o",
                    str(tmp),
                ],
                check=True,
            )
            outputs.append((png, tmp))
        after = sum(tmp.stat().st_size for _, tmp in outputs)
        if before - after < MIN_SAVING_BYTES:
            for _, tmp in outputs:
                tmp.unlink(missing_ok=True)
            return False, before, before

        for png, tmp in outputs:
            final = png.with_suffix(".webp")
            tmp.replace(final)
            png.unlink()
        return True, before, after
    except subprocess.CalledProcessError as exc:
        for _, tmp in outputs:
            tmp.unlink(missing_ok=True)
        names = ", ".join(str(p.relative_to(ROOT)) for p in family)
        SKIPPED_UNREADABLE.append(names)
        print(f"WARNING: skipping unreadable PNG family: {names} ({exc})")
        return False, before, before
    except Exception:
        for _, tmp in outputs:
            tmp.unlink(missing_ok=True)
        raise


def rewrite_references(converted: set[Path]) -> int:
    rewrites = 0
    for text_file in TEXT_FILES:
        if not text_file.exists():
            continue
        original = text_file.read_text(encoding="utf-8")

        def replace(match: re.Match[str]) -> str:
            nonlocal rewrites
            target = (text_file.parent / match.group("path")).resolve()
            if target not in converted:
                return match.group(0)
            rewrites += 1
            new_path = match.group("path")[:-4] + ".webp"
            q = match.group("quote")
            return f"{q}{new_path}{q}"

        updated = ASSET_REF.sub(replace, original)
        if updated != original:
            text_file.write_text(updated, encoding="utf-8")
    return rewrites


def validate_references() -> None:
    missing: list[str] = []
    ref_pattern = re.compile(
        r"(?P<quote>['\"])(?P<path>(?:\.\.?/)*assets/[^'\"]+?\.(?:png|webp))(?P=quote)"
    )
    for text_file in TEXT_FILES:
        if not text_file.exists():
            continue
        data = text_file.read_text(encoding="utf-8")
        for match in ref_pattern.finditer(data):
            target = (text_file.parent / match.group("path")).resolve()
            try:
                target.relative_to(ASSETS.resolve())
            except ValueError:
                continue
            if not target.exists():
                missing.append(f"{text_file.relative_to(ROOT)} -> {match.group('path')}")
    if missing:
        raise SystemExit("Missing asset references after optimization:\n" + "\n".join(missing[:50]))


def main() -> None:
    if shutil.which("cwebp") is None:
        raise SystemExit("cwebp is required (install the 'webp' package).")

    referenced, _ = referenced_pngs()
    families: dict[tuple[str, ...], tuple[Path, ...]] = {}
    for png in referenced:
        family = family_for(png)
        key = tuple(str(p) for p in family)
        families[key] = family

    converted_files: set[Path] = set()
    converted_families = 0
    before_total = 0
    after_total = 0
    by_folder: dict[str, dict[str, int]] = defaultdict(lambda: {"before": 0, "after": 0, "files": 0})

    for family in sorted(families.values(), key=lambda group: str(group[0])):
        kept, before, after = convert_family(family)
        before_total += before
        after_total += after
        if not kept:
            continue
        converted_families += 1
        converted_files.update(family)
        folder = family[0].relative_to(ASSETS).parts[0]
        by_folder[folder]["before"] += before
        by_folder[folder]["after"] += after
        by_folder[folder]["files"] += len(family)

    rewrites = rewrite_references(converted_files)
    validate_references()

    report = {
        "strategy": "lossless WebP for runtime-referenced PNG families",
        "referenced_png_files": len(referenced),
        "candidate_families": len(families),
        "converted_families": converted_families,
        "converted_png_files": len(converted_files),
        "source_reference_rewrites": rewrites,
        "candidate_bytes_before": before_total,
        "candidate_bytes_after": after_total,
        "bytes_saved": before_total - after_total,
        "percent_saved": round((before_total - after_total) / before_total * 100, 2) if before_total else 0,
        "skipped_unreadable_families": SKIPPED_UNREADABLE,
        "folders": {
            key: {
                **value,
                "saved": value["before"] - value["after"],
            }
            for key, value in sorted(by_folder.items(), key=lambda item: item[1]["before"] - item[1]["after"], reverse=True)
        },
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
