const fs=require('fs'),path=require('path'),sharp=require('C:/Users/elroy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.cjs');
(async()=>{
const root=__dirname,entries=JSON.parse(fs.readFileSync(path.join(root,'sources.json'),'utf8')),dest=path.resolve(root,'../../apps/mobile/assets/ingredient-icons-v1');
fs.mkdirSync(dest,{recursive:true});const audit=[];
for(const e of entries){
 const meta=await sharp(e.source).metadata(),stats=await sharp(e.source).stats();
 if(!meta.hasAlpha||stats.channels[3].min!==0)throw Error('Missing real alpha: '+e.id);
 const {data,info}=await sharp(e.source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(const [x,y]of [[0,0],[info.width-1,0],[0,info.height-1],[info.width-1,info.height-1]])if(data[(y*info.width+x)*4+3]>1)throw Error('Opaque corner: '+e.id);
 fs.copyFileSync(e.source,path.join(root,'sources',e.name+'.png'));
 for(const scale of [1,2,3]){
 const file=path.join(dest,e.name+(scale===1?'':'@'+scale+'x')+'.png');
 await sharp(e.source).resize(48*scale,48*scale,{kernel:'lanczos3'}).png().toFile(file);
 const m=await sharp(file).metadata();if(!m.hasAlpha||m.width!==48*scale)throw Error('Bad density export');
 }
 audit.push({id:e.id,name:e.name,master:[meta.width,meta.height],alpha:true,cornerAlphaTolerance:1,densities:[48,96,144]});
}
fs.writeFileSync(path.join(root,'asset-audit.json'),JSON.stringify(audit,null,2));
const composites=await Promise.all(entries.map(async(e,i)=>({input:await sharp(path.join(dest,e.name+'@3x.png')).resize(96,96).png().toBuffer(),left:24+(i%5)*144,top:24+Math.floor(i/5)*144})));
await sharp({create:{width:720,height:576,channels:4,background:'#101b29'}}).composite(composites).png().toFile(path.join(root,'ingredient-review.png'));
console.log('PASS: '+entries.length+' transparent masters and '+entries.length*3+' density exports');
})().catch(e=>{console.error(e);process.exitCode=1;});