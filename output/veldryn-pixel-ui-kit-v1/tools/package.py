"""Create and verify the one-file handoff. Python standard library only."""
from pathlib import Path
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parent.parent
target = root.parent / 'VELDRYN_Pixel_UI_Kit_v1.zip'
validation = json.loads((root / 'qa/asset-validation.json').read_text(encoding='utf-8'))
assert validation['status'] == 'PASS', 'Run asset verification first'
stretch = json.loads((root / 'qa/stretch-validation.json').read_text(encoding='utf-8'))
assert stretch['status'] == 'PASS', 'Run stretch verification first'
files = sorted(p for p in root.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.name != 'CHECKSUMS.sha256')
digests = {p.relative_to(root).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
(root / 'CHECKSUMS.sha256').write_text(''.join(f'{v}  {k}\n' for k, v in digests.items()), encoding='utf-8')
files.append(root / 'CHECKSUMS.sha256')
with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for p in files:
        archive.write(p, (Path(root.name) / p.relative_to(root)).as_posix())
with zipfile.ZipFile(target) as archive:
    assert archive.testzip() is None, 'ZIP CRC error'
    names = archive.namelist()
    assert len(names) == len(set(names)) == len(files), 'Missing/duplicate archive entries'
    for p in files:
        name = (Path(root.name) / p.relative_to(root)).as_posix()
        assert hashlib.sha256(archive.read(name)).digest() == hashlib.sha256(p.read_bytes()).digest(), name
    assert all(not n.startswith('/') and '..' not in Path(n).parts for n in names)
digest = hashlib.sha256(target.read_bytes()).hexdigest()
report = {'status': 'PASS', 'archive': target.name, 'bytes': target.stat().st_size,
          'entries': len(files), 'crc': 'PASS', 'member_sha256': 'PASS', 'sha256': digest}
target.with_suffix('.verification.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
target.with_suffix('.sha256').write_text(f'{digest}  {target.name}\n', encoding='utf-8')
print(json.dumps(report))
