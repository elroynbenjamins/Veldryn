from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'assets'/'equipment-sources'/'aster-iron-chest-v1'
OUT=ROOT/'assets'/'equipment-layers'/'aster-iron-chest-v1'
OUT.mkdir(parents=True,exist_ok=True)

def cut(source:Path,body:str,view:str):
    image=Image.open(source).convert('RGBA')
    alpha=image.getchannel('A').point(lambda value:255 if value>100 else 0)
    box=alpha.getbbox()
    if not box: raise RuntimeError(f'No visible armor in {source}')
    armor=image.crop(box)
    target_width=64 if body=='male' else 58
    target_height=67 if view=='front' else 63
    armor=armor.resize((target_width,target_height),Image.Resampling.NEAREST)
    canvas=Image.new('RGBA',(128,160),(0,0,0,0))
    x=(128-target_width)//2
    y=25 if view=='front' else 27
    canvas.alpha_composite(armor,(x,y))
    folder=OUT/body
    folder.mkdir(parents=True,exist_ok=True)
    canvas.save(folder/f'{view}.png')

for body in ('male','female'):
    cut(SOURCE/'front-master.png',body,'front')
    cut(SOURCE/'back-master.png',body,'back')
print('PASS: four Aster-Iron Cuirass layers prepared on 128x160 transparent canvases')
