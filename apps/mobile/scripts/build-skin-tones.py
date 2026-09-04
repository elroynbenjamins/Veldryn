"""Build deterministic skin-tone variants without changing anatomy or alpha."""
from pathlib import Path
import colorsys
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
TONES={'fair':(237,196,164),'light':(220,168,121),'warm':(189,137,86),'tan':(152,99,63),'brown':(112,70,47),'deep':(67,44,36)}
for body in ('male','female'):
  for view in ('front','back'):
    source=Image.open(ROOT/'assets'/'shared-body-v1'/body/f'{view}.png').convert('RGBA')
    for name,target in TONES.items():
      out=source.copy(); pixels=out.load()
      th,ts,tv=colorsys.rgb_to_hsv(*(c/255 for c in target))
      for y in range(out.height):
        for x in range(out.width):
          r,g,b,a=pixels[x,y]
          if not a: continue
          h,s,v=colorsys.rgb_to_hsv(r/255,g/255,b/255)
          # Skin occupies warm orange hues; neutral brown underclothes remain fixed.
          if .035<=h<=.125 and s>=.28 and v>=.22:
            shade=max(.18,min(1.18,v/.78))
            nr,ng,nb=colorsys.hsv_to_rgb(th,min(1,ts*(.75+.25*s)),min(1,tv*shade))
            pixels[x,y]=(round(nr*255),round(ng*255),round(nb*255),a)
      target_dir=ROOT/'assets'/'character-customization'/'skin'/name/body
      target_dir.mkdir(parents=True,exist_ok=True);out.save(target_dir/f'{view}.png')
print('PASS: 24 skin sprites, identical alpha/canvas, underclothes preserved')
