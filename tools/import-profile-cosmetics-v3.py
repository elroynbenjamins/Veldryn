#!/usr/bin/env python3
"""Import the exact approved V3 artwork; never modify commerce or legacy assets."""
import argparse
import hashlib
import re
from pathlib import Path, PurePosixPath
from zipfile import ZipFile

SHA256 = '6c6bcae3e3a7ac840b081178d3fbe7e43e7f49cf524635767d447de63904b7bb'
REGISTRY = 'apps/mobile/src/theme/profile-cosmetic-art-v1.ts'
PREFIX = 'apps/mobile/assets/profile-cosmetics-v1/'
COUNTS = {'gloamward': 31, 'frostbound': 28, 'amberglass': 27, 'briarbound': 31}


def fail(message):
    raise SystemExit(message)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    parser.add_argument('--root', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--check', action='store_true', help='Validate only; write nothing.')
    args = parser.parse_args()
    root = args.root.resolve()
    if hashlib.sha256(args.archive.read_bytes()).hexdigest() != SHA256:
        fail('Unexpected archive SHA-256; use the approved V3 native review import ZIP.')
    if not (root / REGISTRY).is_file():
        fail('Expected the native review branch and its existing artwork registry.')
    with ZipFile(args.archive) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)) or archive.testzip() is not None:
            fail('Archive contains duplicate paths or corrupt entries.')
        counts = dict.fromkeys(COUNTS, 0)
        payload = {}
        for name in names:
            if name == 'V3_NATIVE_IMPORT.txt':
                continue
            parts = PurePosixPath(name).parts
            if name != REGISTRY:
                if not name.startswith(PREFIX) or len(parts) != 6 or parts[4] not in counts or not re.fullmatch(r'[a-z0-9-]+\.png', parts[5]):
                    fail('Unexpected archive path: ' + name)
                counts[parts[4]] += 1
            data = archive.read(name)
            if name != REGISTRY and not data.startswith(b'\x89PNG\r\n\x1a\n'):
                fail('Invalid PNG: ' + name)
            target = root / name
            if not target.resolve().is_relative_to(root):
                fail('Unsafe destination: ' + name)
            if name != REGISTRY and target.exists() and target.read_bytes() != data:
                fail('Refusing to overwrite a different existing file: ' + name)
            payload[name] = data
        if counts != COUNTS or REGISTRY not in payload:
            fail('Unexpected V3 asset counts or missing registry.')
        registry = payload[REGISTRY].decode('utf-8')
        refs = set(re.findall(r"require\('../../assets/([^']+\.png)'\)", registry))
        if len(refs) != 110 or any('apps/mobile/assets/' + ref not in payload for ref in refs):
            fail('Registry asset references do not match the archive.')
        registry_replacements = {
            "'frame_gloamward'": "'cosmetic:gloamward:arcane-frame'",
            "'dungeon:frostmarch:frostbound-chime'": "'cosmetic:frostbound:chime-frame'",
            "'dungeon:sunscar:amberglass-loop'": "'cosmetic:amberglass:loop-frame'",
            "'dungeon:asterfall:briarbound-frame'": "'cosmetic:briarbound:verdant-frame'",
        }
        for old, new in registry_replacements.items():
            if old not in registry:
                fail('Approved registry is missing expected visual-base id: ' + old)
            registry = registry.replace(old, new)
        payload[REGISTRY] = registry.encode('utf-8')
        registry_target = root / REGISTRY
        if registry_target.exists() and registry_target.read_bytes() != payload[REGISTRY]:
            current = registry_target.read_text(encoding='utf-8')
            if 'PROFILE_COSMETIC_ART:readonly CosmeticArt[]=[];' not in current:
                fail('Refusing to overwrite a different existing artwork registry.')
        if not args.check:
            # Write artwork first, registry last. The empty registry remains safe if a write fails.
            for name in [n for n in payload if n != REGISTRY] + [REGISTRY]:
                target = root / name
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(payload[name])
    print(('Validated' if args.check else 'Imported') + ' 117 PNG assets, 4 collections, 110 referenced PNGs; approved ZIP checksum verified.')


if __name__ == '__main__':
    main()
