// Deterministic storefront composition. Only crops, uniform resizes and layout.
// Gameplay pixels remain untouched; AI artwork is used only for the promo.
const fs=require('node:fs'),path=require('node:path');
const runtime=process.env.VELDRYN_ART_NODE_MODULES||'C:/Users/elroy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {createCanvas,loadImage,GlobalFonts}=require(path.join(runtime,'@napi-rs/canvas'));
const sharp=require(path.join(runtime,'sharp'));
GlobalFonts.registerFromPath('C:/Windows/Fonts/georgiab.ttf','Veldryn Editorial');
GlobalFonts.registerFromPath('C:/Windows/Fonts/segoeui.ttf','Veldryn Sans');
GlobalFonts.registerFromPath('C:/Windows/Fonts/segoeuib.ttf','Veldryn Sans Bold');
const base=__dirname,assets=path.resolve(base,'../../apps/mobile/assets'),out=path.join(base,'exports');
const layouts=require('./layouts.json');
fs.mkdirSync(out,{recursive:true});
function rounded(c,x,y,w,h,r){c.beginPath();c.roundRect(x,y,w,h,r);}
function text(c,value,x,y,size,color,family='Veldryn Sans',align='left'){
 c.font=`${size}px "${family}"`;c.textAlign=align;c.fillStyle=color;c.fillText(value,x,y);
}
function imageContain(c,img,x,y,w,h){const scale=Math.min(w/img.width,h/img.height);c.drawImage(img,x+(w-img.width*scale)/2,y+(h-img.height*scale)/2,img.width*scale,img.height*scale)}
async function png(canvas,file){await sharp(canvas.toBuffer('image/png')).flatten({background:'#0b1721'}).removeAlpha().png({compressionLevel:9}).toFile(path.join(out,file));}
(async()=>{
 const logo=await loadImage(path.join(assets,'events-startup-v1/branding/veldryn_logo@3x.png'));
 const scene=await loadImage(path.join(assets,'events-startup-v1/backgrounds/startup_firstlight@3x.png'));
 const reports=[];
 for(const [i,layout] of layouts.entries()){
  const canvas=createCanvas(1080,1920),c=canvas.getContext('2d');
  c.fillStyle='#0b1721';c.fillRect(0,0,1080,1920);
  c.globalAlpha=.18;c.drawImage(scene,0,0,1080,1920);c.globalAlpha=1;
  const wash=c.createLinearGradient(0,0,1080,1920);wash.addColorStop(0,'rgba(8,27,36,.5)');wash.addColorStop(.5,'rgba(6,17,26,.92)');wash.addColorStop(1,'rgba(8,32,37,.74)');c.fillStyle=wash;c.fillRect(0,0,1080,1920);
  imageContain(c,logo,49,29,255,85);
  text(c,layout.category,1030,81,23,layout.accent,'Veldryn Sans Bold','right');
  layout.headline.forEach((line,n)=>{
   c.font='82px "Veldryn Editorial"';if(c.measureText(line).width>980)throw Error('Headline overflows: '+line);
   text(c,line,50,208+n*91,82,n?layout.accent:'#f4ead6','Veldryn Editorial');
  });
  c.strokeStyle=layout.accent;c.globalAlpha=.55;c.lineWidth=2;c.beginPath();c.moveTo(50,335);c.lineTo(1030,335);c.stroke();c.globalAlpha=1;
  for(const panel of layout.panels){
   const source=await loadImage(path.join(base,'captures',panel.source+'.png'));
   const [sx,sy,sw,sh]=panel.crop,[x,y,w,h]=panel.box;
   if(y+h>1880)throw Error(`Panel exceeds safe region: ${layout.file} (${y+h})`);
   if(sx+sw>source.width||sy+sh>source.height)throw Error('Crop exceeds source');
   const aspectError=Math.abs((sw/sh)/(w/h)-1);if(aspectError>.008)throw Error('Non-uniform resize');
   // Heraldry already has its own decorative perimeter; do not add a second frame.
   if(panel.bare){c.drawImage(source,sx,sy,sw,sh,x,y,w,h);continue;}
   c.save();c.shadowColor='#0008';c.shadowBlur=28;c.shadowOffsetY=12;c.fillStyle='#101c28';rounded(c,x,y,w,h,24);c.fill();c.restore();
   c.save();rounded(c,x,y,w,h,24);c.clip();c.drawImage(source,sx,sy,sw,sh,x,y,w,h);c.restore();
   c.strokeStyle='#779a9e55';c.lineWidth=1.5;rounded(c,x,y,w,h,24);c.stroke();
  }
  if(layout.ornaments){
   for(const [j,name] of layout.ornaments.entries()){
    const img=await loadImage(path.join(assets,'master_roster/companions/runtime_96',name));
    c.save();c.imageSmoothingEnabled=false;imageContain(c,img,115+j*300,1565,240,240);c.restore();
   }
  }
  c.fillStyle=layout.accent;c.fillRect(50,1885,46,3);
  text(c,'VELDRYN  /  IDLE FANTASY RPG',112,1898,18,'#b6c8cb','Veldryn Sans');
  text(c,String(i+1).padStart(2,'0'),1030,1898,18,layout.accent,'Veldryn Sans Bold','right');
  await png(canvas,layout.file+'.png');
  reports.push({file:layout.file+'.png',width:1080,height:1920,source:'Real React Native web screen crops; in-memory test progress',panels:layout.panels});
 }
 const art=await loadImage(path.join(base,'source/promotional-key-art.png'));
 for(const scale of [1,2]){
  const canvas=createCanvas(1024*scale,500*scale),c=canvas.getContext('2d');c.scale(scale,scale);
  const scaleToCover=Math.max(1024/art.width,500/art.height),sourceW=1024/scaleToCover,sourceH=500/scaleToCover;
  c.drawImage(art,(art.width-sourceW)/2,(art.height-sourceH)/2,sourceW,sourceH,0,0,1024,500);
  const shade=c.createLinearGradient(0,0,550,0);shade.addColorStop(0,'rgba(4,24,39,.45)');shade.addColorStop(1,'rgba(4,24,39,0)');c.fillStyle=shade;c.fillRect(0,0,550,500);
  imageContain(c,logo,72,166,373,124);
  text(c,'Your adventure. Your pace.',259,326,23,'#f5e7c9','Veldryn Sans','center');
  c.strokeStyle='#d8b66d';c.lineWidth=1;c.beginPath();c.moveTo(166,347);c.lineTo(352,347);c.stroke();
  await png(canvas,scale===1?'feature-graphic-1024x500.png':'promotional-banner-2048x1000.png');
 }
 const contactHeight=Math.ceil(layouts.length/3)*960;
 const contact=createCanvas(1620,contactHeight),cc=contact.getContext('2d');cc.fillStyle='#09141d';cc.fillRect(0,0,1620,contactHeight);
 for(const [i,l] of layouts.entries()){const img=await loadImage(path.join(out,l.file+'.png'));cc.drawImage(img,(i%3)*540,Math.floor(i/3)*960,540,960)}
 await png(contact,'screenshot-contact-sheet.png');
 for(const f of fs.readdirSync(out).filter(f=>f.endsWith('.png'))){const m=await sharp(path.join(out,f)).metadata();if(m.hasAlpha||m.channels!==3)throw Error('Export must be 24-bit RGB: '+f);}
 fs.writeFileSync(path.join(out,'capture-manifest.json'),JSON.stringify({created:'2026-09-28',renderMode:'deterministic canvas, original gameplay pixels',screenshots:reports},null,2));
 console.log(`Exported ${layouts.length} screenshots, feature graphic, large promo, contact sheet. All PNGs are RGB without alpha.`);
})().catch(e=>{console.error(e);process.exitCode=1});
