import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import crypto from 'node:crypto';

// Rebuild delivery files from the retained ImageGen sources; no network needed.
const sharp = (await import(process.env.VELDRYN_SHARP_PATH
  ? pathToFileURL(process.env.VELDRYN_SHARP_PATH).href : 'sharp')).default;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJSON = async p => JSON.parse(await fs.readFile(path.join(root, p), 'utf8'));
const write = async (p, data) => { await fs.mkdir(path.dirname(path.join(root,p)), {recursive:true}); await fs.writeFile(path.join(root,p),data); };
const {jobs} = await readJSON('source/generation-jobs.json');
const results = await readJSON('source/generation-results.json');
let refinements=[];
try { refinements=await readJSON('source/refinements.json'); } catch(e) { if(e.code!=='ENOENT')throw e; }
try { refinements.push(...await readJSON('source/directional-refinement.json')); } catch(e) { if(e.code!=='ENOENT')throw e; }
try { refinements.push(...await readJSON('source/surface-refinements.json')); } catch(e) { if(e.code!=='ENOENT')throw e; }
for(const r of refinements)if(!jobs.some(j=>j.id===r.id))jobs.push(r);
for(const j of jobs)if(j.id.startsWith('button_icon_')){j.width=48;j.height=48;}
const manifest = {version:'1.0.0',unit:'logical pixel; base PNG is 1x',densities:[1,2,3],assets:[]};
const overrides = {
  panel_large_9slice:32, panel_compact_9slice:20, panel_parchment_9slice:24,
  modal_frame_9slice:32, login_frame_9slice:32, create_account_frame_9slice:32,
  character_card_default_9slice:32, character_card_selected_9slice:32,
  class_selection_frame_9slice:32,
  slider_track_3slice:16, progress_track_3slice:24,
  progress_fill_xp_3slice:12, progress_fill_hp_3slice:12,
  progress_fill_activity_3slice:12, progress_fill_loading_3slice:12,
  divider_gold_3slice:16,
};
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
async function densities(base, buffer, width, height) {
  const files=[];
  for (const scale of [1,2,3]) {
    const name=base.replace(/\.png$/, `${scale===1?'':`@${scale}x`}.png`);
    const data=scale===1?buffer:await sharp(buffer).resize(width*scale,height*scale,{kernel:'nearest'}).png().toBuffer();
    await write(name,data);
    files.push({file:name,scale,width:width*scale,height:height*scale,sha256:hash(data)});
  }
  return files;
}
for (const j of jobs) {
  const revised=refinements.find(r=>r.id===j.id);
  // The deeper blue variation is the normal primary; the darker face is pressed.
  const sourceId=j.id==='button_primary_3slice'?'button_primary_pressed_3slice':j.id==='button_primary_pressed_3slice'?'button_primary_3slice':j.id;
  const result=revised??results.find(r=>r.id===sourceId);
  if(!result) continue; // Supports incremental authoring; verify.mjs rejects incomplete packs.
  const sourceRel=`source/originals/${j.id}${revised?'-r2':sourceId!==j.id?'-state':''}.png`;
  let source;
  try {source=await fs.readFile(path.join(root,sourceRel));}
  catch {source=await fs.readFile(result.source); await write(sourceRel,source);}
  const {data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width,top=info.height,right=-1,bottom=-1;
  // Use the generated alpha, never chroma-key or guess the background color.
  // Export a hard pixel silhouette; retain the full untouched source above.
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    const a=data[(y*info.width+x)*4+3];
    if(a>=128){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
  }
  if(right<left)throw new Error(`${j.id}: no visible alpha`);
  const crop={left,top,width:right-left+1,height:bottom-top+1};
  const border=(j.width<=24||j.height<=8)?1:2;
  const body=await sharp(source).extract(crop)
    .resize(j.width-border*2,j.height-border*2,{fit:j.mode==='fixed'?'contain':'fill',kernel:'nearest',background:{r:0,g:0,b:0,alpha:0}})
    .extend({left:border,right:border,top:border,bottom:border,background:{r:0,g:0,b:0,alpha:0}})
    .ensureAlpha().raw().toBuffer();
  for(let i=0;i<body.length;i+=4){
    body[i+3]=body[i+3]>=128?255:0;
    if(body[i+3]===0)body.fill(0,i,i+3);
  }
  const palettePng=await sharp(body,{raw:{width:j.width,height:j.height,channels:4}}).png({palette:true,colours:256,dither:0,compressionLevel:9}).toBuffer();
  // Palette quantizers may store arbitrary RGB under alpha=0. Canonical RGBA
  // prevents invisible-byte differences during slice reconstruction/compositing.
  const canonical=await sharp(palettePng).ensureAlpha().raw().toBuffer();
  for(let i=0;i<canonical.length;i+=4)if(canonical[i+3]===0)canonical.fill(0,i,i+3);
  const png=await sharp(canonical,{raw:{width:j.width,height:j.height,channels:4}}).png({compressionLevel:9}).toBuffer();
  const file=`${j.group}/${j.id}.png`;
  const files=await densities(file,png,j.width,j.height);
  const cap=overrides[j.id]??j.caps;
  const field=j.group==='ui/inputs' && j.mode==='9slice';
  const insets=field?{top:16,right:24,bottom:16,left:24}:j.mode==='9slice'?{top:cap,right:cap,bottom:cap,left:cap}:j.mode==='3slice'?{top:0,right:cap,bottom:0,left:cap}:null;
  const pad=j.mode==='9slice'?cap+4:j.mode==='3slice'?cap+2:0;
  const padding=field?{top:8,right:28,bottom:8,left:28}:j.mode==='9slice'?{top:pad,right:pad,bottom:pad,left:pad}:j.mode==='3slice'?{top:Math.min(8,Math.floor(j.height/4)),right:pad,bottom:Math.min(8,Math.floor(j.height/4)),left:pad}:{top:0,right:0,bottom:0,left:0};
  const slices=[];
  if(insets){
    const xs=[0,insets.left,j.width-insets.right],ws=[insets.left,j.width-insets.left-insets.right,insets.right];
    if(j.mode==='9slice'){
      const ys=[0,insets.top,j.height-insets.bottom],hs=[insets.top,j.height-insets.top-insets.bottom,insets.bottom];
      for(let row=0;row<3;row++)for(let col=0;col<3;col++){
        const key=['top','middle','bottom'][row]+'_'+['left','center','right'][col];
        const rect={left:xs[col],top:ys[row],width:ws[col],height:hs[row]};
        const piece=await sharp(png).extract(rect).png().toBuffer();
        const sliceFile=`slices/${j.id}/${key}.png`;
        slices.push({key,...rect,files:await densities(sliceFile,piece,rect.width,rect.height)});
      }
    }else for(let col=0;col<3;col++){
      const key=['left','center','right'][col];
      const rect={left:xs[col],top:0,width:ws[col],height:j.height};
      const piece=await sharp(png).extract(rect).png().toBuffer();
      slices.push({key,...rect,files:await densities(`slices/${j.id}/${key}.png`,piece,rect.width,rect.height)});
    }
  }
  manifest.assets.push({id:j.id,file,width:j.width,height:j.height,mode:j.mode,insets,padding,
    minimumSize:{width:insets?insets.left+insets.right+8:j.width,height:j.mode==='9slice'?insets.top+insets.bottom+8:j.height},
    transparentGutter:border,source:sourceRel,sourceCrop:crop,description:j.description,files,slices});
}
await write('asset-manifest.json',JSON.stringify(manifest,null,2)+'\n');
// Metro requires compile-time literal require paths; never require a computed filename.
let registry=`/* Generated by tools/build.mjs. Keep this file beside PixelFrame.tsx. */\nimport type { ImageSourcePropType } from 'react-native';\nexport type SliceAsset={source:ImageSourcePropType;width:number;height:number;mode:'fixed'|'3slice'|'9slice';insets:{top:number;right:number;bottom:number;left:number}|null;padding:{top:number;right:number;bottom:number;left:number};slices:Record<string,ImageSourcePropType>};\nexport const assets = {\n`;
for(const a of manifest.assets){
  registry+=`  ${a.id}: {source:require('../${a.file}'),width:${a.width},height:${a.height},mode:'${a.mode}',insets:${JSON.stringify(a.insets)},padding:${JSON.stringify(a.padding)},slices:{${a.slices.map(s=>`${s.key}:require('../${s.files[0].file}')`).join(',')}}},\n`;
}
registry+='} satisfies Record<string, SliceAsset>;\nexport type AssetId = keyof typeof assets;\n';
await write('implementation/assets.ts',registry);
const rows=manifest.assets.map(a=>`| \`${a.file}\` | ${a.width}×${a.height} | ${a.mode} | ${a.insets?`${a.insets.top}, ${a.insets.right}, ${a.insets.bottom}, ${a.insets.left}`:'—'} | ${a.padding.top}, ${a.padding.right}, ${a.padding.bottom}, ${a.padding.left} | ${a.minimumSize.width}×${a.minimumSize.height} |`).join('\n');
await write('instructions/ASSET_INVENTORY.md',`# VELDRYN v1 asset inventory\n\nAll measurements use base logical pixels. Insets/padding order: top, right, bottom, left. Minimum sizes are geometry limits, not touch targets. Every entry has base, @2x and @3x PNGs. Progress fill assets have no content; ignore their text padding.\n\n| File | Native size | Rendering | Insets TRBL | Content padding TRBL | Geometry minimum |\n| --- | --- | --- | --- | --- | --- |\n${rows}\n`);
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const cards=manifest.assets.map(a=>`<article data-group="${a.file.split('/').slice(0,-1).join('/')}" data-name="${a.id}"><div class="sample"><img src="../${a.file}" width="${a.width}" height="${a.height}" alt="${esc(a.id)}"></div><code>${a.id}</code><small>${a.width} × ${a.height} · ${a.mode}</small></article>`).join('\n');
await write('preview/index.html',`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>VELDRYN · Pixel UI Kit 01</title><style>
*{box-sizing:border-box}body{margin:0;background:#101521;color:#eadcc5;font:15px system-ui,sans-serif}header{padding:48px max(24px,6vw) 32px;border-bottom:1px solid #584034;background:#151d2b}header img{image-rendering:pixelated;max-width:100%;height:auto}h1{font-size:32px;margin:16px 0 8px}p{color:#a5b2c4;max-width:720px;line-height:1.6}.eyebrow{color:#cea363;letter-spacing:.2em;font-size:12px}nav{display:flex;gap:12px;flex-wrap:wrap;padding:22px max(24px,6vw);position:sticky;top:0;background:#101521f5;z-index:2}button,input,select{background:#1b2638;border:1px solid #987044;border-radius:3px;color:#eadcc5;padding:10px;font:inherit}button{cursor:pointer}.grid{padding:0 max(24px,6vw) 40px;display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:18px}article{min-width:0;background:#151d2b;border:1px solid #30425a;padding:18px}.sample{height:248px;display:flex;align-items:center;justify-content:center;overflow:auto;background:repeating-conic-gradient(#1b2638 0% 25%,#243146 0% 50%) 0/16px 16px}.sample img{image-rendering:pixelated;flex:none}code{display:block;color:#efcd91;font-size:12px;margin-top:16px;overflow-wrap:anywhere}small{display:block;color:#9dacbf;margin-top:6px}.light .sample{background:#eee4d3}.dark .sample{background:#101521}a{color:#76cbe4}footer{padding:28px max(24px,6vw);border-top:1px solid #30425a}article[hidden]{display:none}</style>
<header><div class="eyebrow">PRODUCTION ASSET LIBRARY / 01</div><img src="../branding/veldryn_logo.png" width="288" height="96" alt="VELDRYN"><h1>Core UI & first steps</h1><p>${manifest.assets.length} individual art assets. Bronze frames, crystal interactions and clear mobile silhouettes. Inspect transparency below; all component labels remain live application text.</p><a href="../VELDRYN_UI_ASSET_SPEC.md">Asset specification</a> · <a href="../instructions/ASSET_INVENTORY.md">Sizes & slice margins</a></header>
<nav><input id="search" aria-label="Filter assets" placeholder="Find an asset…"><select id="group" aria-label="Category"><option value="">All categories</option>${[...new Set(manifest.assets.map(a=>a.file.split('/').slice(0,-1).join('/')))].map(g=>`<option>${g}</option>`).join('')}</select><button id="checker">Checkerboard</button><button id="dark">Dark</button><button id="light">Light</button><select id="zoom" aria-label="Pixel zoom"><option value="1">1× pixels</option><option value="2">2× pixels</option><option value="3">3× pixels</option></select></nav><main class="grid">${cards}</main><footer>VELDRYN Pixel UI Kit v1.0 · Generated artwork + deterministic PNG export. Local gallery; no remote resources.</footer>
<script>const s=document.getElementById('search'),g=document.getElementById('group');function filter(){document.querySelectorAll('article').forEach(a=>a.hidden=(!a.dataset.name.includes(s.value.toLowerCase())||(g.value&&a.dataset.group!==g.value)))}s.oninput=filter;g.onchange=filter;['checker','dark','light'].forEach(x=>document.getElementById(x).onclick=()=>document.body.className=x);document.getElementById('zoom').onchange=e=>document.querySelectorAll('.sample img').forEach(i=>{i.style.width=Number(i.getAttribute('width'))*Number(e.target.value)+'px';i.style.height=Number(i.getAttribute('height'))*Number(e.target.value)+'px'});</script></html>`);
// Visual contact pages are assembled from final exports, never used as asset sources.
for(let start=0;start<manifest.assets.length;start+=20){
  const batch=manifest.assets.slice(start,start+20),width=1280,height=120+Math.ceil(batch.length/4)*280;
  let svg=`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#101521"/><text x="28" y="48" font-family="sans-serif" font-size="25" fill="#f0d49a">VELDRYN / PIXEL UI KIT 01</text><text x="28" y="78" font-family="sans-serif" font-size="14" fill="#9aacbf">Export inspection · page ${Math.floor(start/20)+1} · native pixel sizes</text>`;
  const comps=[];
  for(let i=0;i<batch.length;i++){
    const a=batch[i],x=20+(i%4)*315,y=108+Math.floor(i/4)*280;
    svg+=`<rect x="${x}" y="${y}" width="302" height="263" fill="#1b2638" stroke="#30425a"/><text x="${x+10}" y="${y+238}" font-family="monospace" font-size="11" fill="#f0d49a">${esc(a.id)}</text><text x="${x+10}" y="${y+254}" font-family="sans-serif" font-size="10" fill="#aabaca">${a.width} × ${a.height} · ${a.mode}</text>`;
    comps.push({input:path.join(root,a.file),left:x+Math.floor((302-a.width)/2),top:y+Math.floor((222-a.height)/2)});
  }
  svg+='</svg>';
  const board=await sharp(Buffer.from(svg)).png().toBuffer();
  await write(`preview/contact-${Math.floor(start/20)+1}.png`,await sharp(board).composite(comps).png().toBuffer());
}
console.log(`Built ${manifest.assets.length}/${jobs.length} assets with density variants, slices, manifest and gallery.`);
