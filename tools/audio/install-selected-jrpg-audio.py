#!/usr/bin/env python3
"""Install the approved preview audio from the ZIP delivered in ChatGPT.

Run only on the feature branch:
  python tools/audio/install-selected-jrpg-audio.py /path/to/Veldryn_Music_and_Crafting_SFX_Integration_Review.zip
This is an asset installer, not a rights clearance or a release command.
"""
from __future__ import annotations
import argparse, json, zipfile, hashlib
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
MOBILE=ROOT/'apps'/'mobile'
MUSIC=('asterfall','sunscar','frostmarch','dungeon')
SFX=('smith_hammer_1','smith_hammer_2','smelt_bellows','smelt_pour',
     'forge_ignite','forge_quench','woodwork_plane','tailor_stitch',
     'alchemy_bubble','cooking_sizzle')
NAME='Veldryn_Music_and_Crafting_SFX_Integration_Review.zip'

def replace_once(source,old,new,path):
    if source.count(old)!=1:
        raise RuntimeError(f'Expected exactly one occurrence in {path}: {old[:80]}')
    return source.replace(old,new,1)

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('pack',type=Path,help='Veldryn audio review ZIP')
    p.add_argument('--dry-run',action='store_true')
    args=p.parse_args()
    pack=args.pack.resolve()
    branch='feature/selected-jrpg-music-crafting-audio'
    # Assert branch when working in git to avoid overwriting published assets.
    import subprocess
    try:
        active=subprocess.check_output(['git','-C',str(ROOT),'branch','--show-current'],text=True).strip()
    except (subprocess.CalledProcessError,FileNotFoundError):
        active=''
    if active!=branch:
        raise SystemExit(f'Run on {branch}, not {active or "(unknown)"}')

    with zipfile.ZipFile(pack) as z:
        manifest_src=json.loads((MOBILE/'assets/audio/manifest.json').read_text())
        asset_file=MOBILE/'src/theme/audio-assets.ts'
        asset_map=asset_file.read_text()
        test_file=MOBILE/'tests/game-audio.ts'
        tests=test_file.read_text()
        gen_file=ROOT/'tools/audio/generate-game-audio.py'
        gen=gen_file.read_text()
        songs=json.loads(z.read('integration/music_manifest.json'))
        sounds=json.loads(z.read('integration/sfx_manifest.json'))
        staged={}
        for name in MUSIC:
            data=z.read(f'music/{name}.ogg')
            meta=songs[name]
            if hashlib.sha256(data).hexdigest()!=meta['sha256']:
                raise RuntimeError('Hash mismatch: '+name)
            target=MOBILE/'assets/audio/music'/f'{name}.ogg'
            staged[target]=data
            record={k:meta[k] for k in ('bpm','seconds','rights_status','source_provenance')}
            record.update({'selection':meta['track_title'],'file_ext':'ogg'})
            manifest_src['music'][name]=record
            asset_map=replace_once(asset_map,f"music/{name}.mp3",f"music/{name}.ogg",asset_file)
        for name in SFX:
            data=z.read(f'sfx/{name}.mp3')
            target=MOBILE/'assets/audio/sfx'/f'{name}.mp3'
            staged[target]=data
            meta=sounds[name]
            manifest_src['sfx'][name]={'seconds':meta['seconds'],'volume':meta['volume'],
                'source':meta['source']}
        # Existing procedural cue entries can be replaced by the reviewed ZIP.
        # Never insert duplicate Metro asset keys after the synthesis workflow ran.
        missing=[]
        for name in sorted(SFX):
            line=f"  {name}:{{source:require('../../assets/audio/sfx/{name}.mp3') as AudioSource,volume:{sounds[name]['volume']}}},"
            original=next((row for row in asset_map.splitlines()
                if row.lstrip().startswith(name+':{source:')),None)
            if original:
                asset_map=replace_once(asset_map,original,line,asset_file)
            else:
                missing.append(line+'\n')
        if missing:
            asset_map=replace_once(asset_map,'} as const;\nexport const MUSIC_TRACK_ASSETS={',
                ''.join(missing)+'} as const;\nexport const MUSIC_TRACK_ASSETS={',asset_file)
        # Test contracts distinguish four OGG tracks; leave unrelated MP3 checks intact.
        tests=replace_once(tests,
           "const file='assets/audio/'+kind+'/'+name+'.mp3';",
           "const ext=kind==='music'&&['asterfall','sunscar','frostmarch','dungeon'].includes(name)?'ogg':'mp3';\n  const file='assets/audio/'+kind+'/'+name+'.'+ext;",
           test_file)
        tests=replace_once(tests,
           "assetMap.includes(\"require('../../assets/audio/\"+kind+'/'+name+\".mp3')\")",
           "assetMap.includes(\"require('../../assets/audio/\"+kind+'/'+name+'.'+ext+\"')\")",
           test_file)
        tests=replace_once(tests,
           "assert.ok(rows[name].seconds>=20,'Music loop too short to avoid fatigue: '+name+' '+size);",
           "assert.ok(rows[name].seconds>=(name==='dungeon'?16:19),'Selected loop truncated: '+name+' '+size);",
           test_file)
        tests=replace_once(tests,
           "assert.equal(fs.readdirSync('assets/audio/'+kind).filter(f=>f.endsWith('.mp3')).length,Object.keys(rows).length,'Untracked '+kind+' files');",
           "assert.equal(fs.readdirSync('assets/audio/'+kind).filter(f=>f.endsWith('.mp3')||f.endsWith('.ogg')).length,Object.keys(rows).length,'Untracked '+kind+' files');",
           test_file)
        # Asterfall has a new review version and should not match the earlier approved release version.
        tests=replace_once(tests,"{town:'Lanterns at Hearth',asterfall:'First Light'}",
                          "{town:'Lanterns at Hearth'}",test_file)
        tests += """
// New selected music is pending final rights clearance; never flag the sources as CC0.
for(const id of ['asterfall','sunscar','frostmarch','dungeon']){
 assert.ok((manifest.music[id] as {rights_status?:string}).rights_status==='REVIEW_ONLY_PENDING_TIMGM6MB_GPL_REVIEW',
  'Selected music license marker unexpectedly changed: '+id);
}
"""
        # Existing generator refuses to regenerate selected music by default.
        # This installer preserves that behavior, plus extra SFX rows on --only sfx.
        needle="if not manifest[k]: manifest[k] = old.get(k, {})"
        gen=replace_once(gen,needle,needle+"\n    if args.only == 'sfx':\n        for key, row in old.get('sfx', {}).items():\n            if row.get('source') == 'original procedural synthesis, no third-party samples':\n                manifest['sfx'][key] = row",gen_file)
        # Keep generated imports pointing to the new .ogg files after future SFX re-renders.
        old_asset_ref="../../assets/audio/{kind}/{name}.mp3"
        new_asset_ref="../../assets/audio/{kind}/{name}.{manifest[kind][name].get('file_ext', 'mp3')}"
        gen=replace_once(gen,old_asset_ref,new_asset_ref,gen_file)
        staged[MOBILE/'assets/audio/manifest.json']=(json.dumps(manifest_src,indent=2,sort_keys=True)+'\n').encode()
        staged[asset_file]=asset_map.encode()
        staged[test_file]=tests.encode()
        staged[gen_file]=gen.encode()
        if args.dry_run:
            print('Validated:',len(MUSIC),'music tracks,',len(SFX),'effects. No changes.')
            return
        for target,data in staged.items():
            target.parent.mkdir(parents=True,exist_ok=True)
            target.write_bytes(data)
        for name in MUSIC:
            old=MOBILE/'assets/audio/music'/f'{name}.mp3'
            if old.exists():old.unlink()
        print('Staged four selected music OGGs and ten crafting MP3s.')
        print('Review-only: music requires license clearance before production release.')

if __name__=='__main__':
    main()
