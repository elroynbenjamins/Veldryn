"""Normalize the generated shared bodies; retain the original sheet for provenance.

The generator returned an RGB checkerboard, not alpha. Remove only edge-connected
near-neutral bright pixels; enclosed eye highlights and all brown artwork remain.
Requires Pillow. No existing class sprites are modified.
"""
from collections import deque
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'shared-body-v1'
source = Image.open(OUT / 'source-sheet.png').convert('RGBA')
preview = Image.new('RGB', (512 * 4, 640 + 32), '#17283b')
for index, (body, view) in enumerate((('male', 'front'), ('male', 'back'), ('female', 'front'), ('female', 'back'))):
    cell = source.crop((round(index * source.width / 4), 0, round((index + 1) * source.width / 4), source.height))
    pixels = cell.load()
    queue = deque([(x, y) for x in range(cell.width) for y in (0, cell.height - 1)] + [(x, y) for y in range(cell.height) for x in (0, cell.width - 1)])
    seen = set()
    while queue:
        x, y = queue.popleft()
        if (x, y) in seen or not (0 <= x < cell.width and 0 <= y < cell.height):
            continue
        seen.add((x, y))
        r, g, b, a = pixels[x, y]
        if min(r, g, b) < 100 or max(r, g, b) - min(r, g, b) > 25:
            continue
        pixels[x, y] = (0, 0, 0, 0)
        queue.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))
    bounds = cell.getchannel('A').getbbox()
    assert bounds is not None
    sprite = cell.crop(bounds)
    # One canonical height/baseline. Preserve each body's natural aspect ratio.
    sprite = sprite.resize((round(sprite.width * 148 / sprite.height), 148), Image.Resampling.NEAREST)
    assert sprite.width < 100
    canvas = Image.new('RGBA', (128, 160))
    canvas.paste(sprite, ((128 - sprite.width) // 2, 6))
    target = OUT / body
    target.mkdir(parents=True, exist_ok=True)
    canvas.save(target / f'{view}.png')
    assert canvas.getchannel('A').getextrema() == (0, 255)
    assert canvas.getchannel('A').getbbox()[1::2] == (6, 154)
    backdrop = Image.new('RGBA', canvas.size, '#17283b')
    backdrop.alpha_composite(canvas)
    preview.paste(backdrop.convert('RGB').resize((512, 640), Image.Resampling.NEAREST), (512 * index, 32))
    ImageDraw.Draw(preview).text((512 * index + 10, 8), f'{body} / {view} - 128x160', fill='white')
    print(f'PASS {body}/{view}: 128x160 RGBA, baseline 154, bounds {canvas.getchannel("A").getbbox()}')
preview.save(OUT / 'preview.png')
