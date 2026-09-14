from pathlib import Path
import hashlib,json,zipfile

review=Path(__file__).resolve().parent
root=review.parent.parent
app=root/'apps/mobile'
files=set(review.glob('*'))
files={p for p in files if p.is_file()}
for name in ['src/screens/ClassSelectScreen.tsx','src/components/creation/CreationChrome.tsx','src/components/creation/ClassHeroCarousel.tsx','src/theme/class-creation-art.ts','src/theme/creation-ui-assets.ts','src/theme/class-emblem-assets.ts']:
    files.add(app/name)
for folder in ['assets/creation-ui-v2','assets/class-emblems-v2','assets/character-base-v1','assets/events-startup-v1/branding']:
    files.update(p for p in (app/folder).rglob('*') if p.is_file())
for skin in ['aster-iron','lastwall-panoply','mournchain-harness','thread-of-dawn','regretwalker','lanternsteel-array','runespark-adept','gloamstep-regalia','resonant-tempest']:
    for body in ['male','female']:
        files.add(app/f'assets/character-runtime/accepted-front-v1/{skin}/{body}-front.png')
target=root/'output/VELDRYN_Character_Creation_v2.zip'
prefix='veldryn-character-creation-v2/'
digest=lambda b:hashlib.sha256(b).hexdigest()
members={prefix+p.relative_to(root).as_posix():p.read_bytes() for p in sorted(files)}
members[prefix+'README.md']=(review/'README.md').read_bytes()
members[prefix+'CHECKSUMS.sha256']=''.join(f'{digest(b)}  {name}\n' for name,b in members.items()).encode()
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for name,b in members.items():z.writestr(name,b)
with zipfile.ZipFile(target) as z:
    assert z.testzip() is None
    assert len(z.namelist())==len(set(z.namelist()))==len(members)
    for name,b in members.items():assert digest(z.read(name))==digest(b)
    assert all(not name.startswith('/') and '..' not in Path(name).parts for name in z.namelist())
report={'status':'PASS','archive':target.name,'entries':len(members),'bytes':target.stat().st_size,'crc':'PASS','member_sha256':'PASS','sha256':digest(target.read_bytes())}
target.with_suffix('.verification.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
