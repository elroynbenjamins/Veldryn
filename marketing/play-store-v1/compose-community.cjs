// Companion to the original promo. Layout is deterministic; the scene is key art.
const fs=require('node:fs'),path=require('node:path');
const runtime=process.env.VELDRYN_ART_NODE_MODULES||'C:/Users/elroy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {createCanvas,loadImage,GlobalFonts}=require(path.join(runtime,'@napi-rs/canvas'));
const sharp=require(path.join(runtime,'sharp'));
GlobalFonts.registerFromPath('C:/Windows/Fonts/georgiab.ttf','Veldryn Editorial');
GlobalFonts.registerFromPath('C:/Windows/Fonts/segoeui.ttf','Veldryn Sans');
GlobalFonts.registerFromPath('C:/Windows/Fonts/segoeuib.ttf','Veldryn Sans Bold');
const base=__dirname,out=path.join(base,'exports');
const COPY={headline:['Find your guild.','Stay connected.'],features:'ONLINE  ·  GUILDS  ·  CHAT'};
function text(c,value,x,y,size,color,font='Veldryn Sans'){
 c.font=`${size}px "${font}"`;c.fillStyle=color;
 if(c.measureText(value).width>372)throw Error('Text exceeds reserved artwork space: '+value);
 c.fillText(value,x,y);
}
(async()=>{
 const art=await loadImage(path.join(base,'source/guild-community-key-art.png'));
 const logo=await loadImage(path.resolve(base,'../../apps/mobile/assets/events-startup-v1/branding/veldryn_logo@3x.png'));
 fs.mkdirSync(out,{recursive:true});
 for(const scale of [1,2]){
  const canvas=createCanvas(1024*scale,500*scale),c=canvas.getContext('2d');c.scale(scale,scale);
  const fit=Math.max(1024/art.width,500/art.height),sw=1024/fit,sh=500/fit;
  c.drawImage(art,(art.width-sw)/2,(art.height-sh)/2,sw,sh,0,0,1024,500);
  const shade=c.createLinearGradient(0,0,520,0);shade.addColorStop(0,'rgba(4,22,34,.44)');shade.addColorStop(.7,'rgba(4,22,34,.2)');shade.addColorStop(1,'rgba(4,22,34,0)');c.fillStyle=shade;c.fillRect(0,0,520,500);
  const logoW=356,logoH=logoW*logo.height/logo.width;c.drawImage(logo,64,105,logoW,logoH);
  text(c,COPY.headline[0],78,274,33,'#f5e8cd','Veldryn Editorial');
  text(c,COPY.headline[1],78,318,33,'#a1e1d3','Veldryn Editorial');
  c.fillStyle='#d7b46f';c.fillRect(78,343,60,1.5);
  text(c,COPY.features,78,381,17,'#f4d79f','Veldryn Sans Bold');
  const file=path.join(out,`guild-community-${1024*scale}x${500*scale}.png`);
  await sharp(canvas.toBuffer('image/png')).flatten({background:'#081b27'}).removeAlpha().png({compressionLevel:9}).toFile(file);
  const m=await sharp(file).metadata();if(m.width!==1024*scale||m.height!==500*scale||m.hasAlpha||m.channels!==3)throw Error('Invalid export');
  console.log(path.basename(file)+': '+m.width+'x'+m.height+', RGB, no alpha');
 }
})().catch(e=>{console.error(e);process.exitCode=1});
