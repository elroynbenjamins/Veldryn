from pathlib import Path
import zipfile,json,hashlib
root=Path(r'C:/Users/elroy/OneDrive/Documents/ChatGPT/Veldryn')
out=root/'output/visual-polish-v5'
archive=root/'output/VELDRYN_Visual_Polish_v5.zip'
with zipfile.ZipFile(root/'output/VELDRYN_Visual_Polish_v4.zip') as z:
    assert z.testzip() is None
    entries={n:z.read(n) for n in z.namelist() if n!='MANIFEST.json'}
for name in ['PROGRESS.md','NATIVE_QA.md','VELDRYN_UI_ASSET_SPEC.md']:
    entries[name.replace('.md','_v4.md')]=entries.pop(name)
entries['review-v4.html']=entries.pop('review.html').replace(b'Twenty uncommon ingredients still use neutral markers.',b'The remaining ingredient markers were replaced in v5.')
def add(src,name):entries[name]=src.read_bytes()
for name in ['src/theme/ingredient-assets.ts','src/theme/resource-assets.ts','src/components/ItemCard.tsx','src/dev/NativeVisualReview.tsx']:
    add(root/'apps/mobile'/name,'implementation/apps/mobile/'+name)
for src in (root/'apps/mobile/assets/ingredient-icons-v1').glob('*.png'):
    add(src,'implementation/'+src.relative_to(root).as_posix())
    if '@3x' in src.name:add(src,'ingredient-runtime/'+src.name)
for src in (out/'sources').glob('*.png'):add(src,'ingredient-sources/'+src.name)
for name in ['PROGRESS.md','NATIVE_QA.md','VELDRYN_UI_ASSET_SPEC.md','review.html','ingredient-review.png','asset-audit.json','recipe-art-audit.json','build-verification.json']:
    add(out/name,name)
add(out/'prompts.json','ingredient-prompts.json')
for src in (out/'native-v5').glob('ingredients-*.png'):add(src,'native-v5/'+src.name)
assert len(list((out/'sources').glob('*.png')))==20
assert len(list((root/'apps/mobile/assets/ingredient-icons-v1').glob('*.png')))==60
assert len(list((out/'native-v5').glob('ingredients-*.png')))==7
manifest={n:{'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()} for n,b in sorted(entries.items())}
entries['MANIFEST.json']=json.dumps(manifest,indent=2).encode()
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for n,b in sorted(entries.items()):z.writestr(n,b)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    for n,meta in manifest.items():assert hashlib.sha256(z.read(n)).hexdigest()==meta['sha256']
    result={'archive':archive.name,'entries':len(z.namelist()),'bytes':archive.stat().st_size,'crc':'passed','entry_sha256':'all passed','sha256':hashlib.sha256(archive.read_bytes()).hexdigest()}
(out/'archive-integrity.json').write_text(json.dumps(result,indent=2))
archive.with_suffix('.zip.sha256').write_text(result['sha256']+'  '+archive.name+'\n')
print(json.dumps(result,indent=2))
