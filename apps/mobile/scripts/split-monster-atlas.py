from pathlib import Path
from collections import deque
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
ids=['MOSS_RAT','FIELD_WISP','ROADSIDE_BOAR','SILVERFIN_SWARM','IRONWOOD_WOLF','VENOM_WEAVER','THORNLING','BRIAR_HUSK','MIRE_HERON','FOREST_TROLL','ANCIENT_TREANT','CAVE_SKITTER','IRONBACK_MOLE','ECHO_BAT','RUNEBOUND_MINER','GLOAM_MITE','LANTERN_WRETCH','DROWNED_PILGRIM','OATHBOUND_SQUIRE','BANNER_SHADE','FALLEN_SENTINEL','OATHGLASS_REVENANT','FALLEN_KNIGHT']
source=Image.open(ROOT/'assets'/'monsters'/'source-atlas-v1.png').convert('RGB')
for index,id in enumerate(ids):
 col,row=index%5,index//5
 box=(round(col*source.width/5)+2,round(row*source.height/5)+2,round((col+1)*source.width/5)-2,round((row+1)*source.height/5)-2)
 portrait=source.crop(box).resize((192,192),Image.Resampling.NEAREST).convert('RGBA');px=portrait.load()
 q=deque([(x,y) for x in range(192) for y in (0,191)]+[(x,y) for y in range(192) for x in (0,191)]);seen=set()
 while q:
  x,y=q.popleft()
  if (x,y) in seen or not(0<=x<192 and 0<=y<192):continue
  seen.add((x,y));r,g,b,a=px[x,y]
  if min(r,g,b)<175 or max(r,g,b)-min(r,g,b)>18:continue
  px[x,y]=(0,0,0,0);q.extend(((x-1,y),(x+1,y),(x,y-1),(x,y+1)))
 portrait.save(ROOT/'assets'/'monsters'/f'{id.lower()}.png',optimize=True)
 assert portrait.getchannel('A').getextrema()==(0,255)
print(f'PASS: {len(ids)} distinct transparent 192x192 pixel portraits')
