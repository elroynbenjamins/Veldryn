from collections import deque
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
REVIEW_ROOT = ROOT / "art-review" / "rimewall-oath-v1"
OUTPUT_ROOT = ROOT / "assets" / "progression-sets" / "rimewall-oath" / "female"


def clear_edge_connected_checkerboard(source: Image.Image) -> Image.Image:
    """Clear the neutral checkerboard without erasing enclosed white fur details."""
    rgba = source.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    visited: set[tuple[int, int]] = set()
    queue: deque[tuple[int, int]] = deque()

    def is_background(x: int, y: int) -> bool:
        red, green, blue, _ = pixels[x, y]
        return max(red, green, blue) - min(red, green, blue) <= 10 and min(red, green, blue) >= 180

    for x in range(width):
        if is_background(x, 0):
            queue.append((x, 0))
        if is_background(x, height - 1):
            queue.append((x, height - 1))
    for y in range(height):
        if is_background(0, y):
            queue.append((0, y))
        if is_background(width - 1, y):
            queue.append((width - 1, y))

    while queue:
        x, y = queue.popleft()
        if (x, y) in visited or not is_background(x, y):
            continue
        visited.add((x, y))
        pixels[x, y] = (0, 0, 0, 0)
        if x:
            queue.append((x - 1, y))
        if x + 1 < width:
            queue.append((x + 1, y))
        if y:
            queue.append((x, y - 1))
        if y + 1 < height:
            queue.append((x, y + 1))

    return rgba


def fit_runtime_sprite(source: Image.Image) -> Image.Image:
    bbox = source.getbbox()
    if bbox is None:
        raise ValueError("corrected Rimewall source contains no visible pixels")
    sprite = source.crop(bbox)
    sprite.thumbnail((120, 152), Image.Resampling.NEAREST)
    canvas = Image.new("RGBA", (128, 160), (0, 0, 0, 0))
    x = (canvas.width - sprite.width) // 2
    y = canvas.height - sprite.height - 4
    canvas.alpha_composite(sprite, (x, y))
    return canvas


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    sources = {
        "front": REVIEW_ROOT / "female-front-user-corrected.png",
        "back": REVIEW_ROOT / "female-back-user-corrected.png",
    }
    for view, source_path in sources.items():
        cleaned = clear_edge_connected_checkerboard(Image.open(source_path))
        cleaned.save(REVIEW_ROOT / f"female-{view}-user-corrected-clean.png", optimize=True)
        fit_runtime_sprite(cleaned).save(OUTPUT_ROOT / f"{view}.png", optimize=True)


if __name__ == "__main__":
    main()
