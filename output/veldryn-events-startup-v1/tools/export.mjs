import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
const sharp=(await import(process.env.VELDRYN_SHARP_PATH?pathToFileURL(process.env.VELDRYN_SHARP_PATH).href:'sharp')).default;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const workspace=path.resolve(root,'../..');
const read=async f=>JSON.parse(await fs.readFile(path.join(root,f),'utf8'));
const write=async(f,b)=>{await fs.mkdir(path.dirname(path.join(root,f)),{recursive:true});await fs.writeFile(path.join(root,f),b);};
const {jobs,themes}=await read('source/jobs.json'),results=await read('source/results.json');
const manifest={version:'1.0.0',themes,assets:[]};
for(const j of jobs){
  const r=results.find(r=>r.id===j.id);if(!r)continue;
  const sourceRel=`source/originals/${j.id}-${path.basename(r.source).slice(5,13)}.png`;
  let source;try{source=await fs.readFile(path.join(root,sourceRel));}catch{source=await fs.readFile(r.source);await write(sourceRel,source);}
  const m=await sharp(source).metadata();
  let png;
  if(j.kind==='background'){
    png=await sharp(source).flatten({background:'#101521'}).resize(j.width,j.height,{fit:'cover',position:'centre',kernel:'nearest'}).png({compressionLevel:9}).toBuffer();
  }else{
    if(!m.hasAlpha)throw new Error(`${j.id}: generated source has no alpha channel; regenerate it`);
    const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    let l=info.width,t=info.height,r=-1,b=-1,transparent=0;
    for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
      const a=data[(y*info.width+x)*4+3];if(a<128){transparent++;continue;}
      l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y);
    }
    if(transparent<info.width*info.height*.05||r<l)throw new Error(`${j.id}: missing real transparency`);
    const raw=await sharp(source).extract({left:l,top:t,width:r-l+1,height:b-t+1})
      .resize(j.width-4,j.height-4,{fit:j.kind==='border'?'fill':'contain',kernel:'nearest',background:'#00000000'})
      .extend({left:2,right:2,top:2,bottom:2,background:'#00000000'}).ensureAlpha().raw().toBuffer();
    for(let p=0;p<raw.length;p+=4){raw[p+3]=raw[p+3]>=128?255:0;if(!raw[p+3])raw.fill(0,p,p+3);}
    const pal=await sharp(raw,{raw:{width:j.width,height:j.height,channels:4}}).png({palette:true,colours:256,dither:0}).toBuffer();
    const canonical=await sharp(pal).ensureAlpha().raw().toBuffer();
    for(let p=0;p<canonical.length;p+=4)if(!canonical[p+3])canonical.fill(0,p,p+3);
    png=await sharp(canonical,{raw:{width:j.width,height:j.height,channels:4}}).png({compressionLevel:9}).toBuffer();
  }
  const folder=j.kind==='background'?'backgrounds':j.kind==='border'?'borders':'badges';
  const files=[];
  for(const scale of [1,2,3]){
    const file=`assets/${folder}/${j.id}${scale===1?'':`@${scale}x`}.png`;
    const bytes=scale===1?png:await sharp(png).resize(j.width*scale,j.height*scale,{kernel:'nearest'}).png({compressionLevel:9}).toBuffer();
    await write(file,bytes);
    files.push({file,scale,width:j.width*scale,height:j.height*scale,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
  }
  manifest.assets.push({id:j.id,theme:j.theme,kind:j.kind,width:j.width,height:j.height,mode:j.kind==='border'?'fixed-aspect-16:9':j.kind==='background'?'cover':'fixed',source:sourceRel,files});
}
if(manifest.assets.length!==jobs.length)throw new Error(`Incomplete: ${manifest.assets.length}/${jobs.length}`);
// Reuse the accepted wordmark from the Core UI pack; never bake branding into scenes.
for(const suffix of ['', '@2x','@3x']){
  const logo=await fs.readFile(path.join(workspace,'output/veldryn-pixel-ui-kit-v1/branding',`veldryn_logo${suffix}.png`));
  await write(`assets/branding/veldryn_logo${suffix}.png`,logo);
}
await write('asset-manifest.json',JSON.stringify(manifest,null,2)+'\n');
console.log(`Exported ${manifest.assets.length} new assets, 27 density PNGs, and 3 reused wordmark PNGs.`);
