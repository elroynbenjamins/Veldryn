from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
CHARACTER_MASTER = ROOT / "art-review" / "lastwall-panoply-v1" / "character-master.png"
ICON_MASTER = ROOT / "art-review" / "lastwall-panoply-v1" / "equipment-master.png"


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
    return canvas


def main() -> None:
    master = Image.open(CHARACTER_MASTER).convert("RGBA")
    labels = (("male", "front"), ("male", "back"), ("female", "front"), ("female", "back"))
    panel_width = master.width // 4
    output_root = ROOT / "assets" / "progression-sets" / "lastwall-panoply"
    for index, (body, view) in enumerate(labels):
        left = index * panel_width
        right = master.width if index == 3 else (index + 1) * panel_width
        panel = master.crop((left, 0, right, master.height))
        destination = output_root / body / f"{view}.png"
        destination.parent.mkdir(parents=True, exist_ok=True)
        fit_sprite(panel).save(destination, optimize=True)

    icon = Image.open(ICON_MASTER).convert("RGBA").resize((1254, 1254), Image.Resampling.LANCZOS)
    icon_destination = ROOT / "assets" / "equipment-ui" / "lastwall-panoply-icon-sheet.png"
    icon_destination.parent.mkdir(parents=True, exist_ok=True)
    icon.save(icon_destination, optimize=True)


if __name__ == "__main__":
    main()
