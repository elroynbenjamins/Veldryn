#!/usr/bin/env python3
"""Lossless, reference-aware optimization for Veldryn's compact game artwork.

Pass 1: convert *statically referenced* PNG icon families to bit-exact lossless
WebP only when the family is smaller. Keep pixels, alpha, dimensions, and density
variants unchanged, then rewrite literal source references.

Pass 2: remove only unused superseded PNG masters with already-checked-in
runtime WebP alternates, and three explicitly obsolete unused Trial v1 masters.
No dynamically referenced/ambiguous files are deleted. Unique artwork is kept.

All measurements are of tracked source bytes, not a claim about AAB size.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
from collections import Counter, defaultdict
from pathlib import Path

from PIL import Image

TARGET_PREFIXES = (
    'trial-enemies/', 'guild-remaster/', 'guild-token-shop/',
    'guild-customization/', 'dungeon-enemies-v1/', 'monsters/',
    'ingredient-icons-v1/', 'ingredient-icons-v2/', 'items/resources/',
    'companion-resources/', 'events/', 'event_collectibles/',
)
SUPERSEDED_PREFIXES = ('guild-customization/', 'event_collectibles/')
OBSOLETE_TRIAL_MASTERS = {
    'trial-enemies/trial-raider-v1.png',
    'trial-enemies/trial-guard-v2.png',
    'trial-enemies/trial-echo-v1.png',
}
ASSET_PATH_RE = re.compile(r'(?P<quote>[\'"`])(?P<path>(?:\.\.?/)+assets/[^\'"`\s]+?\.(?:png|webp))(?P=quote)')
DENSITY = re.compile(r'@\d+x$')
SOURCE_SUFFIXES = {'.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.py', '.xml'}
SKIP_DIRS = {'node_modules', '.git', 'dist', 'build', '.expo', '.next', '__pycache__', '.core-build', '.ux-popup-build', '.search-loadouts-build', 'output', '.codex-upstream'}


def source_files(root: Path) -> list[Path]:
    candidates = []
    for parent in [root/'apps/mobile/src', root/'apps/mobile/tests', root/'apps/mobile/plugins', root/'apps/mobile/assets', root/'tools', root/'docs']:
        if not parent.exists():
            continue
        for p in parent.rglob('*'):
            if p.is_file() and p.suffix in SOURCE_SUFFIXES and not (set(p.relative_to(parent).parts) & SKIP_DIRS):
                candidates.append(p)
    for name in ['apps/mobile/App.tsx', 'apps/mobile/app.json', 'apps/mobile/app.config.ts', 'apps/mobile/metro.config.js', 'apps/mobile/babel.config.js', 'apps/mobile/package.json', 'apps/mobile/index.js']:
        p = root/name
        if p.exists() and p not in candidates:
            candidates.append(p)
    return sorted(candidates)


def collect_refs(root: Path, files: list[Path]):
    assets = (root/'apps/mobile/assets').resolve()
    refs = defaultdict(list)
    texts = {}
    for file in files:
        text = file.read_text('utf-8', errors='replace')
        texts[file] = text
        for match in ASSET_PATH_RE.finditer(text):
            target = (file.parent/match['path']).resolve()
            if target.is_relative_to(assets):
                refs[target].append(file)
    return refs, texts


def family(p: Path):
    stem = DENSITY.sub('', p.stem)
    base = p.with_name(stem+'.png')
    family_paths = [base] if base.is_file() else []
    family_paths.extend(sorted(q for q in p.parent.glob(stem+'@*x.png') if q not in family_paths))
    if p not in family_paths and p.exists():
        family_paths.append(p)
    return tuple(family_paths)


def lossless_convert(group: tuple[Path,...], minimum_saving=512):
    before = sum(p.stat().st_size for p in group)
    outputs = []
    try:
        for src in group:
            dst = src.with_suffix('.webp')
            if dst.exists():
                return None  # Never overwrite an approved existing WebP.
            tmp = dst.with_suffix('.webp.part')
            subprocess.run(['cwebp','-quiet','-lossless','-exact','-m','6','-q','100','-mt',str(src),'-o',str(tmp)],check=True)
            # Verify absolutely no pixel or transparency difference, including
            # transparent pixel RGB channels. Dimensions are compared as well.
            with Image.open(src) as a, Image.open(tmp) as b:
                if a.size != b.size or a.convert('RGBA').tobytes()!=b.convert('RGBA').tobytes():
                    raise RuntimeError(f'Non-identical decoded pixels: {src}')
            outputs.append((src,dst,tmp))
        after = sum(tmp.stat().st_size for _,_,tmp in outputs)
        if before-after < minimum_saving:
            return None
        for src,dst,tmp in outputs:
            tmp.replace(dst)
            src.unlink()
        return before, after
    finally:
        for _,_,tmp in outputs:
            tmp.unlink(missing_ok=True)


def rewrite_refs(root: Path, files: list[Path], converted: set[Path]) -> int:
    count = 0
    for file in files:
        text = file.read_text('utf-8')
        def replace(m):
            nonlocal count
            resolved = (file.parent/m['path']).resolve()
            if resolved not in converted:
                return m[0]
            count += 1
            return f"{m['quote']}{m['path'][:-4]}.webp{m['quote']}"
        updated = ASSET_PATH_RE.sub(replace,text)
        if updated != text:
            file.write_text(updated,encoding='utf-8')
    return count


def main(root: Path, dry_run=False):
    root = root.resolve()
    assets = root/'apps/mobile/assets'
    if not assets.is_dir():
        raise SystemExit('Missing apps/mobile/assets')
    if not dry_run and shutil.which('cwebp') is None:
        raise SystemExit('cwebp is required')
    texts = source_files(root)
    refs, original_texts = collect_refs(root,texts)
    asset_files = [p for p in assets.rglob('*') if p.is_file() and p.suffix.lower() in ('.png','.webp')]
    sha_groups = defaultdict(list)
    for p in asset_files:
        sha_groups[hashlib.sha256(p.read_bytes()).digest()].append(p)
    duplicate_groups = [group for group in sha_groups.values() if len(group)>1]
    # Every referenced PNG in these categories is eligible, but no unrelated art.
    selected = [p for p in refs if p.exists() and p.suffix.lower()=='.png' and p.relative_to(assets).as_posix().startswith(TARGET_PREFIXES)]
    families = sorted({family(p) for p in selected},key=lambda x:x[0].as_posix())
    converted = set()
    conversion_events = []
    skipped = []
    for group in families:
        if dry_run:
            continue
        try:
            change = lossless_convert(group)
            if change:
                converted.update(group)
                conversion_events.append({'files':[p.relative_to(root).as_posix() for p in group], 'before':change[0], 'after':change[1]})
            else:
                skipped.append(group[0].relative_to(root).as_posix())
        except (RuntimeError,subprocess.CalledProcessError,OSError) as exc:
            # Image integrity failures must fail CI, never deploy damaged art.
            raise SystemExit(f'Unsafe image conversion: {group[0]}: {exc}') from exc
    rewritten = rewrite_refs(root,texts,converted) if not dry_run else 0

    # Re-scan changed source before pruning. PNGs in these folders already have
    # approved _runtime.webp variants used in the shipping UI.
    fresh_refs,_ = collect_refs(root,texts)
    removed = []
    for p in asset_files:
        if not p.exists() or p.suffix.lower()!='.png' or p in fresh_refs:
            continue
        relative = p.relative_to(assets).as_posix()
        derived = p.with_name(p.stem+'_runtime.webp')
        superseded = relative.startswith(SUPERSEDED_PREFIXES) and derived.exists() and derived in fresh_refs
        obsolete = relative in OBSOLETE_TRIAL_MASTERS
        if not superseded and not obsolete:
            continue
        # An exact filename appearing anywhere (including generated config or
        # tool notes) is an ambiguity; never automatically delete it.
        if any(p.name in text for file,text in original_texts.items() if file.resolve()!=Path(__file__).resolve()):
            skipped.append('Referenced by basename: '+relative)
            continue
        removed.append({'file':p.relative_to(root).as_posix(),'bytes':p.stat().st_size,'reason':'runtime alternate' if superseded else 'unused Trial v1 legacy'})
        if not dry_run:
            p.unlink()
    final_refs,_ = collect_refs(root,texts)
    # Don't mask earlier missing references but fail on any newly dangling path.
    original_missing = {p for p in refs if not p.exists() and p not in converted}
    introduced_missing = {p for p in final_refs if not p.exists()} - original_missing
    if introduced_missing:
        raise SystemExit('Newly broken asset references:\n'+'\n'.join(map(str, sorted(introduced_missing))))
    saved_conversion = sum(row['before']-row['after'] for row in conversion_events)
    saved_cleanup = sum(row['bytes'] for row in removed)
    summary = {
        'strategy':'pixel-identical lossless WebP for referenced game icons; cautious legacy PNG removal',
        'scope':list(TARGET_PREFIXES),
        'candidate_referenced_png_families':len(families),
        'converted_families':len(conversion_events),
        'converted_png_count':len(converted),
        'source_reference_rewrites':rewritten,
        'bytes_saved_runtime_artwork':saved_conversion,
        'bytes_removed_superseded_sources':saved_cleanup,
        'total_tracked_bytes_saved':saved_conversion+saved_cleanup,
        'source_identical_duplicate_groups':len(duplicate_groups),
        'source_duplicates_auto_deleted':0,
        'converted':conversion_events,
        'removed_superseded_sources':removed,
        'skipped':skipped,
        'pixel_exact_verified':True,
    }
    report = root/'docs/veldryn-icon-optimization.json'
    if not dry_run:
        report.parent.mkdir(parents=True,exist_ok=True)
        report.write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in summary.items() if k not in ('converted','skipped')}, indent=2))
    return summary


if __name__=='__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('--root',type=Path,default=Path(__file__).resolve().parents[1])
    ap.add_argument('--dry-run',action='store_true')
    args=ap.parse_args()
    main(args.root,args.dry_run)