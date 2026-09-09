"""Structural validation for prepared assets; not a substitute for device/art QA."""
from pathlib import Path
import hashlib,json,re
from PIL import Image
R=Path(__file__).resolve().parents[1]
m=json.loads((R/'data/asset_manifest.json').read_text());em=json.loads((R/'data/emotes.json').read_text());errors=[]
for a in m['assets']:
 p=R/a['file']
 if not p.is_file():errors.append('Missing '+a['file']);continue
 if hashlib.sha256(p.read_bytes()).hexdigest()!=a['sha256']:errors.append('Hash '+a['file'])
 with Image.open(p) as im:
  im.load()
  if im.size!=(a['width'],a['height']):errors.append('Size '+a['file'])
  if a['file'].startswith('assets/emotes/'):
   if im.mode!='RGBA' or im.size!=(128,128):errors.append('Emote contract '+a['file'])
   box=im.getbbox()
   if not box or min(box[0],box[1],128-box[2],128-box[3])<5:errors.append('Emote safe margin '+a['file'])
for name in ['bust_frame','profile_frame']:
 im=Image.open(R/f'assets/chrome/{name}.png').convert('RGBA')
 if im.getpixel((im.width//2,im.height//2))[3]!=0:errors.append('Frame opening '+name)
for f in (R/'src/native').glob('*.ts*'):
 for ref in re.findall(r'require\("([^"]+\.png)"\)',f.read_text()):
  if not (f.parent/ref).resolve().is_file():errors.append('Metro reference '+ref)
if len(em)!=64 or len({e['id'] for e in em})!=64:errors.append('Expected 64 stable IDs')
for e in em:
 if not (R/e['file']).is_file():errors.append('Emote path '+e['id'])
report={'passed':not errors,'preparedPNGs':len(m['assets']),'emoteIDs':len(em),'frameOpeningsChecked':2,'errors':errors,'notValidated':['native device layout','all legacy master art','production transport/authorization']}
print(json.dumps(report,indent=2))
if errors:raise SystemExit(1)
