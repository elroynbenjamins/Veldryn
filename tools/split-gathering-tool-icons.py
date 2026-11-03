"""Generate 12 standalone gathering-tool icons from the legacy 4x3 atlas.

Run from the repository root: python3 tools/split-gathering-tool-icons.py
Requires Pillow. Generated PNG assets are committed for direct Metro requires.
"""
from __future__ import annotations
from collections import deque
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "apps/mobile/assets/tools/gathering-tools-v3.png"
DEST = ROOT / "apps/mobile/assets/tools/individual"
CELL = 362
SIZE = 256
INSET = 9
ITEMS = (
    ("copper-pickaxe", 0, 0), ("aster-iron-pickaxe", 1, 0),
    ("oathstone-pickaxe", 2, 0), ("frostiron-pickaxe", 3, 0),
    ("greenwood-hatchet", 0, 1), ("aster-iron-hatchet", 1, 1),
    ("oathstone-hatchet", 2, 1), ("frostiron-hatchet", 3, 1),
    ("reedline-rod", 0, 2), ("ironwood-rod", 1, 2),
    ("oathscale-rod", 2, 2), ("rimeglass-rod", 3, 2),
)

def main_component_mask(alpha: Image.Image) -> Image.Image:
    """Keep the dominant tool silhouette, discarding small adjacent fragments."""
    expanded = alpha.point(lambda px: 255 if px >= 25 else 0).filter(
        ImageFilter.MaxFilter(7)
    )
    width, height = expanded.size
    raw = expanded.tobytes()
    seen = bytearray(width * height)
    largest: list[int] = []
    for pos, value in enumerate(raw):
        if not value or seen[pos]:
            continue
        seen[pos] = 1
        queue = deque([pos])
        component: list[int] = []
        while queue:
            pixel = queue.popleft()
            component.append(pixel)
            x = pixel % width
            for neighbor in (
                pixel - 1 if x else -1,
                pixel + 1 if x + 1 < width else -1,
                pixel - width if pixel >= width else -1,
                pixel + width if pixel + width < width * height else -1,
            ):
                if neighbor >= 0 and raw[neighbor] and not seen[neighbor]:
                    seen[neighbor] = 1
                    queue.append(neighbor)
        if len(component) > len(largest):
            largest = component
    data = bytearray(width * height)
    for pos in largest:
        data[pos] = 255
    return Image.frombytes("L", (width, height), bytes(data))

def clean_tile(sheet: Image.Image, column: int, row: int) -> Image.Image:
    x, y = column * CELL, row * CELL
    tile = sheet.crop((x + INSET, y + INSET, x + CELL - INSET, y + CELL - INSET)).convert("RGBA")
    alpha = tile.getchannel("A")
    if alpha.getextrema()[0] == 255:
        raise ValueError("The source atlas is opaque; refusing to cut unreliable icons")
    tile.putalpha(ImageChops.multiply(alpha, main_component_mask(alpha)))
    bbox = tile.getchannel("A").getbbox()
    if not bbox:
        raise ValueError(f"No icon at atlas cell {column},{row}")
    art = tile.crop(bbox)
    art.thumbnail((SIZE - 24, SIZE - 24), Image.Resampling.LANCZOS)
    output = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    output.alpha_composite(art, ((SIZE - art.width) // 2, (SIZE - art.height) // 2))
    return output

def main() -> None:
    with Image.open(SOURCE) as source:
        sheet = source.convert("RGBA")
    if sheet.size != (CELL * 4, CELL * 3):
        raise ValueError(f"Unexpected tool atlas dimensions: {sheet.size}")
    DEST.mkdir(parents=True, exist_ok=True)
    for name, column, row in ITEMS:
        path = DEST / f"{name}.png"
        clean_tile(sheet, column, row).save(path, optimize=True)
        print(f"Generated {path.relative_to(ROOT)}")

if __name__ == "__main__":
    main()
