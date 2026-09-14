import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
const sharp=(await import(process.env.VELDRYN_SHARP_PATH?pathToFileURL(process.env.VELDRYN_SHARP_PATH).href:'sharp')).default;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const m=JSON.parse(await fs.readFile(path.join(root,'asset-manifest.json'),'utf8'));
assert.equal(m.assets.length,9);const results=[];
for(const a of m.assets){
  const base=await sharp(path.join(root,a.files[0].file)).ensureAlpha().raw().toBuffer();
  for(const f of a.files){
    const bytes=await fs.readFile(path.join(root,f.file));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),f.sha256);
    const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(info.width,f.width);assert.equal(info.height,f.height);
    const expected=await sharp(base,{raw:{width:a.width,height:a.height,channels:4}}).resize(f.width,f.height,{kernel:'nearest'}).raw().toBuffer();
    assert.ok(expected.equals(data),`${a.id}: density expansion`);
  }
  let visible=0,transparent=0;
  for(let p=0;p<base.length;p+=4){assert.ok(base[p+3]===0||base[p+3]===255);if(base[p+3])visible++;else transparent++;}
  assert.ok(visible>0);
  if(a.kind==='background')assert.equal(transparent,0);
  else{
    assert.ok(transparent>0);
    for(let x=0;x<a.width;x++){assert.equal(base[x*4+3],0);assert.equal(base[((a.height-1)*a.width+x)*4+3],0);}
    for(let y=0;y<a.height;y++){assert.equal(base[y*a.width*4+3],0);assert.equal(base[(y*a.width+a.width-1)*4+3],0);}
    if(a.kind==='border')for(let y=36;y<144;y++)for(let x=64;x<256;x++)assert.equal(base[(y*a.width+x)*4+3],0,`${a.id}: avatar reading area obstructed`);
  }
  results.push({id:a.id,status:'PASS',visible,transparent});
}
const logo=await sharp(path.join(root,'assets/branding/veldryn_logo.png')).ensureAlpha().raw().toBuffer();
for(const scale of [1,2,3]){
  const f=path.join(root,`assets/branding/veldryn_logo${scale===1?'':`@${scale}x`}.png`);
  const {data,info}=await sharp(f).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(info.width,288*scale);assert.equal(info.height,96*scale);
  const expected=await sharp(logo,{raw:{width:288,height:96,channels:4}}).resize(info.width,info.height,{kernel:'nearest'}).raw().toBuffer();
  assert.ok(expected.equals(data),'Reused logo density expansion');
}
const report={status:'PASS',newAssets:9,runtimePngs:30,checks:['dimensions and decoding','SHA-256','exact nearest-neighbor density expansion including reused logo','opaque backgrounds','binary alpha and transparent perimeter','clear profile-center rectangle'],results};
await fs.mkdir(path.join(root,'qa'),{recursive:true});await fs.writeFile(path.join(root,'qa/assets.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({status:'PASS',newAssets:9,runtimePngs:30}));
