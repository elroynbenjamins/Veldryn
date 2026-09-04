from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'art-review' / 'ironwarden'
OUT.mkdir(parents=True, exist_ok=True)
for body in ('male', 'female'):
    for view in ('front', 'back'):
        sheet = Image.new('RGB', (128*6*2, 160*6+48), '#26374b')
        draw = ImageDraw.Draw(sheet)
        for i, group in enumerate(('character-runtime', 'first-crafted')):
            source = Image.open(ROOT / 'assets' / group / 'ironwarden' / body / f'{view}.png').convert('RGBA')
            sheet.paste(source.resize((768,960), Image.Resampling.NEAREST), (i*768,48), source.resize((768,960), Image.Resampling.NEAREST))
            draw.text((i*768+10,8), f'{group} / {body} / {view}', fill='white')
            for x in range(0,128,8):
                draw.line((i*768+x*6,48,i*768+x*6,1008), fill='#526174', width=1)
                draw.text((i*768+x*6+2,30),str(x),fill='white')
            for y in range(0,160,8):
                draw.line((i*768,48+y*6,(i+1)*768,48+y*6),fill='#526174',width=1)
                draw.text((i*768+2,48+y*6+2),str(y),fill='white')
        sheet.save(OUT / f'sources-{body}-{view}.png')
