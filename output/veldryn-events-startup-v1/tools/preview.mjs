import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const sharp=(await import(process.env.VELDRYN_SHARP_PATH?pathToFileURL(process.env.VELDRYN_SHARP_PATH).href:'sharp')).default;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),workspace=path.resolve(root,'../..');
const m=JSON.parse(await fs.readFile(path.join(root,'asset-manifest.json'),'utf8'));
await fs.mkdir(path.join(root,'preview'),{recursive:true});
const png=id=>path.join(root,m.assets.find(a=>a.id===id).files[0].file);
const fontfile=process.env.VELDRYN_PREVIEW_FONT??'C:/Windows/Fonts/segoeui.ttf';
const text=async(str,size=16,color='#F0D49A')=>sharp({text:{text:`<span foreground="${color}">${str}</span>`,font:`Segoe UI ${size}`,fontfile,rgba:true}}).png().toBuffer();
const label=async(str,x,y,size=16,color)=>({input:await text(str,size,color),left:x,top:y});
const shots=[];
for(const a of m.assets.filter(a=>a.kind==='background')){
  const w=360,h=780;
  const bg=await sharp(png(a.id)).resize(w,h,{fit:'cover',kernel:'nearest'}).png().toBuffer();
  const overlay=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="360" height="780"><rect width="360" height="780" fill="#070f1c" opacity=".12"/><rect y="646" width="360" height="134" fill="#070f1c" opacity=".86"/><rect x="132" y="668" width="96" height="2" fill="#cea363"/><circle cx="180" cy="698" r="6" fill="none" stroke="#a2e5ed" stroke-width="2"/></svg>`);
  const txt=await text('Loading…',16),tm=await sharp(txt).metadata();
  const shot=await sharp(bg).composite([{input:overlay},{input:path.join(root,'assets/branding/veldryn_logo.png'),left:36,top:62},{input:txt,left:Math.floor((w-tm.width)/2),top:723}]).png().toBuffer();
  await fs.writeFile(path.join(root,`preview/${a.id}_phone.png`),shot);shots.push({input:shot,left:24+shots.length*384,top:76});
  for(const [cw,ch] of [[320,568],[390,844],[414,896]]){
    await sharp(png(a.id)).resize(cw,ch,{fit:'cover',kernel:'nearest'}).png().toFile(path.join(root,`preview/${a.id}_${cw}x${ch}.png`));
  }
}
const board=sharp({create:{width:1176,height:890,channels:4,background:'#101521'}});
await board.composite([await label('VELDRYN · THREE STARTUP SCENES',24,24,26),...shots]).png().toFile(path.join(root,'preview/startup-overview.png'));
const rows=[];
const refs={harvestwake:'bg_harvestwake.png',winters_bell:'bg_aurora_citadel.png',firstlight:'bg_starfall.png'};
for(const [index,t] of m.themes.entries()){
  const border=m.assets.find(a=>a.theme===t.id&&a.kind==='border'),badge=m.assets.find(a=>a.theme===t.id&&a.kind==='badge');
  const y=72+index*245;
  const existing=path.join(workspace,'apps/mobile/assets/profile-backgrounds',refs[t.id]);
  const composed=await sharp(existing).resize(320,180,{fit:'fill',kernel:'nearest'}).composite([{input:png(border.id)}]).png().toBuffer();
  rows.push(await label(t.name,28,y,21));
  rows.push({input:composed,left:28,top:y+36},{input:png(border.id),left:380,top:y+36},{input:png(badge.id),left:736,top:y+92});
}
await sharp({create:{width:850,height:830,channels:4,background:'#1b2638'}}).composite([await label('EVENT BORDERS · EXISTING PROFILE ART',28,24,23),...rows]).png().toFile(path.join(root,'preview/event-overview.png'));
const cards=m.assets.filter(a=>a.kind!=='background').map(a=>`<figure><div class="checker"><img src="../${a.files[0].file}" width="${a.width}" height="${a.height}" alt="${a.id}"></div><figcaption>${a.id}</figcaption></figure>`).join('');
const scenes=m.assets.filter(a=>a.kind==='background').map(a=>({id:a.id,src:'../'+a.files[0].file}));
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VELDRYN · Events & startup</title><style>*{box-sizing:border-box}body{margin:0;background:#101521;color:#eadcc5;font:16px system-ui}main{max-width:1160px;margin:auto;padding:28px}h1{font-size:30px;color:#f0d49a}p{line-height:1.6;color:#b8c4d2}button{background:#1b2638;color:#f0d49a;border:1px solid #987044;padding:12px;margin:8px 12px 8px 0;cursor:pointer}.row{display:flex;flex-wrap:wrap;gap:32px;align-items:flex-start}.phone{width:360px;max-width:100%;height:780px;position:relative;background:#101521;overflow:hidden}.scene{width:100%;height:100%;object-fit:cover;image-rendering:pixelated}.logo{position:absolute;top:62px;left:10%;width:80%;image-rendering:pixelated}.loading{position:absolute;bottom:0;width:100%;padding:30px;text-align:center;background:#070f1cdb;color:#f0d49a}.details{max-width:460px}.grid{display:flex;flex-wrap:wrap;gap:16px}figure{margin:0;padding:16px;background:#1b2638;max-width:100%}.checker{padding:12px;background:repeating-conic-gradient(#253449 0% 25%,#172334 0% 50%) 0/16px 16px}.checker img{display:block;image-rendering:pixelated;max-width:100%;height:auto}figcaption{font-size:12px;margin-top:12px;color:#f0d49a}a{color:#a2e5ed}</style><main><h1>VELDRYN · Event borders & startup art</h1><div class="row"><div class="phone"><img id="scene" class="scene" alt="Fantasy kingdom startup artwork"><img class="logo" src="../assets/branding/veldryn_logo.png" alt="VELDRYN"><div class="loading">◇<br><br>Loading…</div></div><div class="details"><h2>One scene per launch</h2><p>The live preview chooses randomly once. The production app keeps its selection while loading; no timer or artificial loading delay is added.</p><button id="random">Simulate another launch</button><p id="name"></p>${scenes.map((s,i)=>`<button data-index="${i}">${s.id.replace('startup_','').replaceAll('_',' ')}</button>`).join('')}<p>Event frames match Harvestwake, Winter’s Bell and Anniversary of Veldryn. Existing landscape profile backgrounds remain in the game.</p><p><a href="../VELDRYN_EVENT_STARTUP_SPEC.md">Implementation specification</a></p></div></div><h2>Transparent profile overlays & badges</h2><div class="grid">${cards}</div></main><script>const scenes=${JSON.stringify(scenes)};function show(i){document.getElementById('scene').src=scenes[i].src;document.getElementById('name').textContent=scenes[i].id}document.getElementById('random').onclick=()=>show(Math.floor(Math.random()*scenes.length));document.querySelectorAll('[data-index]').forEach(b=>b.onclick=()=>show(Number(b.dataset.index)));show(Math.floor(Math.random()*scenes.length));</script></html>`;
await fs.writeFile(path.join(root,'preview/index.html'),html);
console.log('Rendered startup assemblies, 9 phone crops, event overlays and local gallery.');
