import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
const sharp=(await import(process.env.VELDRYN_SHARP_PATH?pathToFileURL(process.env.VELDRYN_SHARP_PATH).href:'sharp')).default;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),workspace=path.resolve(root,'../..');
const read=async p=>JSON.parse(await fs.readFile(path.join(root,p),'utf8'));
const write=async(p,data)=>{await fs.mkdir(path.dirname(path.join(root,p)),{recursive:true});await fs.writeFile(path.join(root,p),data);};
const jobs=await read('source/jobs.json'),results=await read('source/results.json');
const manifest={version:'2.0.0',assets:[]};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
for(const j of jobs){
  const r=results.find(r=>r.id===j.id);if(!r)continue;
  const sourceRel=`source/originals/${j.id}-${path.basename(r.source).slice(5,13)}.png`;
  let source;try{source=await fs.readFile(path.join(root,sourceRel));}catch{source=await fs.readFile(r.source);await write(sourceRel,source);}
  const meta=await sharp(source).metadata();assert.ok(meta.hasAlpha,`${j.id}: generate actual alpha transparency`);
  const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let l=info.width,t=info.height,rgt=-1,b=-1,transparent=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    if(data[(y*info.width+x)*4+3]<128){transparent++;continue;}
    l=Math.min(l,x);t=Math.min(t,y);rgt=Math.max(rgt,x);b=Math.max(b,y);
  }
  assert.ok(transparent>info.width*info.height*.1&&rgt>l,`${j.id}: missing clear silhouette`);
  const crop={left:l,top:t,width:rgt-l+1,height:b-t+1};
  const variants=[];
  for(const [kind,size,gutter] of [['hero',256,8],['icon',62,2]]){
    const reductionKernel=kind==='icon'?'lanczos3':'nearest';
    const paletteLimit=kind==='icon'?128:256;
    const raw=await sharp(source).extract(crop).resize(size-gutter*2,size-gutter*2,{fit:'contain',kernel:reductionKernel,background:'#00000000'})
      .extend({left:gutter,right:gutter,top:gutter,bottom:gutter,background:'#00000000'}).ensureAlpha().raw().toBuffer();
    for(let p=0;p<raw.length;p+=4){raw[p+3]=raw[p+3]>=128?255:0;if(!raw[p+3])raw.fill(0,p,p+3);}
    const pal=await sharp(raw,{raw:{width:size,height:size,channels:4}}).png({palette:true,colours:paletteLimit,dither:0}).toBuffer();
    const canonical=await sharp(pal).ensureAlpha().raw().toBuffer();
    for(let p=0;p<canonical.length;p+=4)if(!canonical[p+3])canonical.fill(0,p,p+3);
    const base=await sharp(canonical,{raw:{width:size,height:size,channels:4}}).png({compressionLevel:9}).toBuffer();
    const files=[];
    for(const scale of [1,2,3]){
      const file=`assets/${kind}/${j.id}${scale===1?'':`@${scale}x`}.png`;
      const bytes=scale===1?base:await sharp(base).resize(size*scale,size*scale,{kernel:'nearest'}).png({compressionLevel:9}).toBuffer();
      await write(file,bytes);files.push({file,scale,width:size*scale,height:size*scale,bytes:bytes.length,sha256:hash(bytes)});
    }
    variants.push({kind,size,gutter,reductionKernel,paletteLimit,files});
  }
  manifest.assets.push({id:j.id,classId:j.classId,name:j.name,motif:j.motif,source:sourceRel,crop,variants});
}
assert.equal(manifest.assets.length,9,'All nine class emblems are required');
await write('asset-manifest.json',JSON.stringify(manifest,null,2)+'\n');
let registry="import type {ImageSourcePropType} from 'react-native';\nimport type {ClassId} from '../core/types';\n\n";
for(const [name,kind,size]of [['classEmblemArtwork','hero',256],['classEmblemIconArtwork','icon',62]]){
  registry+=`/** Native ${size}×${size} dp; Metro selects exact @2x/@3x density variants. */\nexport const ${name}:Record<ClassId,ImageSourcePropType>={\n`;
  for(const j of jobs)registry+=`  ${j.classId}:require('../../assets/class-emblems-v2/${kind}/${j.id}.png'),\n`;
  registry+='};\n\n';
}
await write('integration/class-emblem-assets.ts',registry);
console.log('Exported nine class emblems at 256 and 62 logical pixels, with 54 density PNGs.');
