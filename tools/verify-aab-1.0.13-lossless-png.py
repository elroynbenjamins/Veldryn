"""Audit the 1.0.13 lossless PNG import without modifying assets."""
import io
import json
import os
from pathlib import Path
import struct
import subprocess
import zlib
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)
manifest = json.loads((ROOT / "tools/aab-1.0.13-lossless-png.json").read_text())
baseline, optimized = manifest["baseline"], manifest["optimized"]
paths = manifest["assets"]
assert len(paths) == len(set(paths)) == 47
assert all(p.startswith("apps/mobile/assets/") and p.endswith(".png") for p in paths)

def git(*args):
    return subprocess.check_output(["git", *args])

def read(ref, path):
    return git("show", f"{ref}:{path}")

def chunks(data):
    assert data[:8] == b"\x89PNG\r\n\x1a\n", "Not PNG"
    pos, metadata, kinds = 8, [], []
    while pos < len(data):
        assert pos + 12 <= len(data), "Truncated PNG"
        n = struct.unpack_from(">I", data, pos)[0]
        end = pos + 12 + n
        assert end <= len(data), "Truncated chunk"
        kind = data[pos+4:pos+8]
        assert zlib.crc32(data[pos+4:end-4]) & 0xffffffff == struct.unpack_from(">I", data, end-4)[0], "Invalid chunk CRC"
        assert kind not in (b"acTL", b"fcTL", b"fdAT"), "APNG excluded"
        kinds.append(kind)
        if kind != b"IDAT":
            metadata.append(data[pos:end])
        pos = end
    assert pos == len(data) and kinds[0] == b"IHDR" and kinds[-1] == b"IEND"
    assert kinds.count(b"IHDR") == kinds.count(b"IEND") == 1 and b"IDAT" in kinds
    return metadata

source_changes = git("diff", "--name-only", "-z", baseline, optimized).decode().split("\x00")
assert sorted(p for p in source_changes if p.endswith(".png")) == sorted(paths), "Source PNG scope drift"
before_total = after_total = 0
for path in paths:
    before, source, after = read(baseline, path), read(optimized, path), read("HEAD", path)
    assert source == after, f"Optimized source blob mismatch: {path}"
    assert len(after) < len(before), f"No positive saving: {path}"
    assert chunks(before) == chunks(after), f"PNG non-IDAT chunk mismatch: {path}"
    with Image.open(io.BytesIO(before)) as a, Image.open(io.BytesIO(after)) as b:
        a.load()
        b.load()
        assert a.size == b.size and a.mode == b.mode, f"Dimensions/mode mismatch: {path}"
        assert a.tobytes() == b.tobytes(), f"Native sample mismatch: {path}"
        assert a.convert("RGBA").tobytes() == b.convert("RGBA").tobytes(), f"RGBA mismatch: {path}"
    before_total += len(before)
    after_total += len(after)
    print(f"PASS {path}: {len(before)-len(after):,} bytes saved")
saved = before_total - after_total
summary = f"Verified {len(paths)} PNGs: {before_total:,} → {after_total:,} bytes; {saved:,} bytes saved ({saved/before_total:.2%}). Exact source, dimensions, samples, RGBA and metadata parity. Raw PNG savings, not signed AAB savings."
print(summary)
if os.environ.get("GITHUB_STEP_SUMMARY"):
    with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as out:
        out.write(summary + "\n")
