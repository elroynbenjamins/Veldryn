from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
REVIEW_ROOT = ROOT / "art-review" / "mournchain-harness-v1"
CHARACTER_MASTER = REVIEW_ROOT / "character-master-checkerboard.png"
ICON_MASTER = REVIEW_ROOT / "equipment-master.png"


def remove_checkerboard(source: Image.Image) -> Image.Image:
    rgb = source.convert("RGB")
    rgba = Image.new("RGBA", rgb.size)
    output = []
    for red, green, blue in rgb.getdata():
        neutral = max(red, green, blue) - min(red, green, blue) <= 12
        background = neutral and min(red, green, blue) >= 170
        output.append((red, green, blue, 0 if background else 255))
    rgba.putdata(output)
    return rgba


def fit_sprite(source: Image.Image) -> Image.Image:
    bbox = source.getbbox()
    if bbox is None:
        raise ValueError("generated panel has no visible pixels")
    sprite = source.crop(bbox)
    sprite.thumbnail((112, 152), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (128, 160), (0, 0, 0, 0))
    x = (canvas.width - sprite.width) // 2
    y = canvas.height - sprite.height - 4
    canvas.alpha_composite(sprite, (x, y))
    alpha = canvas.getchannel("A")
    pixels = alpha.load()
    visited = set()
    components = []
    for start_y in range(canvas.height):
        for start_x in range(canvas.width):
            if pixels[start_x, start_y] <= 32 or (start_x, start_y) in visited:
                continue
            stack = [(start_x, start_y)]
            component = []
            visited.add((start_x, start_y))
            while stack:
                point = stack.pop()
                component.append(point)
                px, py = point
                for neighbor in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                    nx, ny = neighbor
                    if 0 <= nx < canvas.width and 0 <= ny < canvas.height and neighbor not in visited and pixels[nx, ny] > 32:
                        visited.add(neighbor)
                        stack.append(neighbor)
            components.append(component)
    largest = max(components, key=len, default=[])
    for component in components:
        if component is largest:
            continue
        for px, py in component:
            pixels[px, py] = 0
    canvas.putalpha(alpha)
    return canvas


def main() -> None:
    master = remove_checkerboard(Image.open(CHARACTER_MASTER))
    labels = (("male", "front"), ("male", "back"), ("female", "front"), ("female", "back"))
    panel_width = master.width // 4
    output_root = ROOT / "assets" / "progression-sets" / "mournchain-harness"
    for index, (body, view) in enumerate(labels):
        left = index * panel_width
        right = master.width if index == 3 else (index + 1) * panel_width
        panel = master.crop((left, 0, right, master.height))
        destination = output_root / body / f"{view}.png"
        destination.parent.mkdir(parents=True, exist_ok=True)
        runtime = fit_sprite(panel)
        if index == 1:
            runtime.paste((0, 0, 0, 0), (0, 0, 25, runtime.height))
        runtime.save(destination, optimize=True)

    icon = Image.open(ICON_MASTER).convert("RGBA")
    if icon.size != (1254, 1254):
        icon = icon.resize((1254, 1254), Image.Resampling.LANCZOS)
    icon_destination = ROOT / "assets" / "equipment-ui" / "mournchain-harness-icon-sheet.png"
    icon.save(icon_destination, optimize=True)


if __name__ == "__main__":
    main()
