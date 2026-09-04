"""Pixel-preserving, review-only Ironwarden armor extraction.

Run with Pillow. Coordinates refer to the original 128x160 canvas.
These masks isolate visible armor; they do NOT reconstruct hidden anatomy.
Never auto-register these candidates as approved production assets.
"""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageChops

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'art-review' / 'ironwarden'
SIZE = (128, 160)
# Boots include their soles and upper cuffs, but not the knee armor.
# Back helmets have no visible face and can be isolated without guessing
# which dark front-facing pixels belong to hair, eyes or the helmet rim.
MASKS = {
    ('male', 'front', 'boots'): [[(0, 122), (127, 122), (127, 159), (0, 159)]],
    ('male', 'back', 'boots'): [[(0, 123), (127, 123), (127, 159), (0, 159)]],
    ('female', 'front', 'boots'): [[(0, 121), (127, 121), (127, 159), (0, 159)]],
    ('female', 'back', 'boots'): [[(0, 121), (127, 121), (127, 159), (0, 159)]],
    ('male', 'back', 'helmet'): [[(44, 4), (81, 4), (81, 39), (44, 39)]],
    ('female', 'back', 'helmet'): [[(44, 4), (78, 4), (78, 37), (44, 37)]],
}


def checker():
    canvas = Image.new('RGBA', SIZE, '#253143')
    draw = ImageDraw.Draw(canvas)
    for y in range(0, 160, 8):
        for x in range(0, 128, 8):
            if (x // 8 + y // 8) % 2:
                draw.rectangle((x, y, x + 7, y + 7), fill='#354359')
    return canvas


def main():
    records = []
    rows = []
    for (body, view, slot), polygons in MASKS.items():
        source_path = ROOT / 'assets' / 'first-crafted' / 'ironwarden' / body / f'{view}.png'
        source = Image.open(source_path).convert('RGBA')
        starting = Image.open(ROOT / 'assets' / 'character-runtime' / 'ironwarden' / body / f'{view}.png').convert('RGBA')
        assert source.size == starting.size == SIZE
        mask = Image.new('L', SIZE)
        draw = ImageDraw.Draw(mask)
        for polygon in polygons:
            draw.polygon(polygon, fill=255)
        layer = Image.new('RGBA', SIZE)
        layer.paste(source, (0, 0), mask)
        target = OUT / 'candidates' / body / slot / f'{view}.png'
        target.parent.mkdir(parents=True, exist_ok=True)
        layer.save(target)
        # Exact reconstruction uses replacement, not alpha-over, so original
        # partially transparent edge pixels aren't accidentally doubled.
        remainder = source.copy()
        remainder.paste((0, 0, 0, 0), (0, 0, *SIZE), mask)
        rebuilt = remainder.copy()
        rebuilt.paste(layer, (0, 0), mask)
        assert all(channel.getbbox() is None for channel in ImageChops.difference(rebuilt, source).split())
        alpha_min, alpha_max = layer.getchannel('A').getextrema()
        assert alpha_min == 0 and alpha_max > 0
        for y in range(SIZE[1]):
            for x in range(SIZE[0]):
                assert layer.getpixel((x, y)) == (source.getpixel((x, y)) if mask.getpixel((x, y)) else (0, 0, 0, 0))
        records.append({'body': body, 'view': view, 'slot': slot,
                        'path': str(target.relative_to(ROOT)).replace('\\', '/'),
                        'approved': False, 'sourcePixelPreservation': True,
                        'sourceReconstructionExact': True,
                        'productionReady': False})
        row = Image.new('RGB', (128 * 4 * 4, 160 * 4 + 32), '#182231')
        labels = [f'{body}/{view}: source', f'{slot}: isolated', 'source minus piece (NOT body)', 'starting + piece: alignment test']
        for i, (asset, label) in enumerate(zip([source, layer, remainder, Image.alpha_composite(starting, layer)], labels)):
            preview = Image.alpha_composite(checker(), asset).convert('RGB').resize((512, 640), Image.Resampling.NEAREST)
            row.paste(preview, (i * 512, 32))
            ImageDraw.Draw(row).text((i * 512 + 6, 8), label, fill='white')
        row.save(OUT / f'review-{body}-{view}-{slot}.png')
        rows.append(row)
    atlas = Image.new('RGB', (rows[0].width, sum(row.height for row in rows)))
    for i, row in enumerate(rows):
        atlas.paste(row, (0, i * row.height))
    atlas.save(OUT / 'extraction-contact-sheet.png')
    (OUT / 'extraction-report.json').write_text(json.dumps(records, indent=2) + '\n', encoding='utf-8')
    print(f'PASS: {len(records)} transparent candidates; exact source pixels and reconstruction verified.')
    print('REVIEW ONLY: original pose differs; neutral body and front helmet masks remain unfinished.')


if __name__ == '__main__':
    main()
