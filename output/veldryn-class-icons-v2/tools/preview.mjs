import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const sharp=(await import(process.env.VELDRYN_SHARP_PATH?pathToFileURL(process.env.VELDRYN_SHARP_PATH).href:'sharp')).default;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),workspace=path.resolve(root,'../..');
const m=JSON.parse(await fs.readFile(path.join(root,'asset-manifest.json'),'utf8'));
await fs.mkdir(path.join(root,'preview'),{recursive:true});
const fontfile=process.env.VELDRYN_PREVIEW_FONT??'C:/Windows/Fonts/segoeui.ttf';
const text=async(str,size=16,color='#F0D49A')=>sharp({text:{text:`<span foreground="${color}">${str}</span>`,font:`Segoe UI ${size}`,fontfile,rgba:true}}).png().toBuffer();
const label=async(str,x,y,size=16,color)=>({input:await text(str,size,color),left:x,top:y});
const file=(a,kind)=>path.join(root,a.variants.find(v=>v.kind===kind).files[0].file);
const layers=[await label('VELDRYN · CLASS EMBLEMS II',28,24,27)];
for(const [i,a]of m.assets.entries()){
  const x=24+(i%3)*312,y=78+Math.floor(i/3)*334;
  layers.push({input:await sharp({create:{width:292,height:312,channels:4,background:'#1b2638'}}).png().toBuffer(),left:x,top:y});
  layers.push({input:file(a,'hero'),left:x+18,top:y+8});
  layers.push(await label(a.name,x+18,y+278,20));
}
await sharp({create:{width:960,height:1100,channels:4,background:'#101521'}}).composite(layers).png().toFile(path.join(root,'preview/class-overview.png'));
const compare=[await label('BEFORE / AFTER · ACTUAL 62 PX SIZE',28,24,25)];
for(const [i,a]of m.assets.entries()){
  const y=78+i*88;
  const old=await sharp(path.join(workspace,'apps/mobile/assets/classes',a.id+'.png')).resize(62,62,{fit:'contain'}).png().toBuffer();
  compare.push(await label(a.name,28,y+18,18),{input:old,left:224,top:y},{input:file(a,'icon'),left:326,top:y});
}
compare.push(await label('OLD',224,56,11,'#AABACA'),await label('NEW',326,56,11,'#AABACA'));
await sharp({create:{width:530,height:900,channels:4,background:'#101521'}}).composite(compare).png().toFile(path.join(root,'preview/size-comparison.png'));
const heroCompare=[await label('IRONWARDEN · BEFORE / AFTER',28,22,26)];
heroCompare.push({input:await sharp(path.join(workspace,'apps/mobile/assets/classes/ironwarden.png')).resize(256,256).png().toBuffer(),left:24,top:70},{input:file(m.assets[0],'hero'),left:320,top:70});
await sharp({create:{width:600,height:360,channels:4,background:'#1b2638'}}).composite(heroCompare).png().toFile(path.join(root,'preview/hero-comparison.png'));
const cards=m.assets.map(a=>`<article><div class="art"><img src="../${a.variants[0].files[0].file}" width="256" height="256" alt="${a.name} class emblem"></div><div class="identity"><img src="../${a.variants[1].files[0].file}" width="62" height="62" alt=""><h2>${a.name}</h2></div></article>`).join('');
await fs.writeFile(path.join(root,'preview/index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VELDRYN Class Emblems II</title><style>*{box-sizing:border-box}body{margin:0;background:#101521;color:#eadcc5;font:16px system-ui}header,main{max-width:1100px;margin:auto;padding:28px}h1,h2{color:#f0d49a}h2{font-size:20px}p{color:#b7c3d2;line-height:1.6}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}article{padding:16px;background:#1b2638;border:1px solid #30425a}.art{height:270px;display:flex;align-items:center;justify-content:center}.identity{display:flex;gap:16px;align-items:center}img{image-rendering:pixelated}button{padding:10px;margin-right:10px;border:1px solid #987044;background:#1b2638;color:#f0d49a;cursor:pointer}.light .art{background:#ede4d2}.checker .art{background:repeating-conic-gradient(#30425a 0% 25%,#182334 0% 50%) 0/16px 16px}a{color:#a2e5ed}</style><header><h1>VELDRYN · Class Emblems II</h1><p>Nine established class identities, rebuilt with clear silhouettes and controlled pixel shading. Large preview: 256 px. Character identity icon: 62 px. Each ships with exact 1×, 2× and 3× PNGs.</p><button data-mode="dark">Dark</button><button data-mode="light">Light</button><button data-mode="checker">Transparency</button><p><a href="../CLASS_ICON_SPEC.md">Asset specification</a></p></header><main class="grid">${cards}</main><script>document.querySelectorAll('button').forEach(b=>b.onclick=()=>document.body.className=b.dataset.mode);</script></html>`);
console.log('Rendered nine-class overview, 62px comparison, hero comparison and gallery.');
