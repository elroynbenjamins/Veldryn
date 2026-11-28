#!/usr/bin/env python3
"""Build a read-only review of every registered Veldryn profile icon.

Requires Pillow. Writes candidate artwork, contact sheets and measurements to
an output directory; never alters runtime assets, registries or unlock rules.
"""
import argparse
import json
import re
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
MOBILE = ROOT / "apps/mobile"
CANVAS = 512
SPAN = 470  # 91.8%, at least 21px nominal safe space
REGISTRIES = (
    "src/theme/profile-icon-assets.ts",
    "src/theme/profile-cosmetic-wave2-assets.ts",
)
ASSET = re.compile(r"""^\s*(?:'([^']+)'|([A-Z_]+)):\s*require\('(\.\./\.\./assets/[^']+)'\)""", re.M)
CELL = re.compile(r"'([^']+)':\{column:(\d+),row:(\d+)\}")
ATLAS = re.compile(r"profileCosmeticPortraitAtlas\s*=\s*require\('([^']+)'\)")

def inventory():
    rows = []
    for registry in REGISTRIES:
        path = MOBILE / registry
        source = path.read_text()
        # The wave2 file also contains border/effect art; only inspect its portrait map.
        if "wave2" in registry:
            source = source.split("export const WAVE2_PORTRAIT_ART", 1)[1]
        for quoted, symbol, relative in ASSET.findall(source):
            icon_id = quoted or "class:" + symbol
            asset = (path.parent / relative).resolve()
            rows.append((icon_id, asset, None))
        if "profile-icon-assets" in registry:
            atlas = (path.parent / ATLAS.search(source).group(1)).resolve()
            for icon_id, col, row in CELL.findall(source):
                rows.append((icon_id, atlas, (int(col), int(row))))
    ids = [row[0] for row in rows]
    if len(ids) != len(set(ids)) or len(ids) < 49:
        raise ValueError(f"Unexpected profile icon registry: {len(ids)} entries")
    return rows

def open_source(path, cell):
    with Image.open(path) as raw:
        image = raw.convert("RGBA")
    if cell is not None:
        if image.width % 4 or image.height % 2:
            raise ValueError(f"Atlas dimensions are not divisible: {path}")
        w, h = image.width // 4, image.height // 2
        x, y = cell
        image = image.crop((x*w, y*h, (x+1)*w, (y+1)*h))
    return image

def normalized(image):
    alpha = image.getchannel("A")
    bounds = alpha.point(lambda value: 255 if value >= 16 else 0).getbbox()
    if bounds is None:
        raise ValueError("Empty or nearly transparent profile icon")
    left, top, right, bottom = bounds
    # Retain soft edge pixels adjacent to the meaningful silhouette.
    bounds_with_fringe = (max(0,left-2), max(0,top-2),
                          min(image.width,right+2), min(image.height,bottom+2))
    crop = image.crop(bounds_with_fringe)
    scale = SPAN / max(crop.size)
    size = tuple(max(1, round(d * scale)) for d in crop.size)
    # Never invent new detail: use nearest for enlargement and high-quality
    # downsampling for large sources. Low-resolution originals are flagged.
    resized = crop.resize(size, Image.Resampling.NEAREST if scale >= 1 else Image.Resampling.LANCZOS)
    candidate = Image.new("RGBA", (CANVAS, CANVAS))
    candidate.paste(resized, ((CANVAS-size[0])//2, (CANVAS-size[1])//2))
    assert candidate.getchannel("A").getbbox() is not None
    return candidate, bounds, scale

def thumbnail(image, size):
    ratio = size / max(image.size)
    dims = tuple(max(1, round(d * ratio)) for d in image.size)
    im = image.resize(dims, Image.Resampling.LANCZOS)
    tile = Image.new("RGBA", (size,size), (20,24,30,255))
    tile.alpha_composite(im, ((size-dims[0])//2,(size-dims[1])//2))
    return tile

def contact_sheet(rows, output, size):
    # Three entries per row; every entry includes original and normalized.
    cols = 3
    width = max(270, size*2+32)
    height = size+47
    sheet = Image.new("RGB", (cols*width, ((len(rows)+cols-1)//cols)*height), (13,16,20))
    draw = ImageDraw.Draw(sheet)
    for i, (icon_id, before, after) in enumerate(rows):
        x, y = (i%cols)*width, (i//cols)*height
        # Use concise labels without losing the full id in the JSON report.
        label = icon_id if len(icon_id) <= 38 else icon_id[-38:]
        draw.text((x+8,y+5),label,fill="white")
        for j, (name, image) in enumerate((("Original",before),("Candidate",after))):
            offset = x+8+j*(size+10)
            sheet.paste(thumbnail(image,size).convert("RGB"),(offset,y+22))
            draw.text((offset,y+size+25),name,fill=(180,190,200))
    sheet.save(output)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out",type=Path,default=ROOT/"art-review/profile-icons")
    args = parser.parse_args()
    output = args.out.resolve()
    # Do not let an accidental --out overwrite shipping asset directories.
    if output == MOBILE or MOBILE in output.parents:
        raise ValueError("Review output must be outside apps/mobile")
    output.mkdir(parents=True,exist_ok=True)
    candidates = output/"candidates"
    candidates.mkdir(exist_ok=True)
    report = []
    sheets = []
    for icon_id, path, cell in inventory():
        original = open_source(path,cell)
        result,bounds,scale = normalized(original)
        name = re.sub(r"[^a-zA-Z0-9_-]+","__",icon_id)+".webp"
        target = candidates/name
        result.save(target, "WEBP",lossless=True,method=6,exact=True)
        with Image.open(target) as check:
            assert check.convert("RGBA").tobytes() == result.tobytes()
        flags = []
        if min(original.size)<512: flags.append("native-resolution-below-target")
        if min(original.size)<256: flags.append("redraw-priority")
        if icon_id.startswith("dungeon:"): flags.append("art-quality-review")
        if bounds[0]==0 or bounds[1]==0 or bounds[2]==original.width or bounds[3]==original.height:
            flags.append("source-touches-canvas-edge")
        report.append({"id":icon_id,"source":str(path.relative_to(ROOT)),
                       "atlas_cell":cell,"source_pixels":original.size,"alpha_bounds":bounds,
                       "source_visible_span":round(max(bounds[2]-bounds[0],bounds[3]-bounds[1])/max(original.size),3),
                       "candidate_pixels":result.size,"scale":round(scale,3),
                       "source_file_bytes":path.stat().st_size,"candidate_bytes":target.stat().st_size,
                       "candidate":str(target.relative_to(output)),"flags":flags})
        sheets.append((icon_id,original,result))
    (output/"audit.json").write_text(json.dumps({"count":len(report),"canvas":CANVAS,
        "visible_span_target":SPAN,"review_only":True,"icons":report},indent=2)+"\n")
    for size in (32,96,160):
        contact_sheet(sheets,output/f"comparison-{size}px.png",size)
    print(f"Prepared {len(report)} profile icon review candidates: {output}")

if __name__ == "__main__":
    main()
