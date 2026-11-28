#!/usr/bin/env python3
"""Verify the approved EQ2 material archive, then stage in non-runtime review storage only."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import zipfile
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / "docs/art/eq2-material-review"

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("--stage", action="store_true", help="Write verified review files; default is read-only")
    args = parser.parse_args()
    manifest = json.loads((REVIEW / "manifest.json").read_text())
    assert manifest["release"] == "2.0-only" and manifest["runtimeEnabled"] is False
    items = manifest["items"]
    assert len(items) == len({x["itemId"] for x in items}) == 29
    assert len({x["sha256"] for x in items}) == 29
    staged = {}
    with zipfile.ZipFile(args.archive) as z:
        names = z.namelist()
        assert len(names) == len(set(names)), "duplicate archive names"
        expected = {"icons/" + x["file"] for x in items}
        assert {n for n in names if n.startswith("icons/")} == expected, "unexpected or missing icons"
        for x in items:
            assert x["file"] == x["itemId"].lower() + ".webp"
            data = z.read("icons/" + x["file"])
            assert len(data) == x["bytes"] <= manifest["targetBytes"]
            assert hashlib.sha256(data).hexdigest() == x["sha256"]
            with Image.open(io.BytesIO(data)) as img:
                assert img.format == "WEBP" and img.size == (192,192)
                alpha = img.convert("RGBA").getchannel("A")
                assert alpha.getextrema() == (0,255)
                left,top,right,bottom = alpha.getbbox()
                assert min(left,top) >= 26 and max(right,bottom) <= 166
            staged[x["file"]] = data
    assert sum(map(len,staged.values())) == manifest["totalBytes"]
    target = REVIEW / "icons"
    # Check every existing file before writing any file; never overwrite different art.
    for name,data in staged.items():
        path = target / name
        if path.exists() and path.read_bytes() != data:
            raise ValueError(f"Different existing asset: {path}")
    if args.stage:
        target.mkdir(parents=True, exist_ok=True)
        for name,data in staged.items():
            (target / name).write_bytes(data)
    print(f"Verified {len(staged)} icons, {sum(map(len,staged.values()))} bytes; staged={args.stage}")
    print("Non-runtime review only; no Metro requires, game registry or release flags changed.")

if __name__ == "__main__":
    main()
