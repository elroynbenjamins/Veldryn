import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'file:///C:/Users/elroy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.cjs';

const workspace='C:/Users/elroy/OneDrive/Documents/ChatGPT/Veldryn';
const production=path.join(workspace,'apps/mobile/art-review/event-sets-v1/production');
const equipment=path.join(workspace,'apps/mobile/assets/equipment-ui');
const characters=path.join(workspace,'apps/mobile/assets/character-runtime/events-v1');
const manifest=JSON.parse(await fs.readFile(path.join(production,'manifest.json'),'utf8'));

async function labelSvg(label,width,height){
  const safe=label.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#17130f"/><text x="16" y="31" fill="#f2dfb7" font-family="Arial" font-size="20" font-weight="700">${safe}</text></svg>`);
}

async function buildAtlasSheet(){
  const cellW=600,artH=240,labelH=48,cols=2,rows=Math.ceil(manifest.length/cols);
  const layers=[];
  for(let i=0;i<manifest.length;i++){
    const entry=manifest[i],left=(i%cols)*cellW,top=Math.floor(i/cols)*(artH+labelH);
    const art=await sharp(path.join(equipment,entry.equipmentFile)).resize(cellW,artH,{fit:'contain',kernel:sharp.kernel.nearest,background:{r:21,g:17,b:13,alpha:1}}).png().toBuffer();
    layers.push({input:art,left,top},{input:await labelSvg(`${entry.event} — ${entry.name}`,cellW,labelH),left,top:top+artH});
  }
  await sharp({create:{width:cellW*cols,height:(artH+labelH)*rows,channels:4,background:'#15110d'}}).composite(layers).png().toFile(path.join(production,'equipment-review-contact-sheet.png'));
}

async function buildSkinSheet(){
  const cellW=300,artH=450,labelH=58,cols=4,rows=Math.ceil(manifest.length/2);
  const layers=[];
  for(let i=0;i<manifest.length;i++){
    const entry=manifest[i],row=Math.floor(i/2),pair=i%2;
    for(let gender=0;gender<2;gender++){
      const col=pair*2+gender,left=col*cellW,top=row*(artH+labelH);
      const filename=gender===0?'male-front.png':'female-front.png';
      const art=await sharp(path.join(characters,entry.id,filename)).resize(cellW,artH,{fit:'contain',kernel:sharp.kernel.nearest,background:'#080604'}).png().toBuffer();
      layers.push({input:art,left,top},{input:await labelSvg(`${entry.name} — ${gender===0?'Male':'Female'}`,cellW,labelH),left,top:top+artH});
    }
  }
  await sharp({create:{width:cellW*cols,height:(artH+labelH)*rows,channels:4,background:'#080604'}}).composite(layers).png().toFile(path.join(production,'skins-review-contact-sheet.png'));
}

await Promise.all([buildAtlasSheet(),buildSkinSheet()]);
console.log(JSON.stringify({sets:manifest.length,production},null,2));
