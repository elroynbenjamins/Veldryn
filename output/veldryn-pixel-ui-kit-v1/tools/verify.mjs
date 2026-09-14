import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const sharp=(await import(process.env.VELDRYN_SHARP_PATH?pathToFileURL(process.env.VELDRYN_SHARP_PATH).href:'sharp')).default;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(await fs.readFile(path.join(root,'asset-manifest.json'),'utf8'));
const {jobs}=JSON.parse(await fs.readFile(path.join(root,'source/generation-jobs.json'),'utf8'));
try{const refinements=JSON.parse(await fs.readFile(path.join(root,'source/refinements.json'),'utf8'));for(const r of refinements)if(!jobs.some(j=>j.id===r.id))jobs.push(r);}catch(e){if(e.code!=='ENOENT')throw e;}
assert.equal(manifest.assets.length,jobs.length,'Incomplete asset coverage');
assert.deepEqual(new Set(manifest.assets.map(a=>a.id)),new Set(jobs.map(j=>j.id)));
const raw=async p=>sharp(path.join(root,p)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
const checks=[];let pngCount=0,sliceCount=0;
for(const a of manifest.assets){
  const base=await raw(a.file);
  assert.equal(base.info.width,a.width);assert.equal(base.info.height,a.height);
  let transparent=0,visible=0;
  for(let i=0;i<base.data.length;i+=4){
    assert.ok(base.data[i+3]===0||base.data[i+3]===255,`${a.id}: soft alpha`);
    if(base.data[i+3]===0)transparent++;else visible++;
  }
  assert.ok(transparent>0&&visible>0,`${a.id}: transparency/visibility`);
  for(let x=0;x<a.width;x++){
    assert.equal(base.data[x*4+3],0);assert.equal(base.data[((a.height-1)*a.width+x)*4+3],0);
  }
  for(let y=0;y<a.height;y++){
    assert.equal(base.data[y*a.width*4+3],0);assert.equal(base.data[(y*a.width+a.width-1)*4+3],0);
  }
  if(a.id.startsWith('character_card_'))assert.equal(base.data[(Math.floor(a.height/2)*a.width+Math.floor(a.width/2))*4+3],0,'Character frame must be hollow');
  const colors=new Set();for(let i=0;i<base.data.length;i+=4)colors.add(base.data.subarray(i,i+4).toString('hex'));
  assert.ok(colors.size<=256,`${a.id}: palette budget`);
  for(const piece of [a,...a.slices]){
    const first=await raw(piece.files[0].file);
    for(const f of piece.files){
      const bytes=await fs.readFile(path.join(root,f.file));
      assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),f.sha256);
      const actual=await raw(f.file);assert.equal(actual.info.width,f.width);assert.equal(actual.info.height,f.height);
      const expected=await sharp(first.data,{raw:first.info}).resize(f.width,f.height,{kernel:'nearest'}).raw().toBuffer();
      assert.ok(expected.equals(actual.data),`${f.file}: density pixels differ`);pngCount++;
    }
  }
  if(a.insets){
    assert.equal(a.slices.length,a.mode==='9slice'?9:3);
    const reconstruction=Buffer.alloc(a.width*a.height*4),coverage=new Uint8Array(a.width*a.height);
    for(const s of a.slices){
      assert.ok(s.width>0&&s.height>0&&s.left+s.width<=a.width&&s.top+s.height<=a.height);
      const p=await raw(s.files[0].file);
      for(let y=0;y<s.height;y++)for(let x=0;x<s.width;x++){
        const dest=(y+s.top)*a.width+x+s.left;coverage[dest]++;
        p.data.copy(reconstruction,dest*4,(y*s.width+x)*4,(y*s.width+x+1)*4);
      }
    }
    assert.ok(coverage.every(n=>n===1),`${a.id}: overlapping or missing slice pixels`);
    assert.ok(reconstruction.equals(base.data),`${a.id}: slice reconstruction mismatch`);sliceCount++;
  }
  checks.push({id:a.id,status:'PASS',width:a.width,height:a.height,colors:colors.size,transparentPixels:transparent,opaquePixels:visible,slices:a.slices.length});
}
const registry=await fs.readFile(path.join(root,'implementation/assets.ts'),'utf8');
for(const m of registry.matchAll(/require\('([^']+)'\)/g))await fs.access(path.resolve(root,'implementation',m[1]));
const report={status:'PASS',assetCount:checks.length,pngCount,slicedAssetCount:sliceCount,
  checks:['requested asset coverage','PNG decoding/dimensions','binary alpha/transparent perimeter','hollow character frames','256-color budget','SHA-256 values','exact nearest-neighbor 2x/3x pixels','slice bounds and exact reconstruction','literal Metro require paths'],
  limitations:['No physical Android or iOS runtime was available for rendering verification.','Native text scaling, hit targets and app behavior require integration checks.'],assets:checks};
await fs.mkdir(path.join(root,'qa'),{recursive:true});
await fs.writeFile(path.join(root,'qa/asset-validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:report.status,assetCount:checks.length,pngCount,slicedAssetCount:sliceCount}));
