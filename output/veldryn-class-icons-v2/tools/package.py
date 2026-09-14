from pathlib import Path
import hashlib
import json
import zipfile

root=Path(__file__).resolve().parent.parent
assert json.loads((root/'qa/assets.json').read_text())['status']=='PASS'
files=sorted(p for p in root.rglob('*') if p.is_file() and p.name!='CHECKSUMS.sha256' and '__pycache__' not in p.parts)
digest=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
(root/'CHECKSUMS.sha256').write_text(''.join(f'{digest(p)}  {p.relative_to(root).as_posix()}\n' for p in files),encoding='utf-8')
files.append(root/'CHECKSUMS.sha256')
target=root.parent/'VELDRYN_Class_Icons_v2.zip'
with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for p in files:z.write(p,(Path(root.name)/p.relative_to(root)).as_posix())
with zipfile.ZipFile(target) as z:
    assert z.testzip() is None
    assert len(z.namelist())==len(set(z.namelist()))==len(files)
    for p in files:
        n=(Path(root.name)/p.relative_to(root)).as_posix()
        assert hashlib.sha256(z.read(n)).hexdigest()==digest(p)
    assert all(not n.startswith('/') and '..' not in Path(n).parts for n in z.namelist())
report={'status':'PASS','archive':target.name,'bytes':target.stat().st_size,'entries':len(files),'crc':'PASS','member_sha256':'PASS','sha256':digest(target)}
target.with_suffix('.verification.json').write_text(json.dumps(report,indent=2)+'\n')
target.with_suffix('.sha256').write_text(f"{report['sha256']}  {target.name}\n")
print(json.dumps(report))
