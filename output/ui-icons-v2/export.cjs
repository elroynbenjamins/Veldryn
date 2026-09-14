
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const sharp=require('C:/Users/elroy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.cjs');
const out='output/ui-icons-v2',dest='apps/mobile/assets/ui-icons-v2';
(async()=>{
 fs.mkdirSync(dest+'/small',{recursive:true});
 const records=JSON.parse(fs.readFileSync(out+'/prompts.json','utf8')),report=[];
 for(const record of records){
  const meta=await sharp(record.source).metadata();assert.ok(meta.hasAlpha,record.name+' has no alpha');
  fs.copyFileSync(record.source,out+'/sources/'+record.name+'.png');
  const {data,info}=await sharp(record.source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width,top=info.height,right=0,bottom=0,transparent=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const a=data[(y*info.width+x)*4+3];if(a===0)transparent++;if(a>8){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}}
  assert.ok(transparent/(info.width*info.height)>.12,record.name+' background not clear');
  const bounds={left,top,width:right-left+1,height:bottom-top+1};
  for(const logical of [24,32])for(const density of [1,2,3]){
   const size=logical*density,pad=2*density;
   const file=(logical===24?'small/':'')+record.name+(density===1?'':'@'+density+'x')+'.png';
   // Resize each density from its full-resolution alpha master; no palette reduction or matte.
   const buffer=await sharp(record.source).extract(bounds).resize(size-pad*2,size-pad*2,{fit:'contain',background:{r:0,g:0,b:0,alpha:0},kernel:'lanczos3'}).extend({top:pad,bottom:pad,left:pad,right:pad,background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer();
   fs.writeFileSync(dest+'/'+file,buffer);
   const pixels=await sharp(buffer).ensureAlpha().raw().toBuffer();
   let paleEdge=0,edgeCount=0,outerAlpha=0;
   for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const i=(y*size+x)*4,a=pixels[i+3];
    if(x===0||y===0||x===size-1||y===size-1)outerAlpha+=a;
    if(a<16)continue;
    const boundary=[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(([xx,yy])=>xx<0||yy<0||xx>=size||yy>=size||pixels[(yy*size+xx)*4+3]<8);
    if(boundary){edgeCount++;const rgb=[pixels[i],pixels[i+1],pixels[i+2]];if(Math.min(...rgb)>210&&Math.max(...rgb)-Math.min(...rgb)<30)paleEdge++;}
   }
   assert.equal(outerAlpha,0,file+' clips canvas');
   report.push({file,size,edgeCount,paleEdge,transparentGutter:true});
  }
 }
 fs.writeFileSync(out+'/asset-verification.json',JSON.stringify({families:records.length,pngs:report.length,files:report},null,2));
 console.log(JSON.stringify({families:records.length,pngs:report.length,paleEdges:report.filter(x=>x.paleEdge>0)}));
})().catch(e=>{console.error(e);process.exit(1)});
