import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'file:///C:/Users/elroy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.cjs';

const workspace=process.cwd();
const generated='C:/Users/elroy/.codex/generated_images/01a081fc-9992-7b13-8fd8-684ef81b7f44';
const sets=[
  ['aster_iron','exec-caa72e78-9b39-4e92-b1b4-1a55013e01d8.png'],
  ['rootbound_covenant','exec-169b1438-94cd-4387-8c1b-c459bef07bd9.png'],
  ['lastwall_panoply','exec-901bda57-f2bd-4703-90c1-4610c95f3642.png'],
  ['mournchain_harness','exec-b7c99376-be37-4ed4-ac47-2309f876cbd7.png'],
  ['thread_of_dawn','exec-29865aae-7d0d-47b5-a507-380d5c37618a.png'],
  ['regretwalker','exec-a28eca88-0a80-4167-ae81-9b0de4bbe4a3.png'],
  ['lanternsteel_array','exec-c1ac0511-e374-46e1-80a6-93147413075e.png'],
  ['glassbound_script','exec-9d122d85-29ad-43ce-9566-bb8955846ef9.png'],
  ['gloamstep_regalia','exec-c3c07f6d-6652-4258-a307-baa4ab2f3783.png'],
  ['resonant_tempest','exec-fd5b1de3-89b3-4f2d-965c-90e28d0a3b8a.png'],
  ['glassward_covenant','exec-39a7b1dd-97b6-4fc6-86cb-b9439578113a.png'],
  ['sunvault_panoply','exec-6c696fed-4c85-4eec-8e0e-9c43896c6080.png'],
  ['cinderchain_harness','exec-9683db81-22ee-4f78-b938-f02918158740.png'],
  ['dawn_of_saffron','exec-a58c5686-4456-4319-90b4-5cb340ee6ab6.png'],
  ['mirage_hunter','exec-ae264c81-0ed0-407a-98be-6da5aabb4b39.png'],
  ['scorchblood_array','exec-0db29e7a-6fb1-4e7b-8333-214cafa47d71.png'],
  ['astral_script','exec-785e4087-11b7-497e-ad58-1fa739c812a4.png'],
  ['dunestep_regalia','exec-f542d4ae-500e-45bb-9460-ef4f59d9028f.png'],
  ['oasis_resonance','exec-d9609de6-8fe0-473b-8f6b-40c6346bae04.png'],
  ['rimewall_oath','exec-f4dff843-0515-4044-8b48-030d57a7bd8f.png'],
  ['frostbell_panoply','exec-66d8a8f4-aa16-47d3-8703-8330c0423882.png'],
  ['winterchain_harness','exec-d4d19292-d58e-4f57-8c29-6c6c4c10c32b.png'],
  ['aurora_vespers','exec-475c685b-e422-40f3-bf5a-9277bd975cd2.png'],
  ['whiteout_stalker','exec-b31e48d0-1134-411f-be04-4f2701438d62.png'],
  ['glacierblood_array','exec-56df40f5-ae66-4ce3-b7f9-d63977ee2cfd.png'],
  ['rimeglass_script','exec-ef10edaf-93a8-4417-8e65-bb0b46cb8dd2.png'],
  ['snowveil_regalia','exec-14bfc42e-eeb3-48e5-8a03-a23a8cda8f8a.png'],
  ['choirfrost_resonance','exec-49d68d7e-5592-4aa3-b165-1c2b56ee6cbd.png'],
  ['runespark_adept','exec-3ff03022-ab32-43ae-8387-2fbd388c7b5e.png'],
];

const reviewRoot=path.join(workspace,'apps/mobile/art-review/accepted-set-skins-front-v1');
const activeRoot=path.join(workspace,'apps/mobile/assets/character-runtime/accepted-front-v1');

for(const [id,sourceName] of sets){
  const source=path.join(generated,sourceName);
  const reviewDir=path.join(reviewRoot,id.replaceAll('_','-'));
  const activeDir=path.join(activeRoot,id.replaceAll('_','-'));
  await fs.mkdir(reviewDir,{recursive:true});
  await fs.mkdir(activeDir,{recursive:true});
  await fs.copyFile(source,path.join(reviewDir,'male-female-front-source.png'));
  const metadata=await sharp(source).metadata();
  const cellWidth=Math.floor(metadata.width/2);
  for(const [name,column] of [['male-front.png',0],['female-front.png',1]]){
    const portrait=await sharp(source)
      .extract({left:column*cellWidth,top:0,width:cellWidth,height:metadata.height})
      .resize(1024,1536,{fit:'contain',kernel:'nearest',background:{r:4,g:3,b:2,alpha:1}})
      .png()
      .toBuffer();
    await Promise.all([
      fs.writeFile(path.join(reviewDir,name),portrait),
      fs.writeFile(path.join(activeDir,name),portrait),
    ]);
  }
}

for(const [id] of sets){
  for(const name of ['male-front.png','female-front.png']){
    const file=path.join(activeRoot,id.replaceAll('_','-'),name);
    const meta=await sharp(file).metadata();
    if(meta.width!==1024||meta.height!==1536)throw new Error(`Invalid runtime portrait ${id}/${name}`);
  }
}

const cellWidth=320,cellHeight=240,columns=5,rows=Math.ceil(sets.length/columns);
const contactLayers=[];
for(let index=0;index<sets.length;index++){
  const [id,sourceName]=sets[index];
  const thumb=await sharp(path.join(generated,sourceName)).resize(cellWidth,213,{fit:'contain',background:'#080604'}).png().toBuffer();
  const label=id.replaceAll('_',' ').replace(/\b\w/g,letter=>letter.toUpperCase());
  const svg=Buffer.from(`<svg width="${cellWidth}" height="27"><rect width="100%" height="100%" fill="#080604"/><text x="160" y="19" text-anchor="middle" fill="#e7d7b8" font-family="Arial" font-size="14">${label}</text></svg>`);
  const left=(index%columns)*cellWidth,top=Math.floor(index/columns)*cellHeight;
  contactLayers.push({input:thumb,left,top},{input:svg,left,top:top+213});
}
await sharp({create:{width:columns*cellWidth,height:rows*cellHeight,channels:3,background:'#080604'}})
  .composite(contactLayers)
  .png()
  .toFile(path.join(reviewRoot,'review-contact-sheet.png'));

console.log(`PASS: ${sets.length} accepted set strips produced ${sets.length*2} front-only runtime portraits.`);
