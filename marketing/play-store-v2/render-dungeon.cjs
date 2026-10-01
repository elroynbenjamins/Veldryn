// Deterministic editorial layout of real game captures. No generated game UI.
const fs=require('node:fs'),path=require('node:path');
const runtime=process.env.VELDRYN_ART_NODE_MODULES||'C:/Users/elroy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {createCanvas,loadImage,GlobalFonts}=require(path.join(runtime,'@napi-rs/canvas'));
const sharp=require(path.join(runtime,'sharp'));
GlobalFonts.registerFromPath('C:/Windows/Fonts/georgiab.ttf','Editorial');
GlobalFonts.registerFromPath('C:/Windows/Fonts/segoeui.ttf','UI');
GlobalFonts.registerFromPath('C:/Windows/Fonts/segoeuib.ttf','UI Bold');
const base=__dirname,out=path.join(base,'exports'),captures=path.join(base,'captures'),assets=path.resolve(base,'../../apps/mobile/assets');
const layouts=require('./layouts.json');
function text(c,value,x,y,size,color,font='Editorial',align='left'){
 c.font=`${size}px "${font}"`;c.textAlign=align;c.fillStyle=color;c.fillText(value,x,y);
}
function contain(c,img,x,y,w,h){const k=Math.min(w/img.width,h/img.height);c.drawImage(img,x+(w-img.width*k)/2,y+(h-img.height*k)/2,img.width*k,img.height*k);}
async function exportPng(canvas,file){await sharp(canvas.toBuffer('image/png')).flatten({background:'#0a1218'}).removeAlpha().png({compressionLevel:9}).toFile(file);}
async function join(name,parts){
 const h=parts.reduce((v,p)=>v+p[2],0),can=createCanvas(1080,h),ctx=can.getContext('2d');let y=0;
 for(const [file,start,height] of parts){const img=await loadImage(path.join(captures,file+'.jpg'));ctx.drawImage(img,0,start,1080,height,0,y,1080,height);y+=height;}
 await exportPng(can,path.join(captures,name+'.png'));
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 await join('gate-current-full',[['gate-current-0',0,700],['gate-current-1',0,700],['gate-current-2',0,710]]);
 const logo=await loadImage(path.join(assets,'events-startup-v1/branding/veldryn_logo@3x.png'));
 const manifest=[];
 for(const [index,l] of layouts.entries()){
  if(l.file!=='04-dungeon-party')continue;
  const can=createCanvas(1080,1920),c=can.getContext('2d'),scene=await loadImage(path.join(assets,'world/regions-v2',l.scene));
  c.fillStyle='#0a1218';c.fillRect(0,0,1080,1920);
  const scale=Math.max(1080/scene.width,1920/scene.height);c.globalAlpha=.30;c.drawImage(scene,(1080-scene.width*scale)/2,0,scene.width*scale,scene.height*scale);c.globalAlpha=1;
  const shade=c.createLinearGradient(0,0,0,1920);shade.addColorStop(0,'rgba(6,14,21,.48)');shade.addColorStop(.25,'rgba(6,14,21,.91)');shade.addColorStop(.9,'rgba(6,14,21,.94)');shade.addColorStop(1,'rgba(6,14,21,.72)');c.fillStyle=shade;c.fillRect(0,0,1080,1920);
  contain(c,logo,52,20,250,87);text(c,l.category,1026,78,23,l.accent,'UI Bold','right');
  for(const [n,line] of l.headline.entries()){c.font='82px "Editorial"';if(c.measureText(line).width>980)throw Error('Headline too wide: '+line);text(c,line,52,202+n*92,82,n?l.accent:'#F3EBDD');}
  c.strokeStyle=l.accent;c.globalAlpha=.45;c.lineWidth=1;c.beginPath();c.moveTo(52,329);c.lineTo(1028,329);c.stroke();c.globalAlpha=1;
  const gap=22,available=1515,ratio=l.panels.reduce((sum,p)=>sum+p.crop[3]/p.crop[2],0),w=Math.min(980,(available-gap*(l.panels.length-1))/ratio);
  let y=354+(available-(ratio*w+gap*(l.panels.length-1)))/2;
  const panels=[];
  for(const p of l.panels){
   const filename=path.join(captures,p.source+(p.source.endsWith('-full')?'.png':'.jpg')),img=await loadImage(filename),[sx,sy,sw,sh]=p.crop;
   if(sx<0||sy<0||sx+sw>img.width||sy+sh>img.height)throw Error('Crop outside source: '+p.source);
   const x=(1080-w)/2,h=sh*w/sw;c.save();c.shadowColor='#0008';c.shadowBlur=30;c.shadowOffsetY=10;c.fillStyle='#0c141b';c.beginPath();c.roundRect(x,y,w,h,18);c.fill();c.restore();
   c.save();c.beginPath();c.roundRect(x,y,w,h,18);c.clip();c.drawImage(img,sx,sy,sw,sh,x,y,w,h);c.restore();
   panels.push({...p,sourceFile:path.relative(base,filename).replaceAll('\\','/'),box:[x,y,w,h]});y+=h+gap;
  }
  c.fillStyle=l.accent;c.fillRect(52,1890,38,2);text(c,'VELDRYN  ·  IDLE FANTASY RPG',108,1899,18,'#AABCBF','UI');text(c,String(index+1).padStart(2,'0'),1028,1899,18,l.accent,'UI Bold','right');
  const filename=l.file+'.png';await exportPng(can,path.join(out,filename));
  const meta=await sharp(path.join(out,filename)).metadata();if(meta.width!==1080||meta.height!==1920||meta.channels!==3)throw Error('Invalid store export');
  manifest.push({...l,panels,file:filename,width:1080,height:1920,channels:3,alt:l.category+': '+l.headline.join(' ')});
 }
 fs.writeFileSync(path.join(out,'04-dungeon-party.json'),JSON.stringify(manifest[0],null,2));
 console.log('Verified dungeon screenshot: 1080 x 1920 RGB PNG. Other screenshots unchanged.');
})().catch(error=>{console.error(error);process.exitCode=1;});
