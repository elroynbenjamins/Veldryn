from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
styles=['bald','bob','messy','wavy','braid','bun'];views=['front','back']
sheet=Image.new('RGB',(len(styles)*256,len(views)*352),'#17283b');draw=ImageDraw.Draw(sheet)
for col,style in enumerate(styles):
 for row,view in enumerate(views):
  body=Image.open(ROOT/'assets'/'character-customization'/'skin'/'warm'/'female'/f'{view}.png').convert('RGBA')
  if style!='bald':body.alpha_composite(Image.open(ROOT/'assets'/'character-customization'/'hair'/style/'dark-brown'/'female'/f'{view}.png').convert('RGBA'))
  sheet.paste(body.resize((256,320),Image.Resampling.NEAREST),(col*256,row*352+32),body.resize((256,320),Image.Resampling.NEAREST))
  draw.text((col*256+8,row*352+8),f'{style} / {view}',fill='white')
sheet.save(ROOT/'art-review'/'customization-v1.png')
