from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'assets'/'equipment-sources'/'aster-iron-helmet-v1'
OUT=ROOT/'assets'/'equipment-layers'/'aster-iron-helmet-v1'
OUT.mkdir(parents=True,exist_ok=True)

def prepare(source:Path,body:str,view:str):
    image=Image.open(source).convert('RGBA')
    alpha=image.getchannel('A').point(lambda value:255 if value>100 else 0)
    box=alpha.getbbox()
    if not box: raise RuntimeError(f'No helmet found in {source}')
    helmet=image.crop(box)
    width=34 if body=='male' else 32
    height=31 if view=='front' else 29
    helmet=helmet.resize((width,height),Image.Resampling.NEAREST)
    canvas=Image.new('RGBA',(128,160),(0,0,0,0))
    canvas.alpha_composite(helmet,((128-width)//2,2 if view=='front' else 3))
    folder=OUT/body
    folder.mkdir(parents=True,exist_ok=True)
    canvas.save(folder/f'{view}.png')

for body in ('male','female'):
    prepare(SOURCE/'front-master.png',body,'front')
    prepare(SOURCE/'back-master.png',body,'back')
print('PASS: four Aster-Iron Helm layers prepared on transparent 128x160 canvases')
