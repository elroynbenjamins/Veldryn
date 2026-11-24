#!/usr/bin/env python3
"""Verify the approved Ultra Luxe v3 binary archive; install only on explicit request.
Does not commit, push, grant ownership, deploy or activate gameplay benefits.
"""
import argparse
import hashlib
import json
from pathlib import Path, PurePosixPath
import struct
import zipfile

ARCHIVE_SHA = "c97d2a27f3aff2ad82d16a7762d8436fcfc730bc7f1ff2f07cbaa994cb3220b9"
PREFIX = "apps/mobile/assets/ascendant/"
REGISTRY = "apps/mobile/src/theme/draconic-integration-assets.ts"
# Only this exact reviewed old blob may be replaced by the v3 approved art.
REVIEWED_REPLACEMENTS = {PREFIX + "celestial/celestial_pet_showcase.webp": "3dbf0d69a6bc2b921dc8e8fb4860d1ae9893a0a8"}

def git_blob_sha(data):
    return hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest()

def sha(data):
    return hashlib.sha256(data).hexdigest()

def verify_webp(data, name):
    if len(data) < 20 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        raise ValueError(f"Invalid WebP: {name}")
    if struct.unpack_from("<I", data, 4)[0] + 8 != len(data):
        raise ValueError(f"Incorrect RIFF length: {name}")
    offset, image = 12, False
    while offset + 8 <= len(data):
        chunk, size = struct.unpack_from("<4sI", data, offset)
        image = image or chunk in (b"VP8 ", b"VP8L")
        offset += 8 + size + size % 2
        if offset > len(data):
            raise ValueError(f"Truncated WebP: {name}")
    if offset != len(data) or not image:
        raise ValueError(f"Incomplete WebP: {name}")

def read_package(archive):
    if sha(archive.read_bytes()) != ARCHIVE_SHA:
        raise ValueError("Archive differs from the approved v3 package")
    with zipfile.ZipFile(archive) as z:
        manifest = json.loads(z.read("asset-manifest.json"))
        paths = [row["path"] for row in manifest]
        if len(paths) != 30 or len(set(paths)) != 30:
            raise ValueError("Unexpected asset count or duplicate path")
        files = {}
        for row in manifest:
            name = row["path"]
            parts = PurePosixPath(name).parts
            if not name.startswith(PREFIX) or ".." in parts or not name.endswith(".webp"):
                raise ValueError(f"Unexpected asset path: {name}")
            data = z.read(name)
            if len(data) != row["bytes"] or sha(data) != row["sha256"]:
                raise ValueError(f"Hash/length mismatch: {name}")
            verify_webp(data, name)
            files[name] = data
        return files, z.read(REGISTRY).decode("utf-8")

def patch_once(text, old, new, path):
    if new in text:
        return text
    if text.count(old) != 1:
        raise ValueError(f"Registry changed; reconcile manually: {path}")
    return text.replace(old, new, 1)

def install(root, files, registry):
    if not (root / ".git").exists():
        raise ValueError("Specify the root of a checked-out Veldryn repository")
    # Validate every destination before making any changes. Do not overwrite unrelated art.
    pending = {}
    for name, data in files.items():
        target = root / name
        if not target.resolve().is_relative_to(root):
            raise ValueError(f"Asset path escapes checkout: {name}")
        if target.exists():
            existing = target.read_bytes()
            if existing == data:
                continue
            if git_blob_sha(existing) != REVIEWED_REPLACEMENTS.get(name):
                raise ValueError(f"Existing artwork differs; inspect before replacing: {name}")
        pending[target] = data

    draconic = root / REGISTRY
    current = draconic.read_text(encoding="utf-8")
    if current != registry:
        if "getDraconicAssets():DraconicAssetBundle|undefined{return undefined;}" not in current:
            raise ValueError("Draconic registry is no longer the expected placeholder")
        pending[draconic] = registry.encode("utf-8")
    celestial = root / "apps/mobile/src/theme/celestial-integration-assets.ts"
    frame = root / "apps/mobile/src/theme/profile-border-assets.ts"
    badge = root / "apps/mobile/src/components/player-badge-artwork.ts"
    edits = [
        (badge,
         " ascendant_sovereign_of_stars:require('../../assets/ascendant/celestial/sovereign_badge_64.webp'),",
         " ascendant_sovereign_of_stars:require('../../assets/ascendant/celestial/sovereign_badge_64.webp'),\n ascendant_dragon_sovereign:require('../../assets/ascendant/draconic/dragon_sovereign_64.webp'),"),
        (celestial,
         " petShowcase:require('../../assets/ascendant/celestial/celestial_pet_showcase.webp'),",
         " petShowcase:require('../../assets/ascendant/celestial/celestial_pet_showcase.webp'),\n smoothPoseAtlas:require('../../assets/ascendant/celestial/aetherion_smooth_pose_atlas.webp'),"),
        (frame,
         "celestial.scene.border /* interim: aspect-aware ProfileFrameOverlay; dedicated standard export awaits verified binary import */",
         "require('../../assets/ascendant/celestial/celestial_border_standard.webp') as ImageSourcePropType"),
    ]
    for target, old, new in edits:
        if not target.resolve().is_relative_to(root):
            raise ValueError("Registry path escapes checkout")
        current = target.read_text(encoding="utf-8")
        updated = patch_once(current, old, new, target)
        if updated != current:
            pending[target] = updated.encode("utf-8")
    for target, data in pending.items():
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    print(f"Installed {len(pending)} changed files; inspect git diff and run CI before committing.")

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--install", action="store_true")
    args = parser.parse_args()
    files, registry = read_package(args.archive)
    print(f"Verified {len(files)} WebPs ({sum(map(len, files.values()))} bytes), SHA-256 and RIFF chunks.")
    if args.install:
        install(args.root.resolve(), files, registry)

if __name__ == "__main__":
    main()
