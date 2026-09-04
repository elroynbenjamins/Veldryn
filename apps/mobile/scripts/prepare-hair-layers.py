"""Prepare only visually identified ImageGen hair sources as runtime overlays."""
from collections import deque
from pathlib import Path
import colorsys
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
COLORS={'black':(36,34,33),'dark-brown':(73,51,34),'chestnut':(130,80,46),'blonde':(213,175,98),'auburn':(154,68,39),'white':(230,221,202),'silver':(174,181,189),'dark-blue':(41,62,89)}
STYLES={'bob':('cropped',26,3),'messy':('messy',34,3),'wavy':('wavy',48,3),'braid':('braid',55,3),'bun':('bun',40,-3)}
for style,(source_name,target_height,y_offset) in STYLES.items():
 source=Image.open(ROOT/'assets'/'character-customization'/'hair-sources'/f'{source_name}.png').convert('RGBA')
 for index,(body,view) in enumerate((('male','front'),('male','back'),('female','front'),('female','back'))):
  cell=source.crop((round(index*source.width/4),0,round((index+1)*source.width/4),source.height)); px=cell.load()
  # Remove edge-connected white/checker or black presentation backgrounds.
  q=deque([(x,y) for x in range(cell.width) for y in (0,cell.height-1)]+[(x,y) for y in range(cell.height) for x in (0,cell.width-1)]);seen=set()
  while q:
   x,y=q.popleft()
   if (x,y) in seen or not(0<=x<cell.width and 0<=y<cell.height):continue
   seen.add((x,y));r,g,b,a=px[x,y]
   neutral=max(r,g,b)-min(r,g,b)<22 and (min(r,g,b)>150 or max(r,g,b)<18)
   if not neutral:continue
   px[x,y]=(0,0,0,0);q.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
  bbox=cell.getchannel('A').getbbox();assert bbox
  sprite=cell.crop(bbox);sprite=sprite.resize((round(sprite.width*target_height/sprite.height),target_height),Image.Resampling.NEAREST)
  for color,target in COLORS.items():
   tinted=sprite.copy();tp=tinted.load();th,ts,tv=colorsys.rgb_to_hsv(*(c/255 for c in target))
   for y in range(tinted.height):
    for x in range(tinted.width):
     r,g,b,a=tp[x,y]
     if not a:continue
     h,s,v=colorsys.rgb_to_hsv(r/255,g/255,b/255);shade=max(.15,min(1.4,v/.35))
     nr,ng,nb=colorsys.hsv_to_rgb(th,min(1,max(.2,ts)*(.7+.3*s)),min(1,tv*shade));tp[x,y]=(round(nr*255),round(ng*255),round(nb*255),a)
   canvas=Image.new('RGBA',(128,160));canvas.alpha_composite(tinted,((128-tinted.width)//2,y_offset))
   out=ROOT/'assets'/'character-customization'/'hair'/style/color/body;out.mkdir(parents=True,exist_ok=True);canvas.save(out/f'{view}.png')
print(f'PASS: {len(STYLES)*len(COLORS)*4} hair overlays, 128x160 RGBA')
