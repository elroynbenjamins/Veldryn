import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
const sharp=(await import(process.env.VELDRYN_SHARP_PATH?pathToFileURL(process.env.VELDRYN_SHARP_PATH).href:'sharp')).default;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const m=JSON.parse(await fs.readFile(path.join(root,'asset-manifest.json'),'utf8'));
const jobs=JSON.parse(await fs.readFile(path.join(root,'source/jobs.json'),'utf8'));
assert.deepEqual(new Set(m.assets.map(a=>a.classId)),new Set(jobs.map(j=>j.classId)));
assert.equal(m.assets.length,9);let count=0;const checks=[];
for(const a of m.assets)for(const v of a.variants){
  const base=await sharp(path.join(root,v.files[0].file)).ensureAlpha().raw().toBuffer();
  const colors=new Set();let visible=0;
  for(let y=0;y<v.size;y++)for(let x=0;x<v.size;x++){
    const p=(y*v.size+x)*4,alpha=base[p+3];assert.ok(alpha===0||alpha===255,`${a.id}: soft alpha`);
    if(alpha)visible++;
    if(x<v.gutter||y<v.gutter||x>=v.size-v.gutter||y>=v.size-v.gutter)assert.equal(alpha,0,`${a.id}: clipped safe gutter`);
    colors.add(base.subarray(p,p+4).toString('hex'));
  }
  assert.ok(visible>v.size*v.size*.1&&visible<v.size*v.size*.9);assert.ok(colors.size<=256);
  for(const f of v.files){
    const bytes=await fs.readFile(path.join(root,f.file));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),f.sha256);
    const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(info.width,f.width);assert.equal(info.height,f.height);
    const expected=await sharp(base,{raw:{width:v.size,height:v.size,channels:4}}).resize(f.width,f.height,{kernel:'nearest'}).raw().toBuffer();
    assert.ok(data.equals(expected),`${a.id}: nearest density expansion`);count++;
  }
  checks.push({id:a.id,variant:v.kind,status:'PASS',colors:colors.size,visiblePixels:visible});
}
assert.equal(count,54);
const report={status:'PASS',classes:9,pngCount:count,checks:['coverage of canonical classes','PNG dimensions and SHA-256','true binary transparency','unclipped safe gutters','256-color budget','exact density expansion'],assets:checks};
await fs.mkdir(path.join(root,'qa'),{recursive:true});await fs.writeFile(path.join(root,'qa/assets.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:'PASS',classes:9,pngCount:count}));
