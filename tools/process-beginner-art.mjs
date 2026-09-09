import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'file:///C:/Users/elroy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.cjs';

const workspace=process.cwd();
const generated='C:/Users/elroy/.codex/generated_images/01a081fc-9992-7b13-8fd8-684ef81b7f44';
const sets=[
  ['ironwarden-recruit','exec-46b9b5a2-5892-4d9d-8dff-3c3ea89b8d86.png','exec-62b81bfa-4d55-40cf-8a37-3a07966a173a.png'],
  ['wallkeeper-initiate','exec-78c792be-df03-48e1-a3cc-9b0ec8429972.png','exec-aa5c5940-f6c2-4054-815d-877e1e79a210.png'],
  ['chainwatch-novice','exec-bfbef1b1-2caf-4e4e-b7e2-689db73a121d.png','exec-abe95d52-fff9-4437-bf0f-ba0b6ef8f228.png'],
  ['sunlamp-acolyte','exec-5591a8e7-fe5d-4218-9ea0-5a76ec4abe98.png','exec-a116019c-8c7d-4bc2-9f82-2bb1e2c6d1a6.png'],
  ['trailbow-scout','exec-6c859da6-9aaf-42c5-957d-4ab87a17a897.png','exec-9b19b766-0af9-4293-8a6e-84b5abf8deeb.png'],
  ['breaksteel-marauder','exec-6d4f8bd0-5828-4cd0-9b86-583f34a95e92.png','exec-66cc2915-afca-4309-8488-ab1449993737.png'],
  ['runespark-adept','exec-334daf3c-d1fd-4b55-96ac-5e3b707e4155.png','exec-6c438617-066f-4b1f-9c57-4829cc91ffac.png'],
  ['twinstep-initiate','exec-fbf85ce5-d19e-4f35-8af3-2e411ad9863f.png','exec-d8f10567-a1ad-4bbe-a63d-ba6a5a8c6224.png'],
  ['earthseal-disciple','exec-8229e700-14f4-488c-966c-cae961633c7c.png','exec-631a3988-a5a5-4b9c-aa67-3482c355b49a.png'],
];

const reviewRoot=path.join(workspace,'apps/mobile/art-review/beginner-sets-v1');
const uiRoot=path.join(workspace,'apps/mobile/assets/equipment-ui');
const skinRoot=path.join(workspace,'apps/mobile/assets/character-runtime/beginner');

async function transparentAtlas(source){
  const {data,info}=await sharp(source)
    .resize(500,250,{kernel:'nearest',fit:'fill'})
    .ensureAlpha()
    .raw()
    .toBuffer({resolveWithObject:true});
  for(let i=0;i<data.length;i+=4){
    const r=data[i],g=data[i+1],b=data[i+2];
    const dr=r-255,dg=g,db=b-255;
    const closeToKey=dr*dr+dg*dg+db*db<22500;
    const pinkFringe=r>150&&b>100&&g<120&&r>g*1.5&&b>g*1.2;
    if(closeToKey||pinkFringe)data[i+3]=0;
  }
  return sharp(data,{raw:info}).resize(2000,1000,{kernel:'nearest'}).png().toBuffer();
}

for(const [id,atlasName,skinName] of sets){
  const reviewUi=path.join(reviewRoot,'equipment-ui',`${id}-icon-sheet.png`);
  const activeUi=path.join(uiRoot,`${id}-icon-sheet.png`);
  const reviewSkin=path.join(reviewRoot,'skins',id);
  const activeSkin=path.join(skinRoot,id);
  await fs.mkdir(path.dirname(reviewUi),{recursive:true});
  await fs.mkdir(reviewSkin,{recursive:true});
  await fs.mkdir(activeSkin,{recursive:true});
  const atlas=await transparentAtlas(path.join(generated,atlasName));
  await Promise.all([fs.writeFile(reviewUi,atlas),fs.writeFile(activeUi,atlas)]);

  const strip=path.join(generated,skinName);
  await fs.copyFile(strip,path.join(reviewSkin,'turnaround-source.png'));
  const metadata=await sharp(strip).metadata();
  const cellWidth=Math.floor(metadata.width/4),cellHeight=metadata.height;
  const views=[['male-front.png',0],['male-back.png',1],['female-front.png',2],['female-back.png',3]];
  for(const [name,column] of views){
    const portrait=await sharp(strip)
      .extract({left:column*cellWidth,top:0,width:cellWidth,height:cellHeight})
      .resize(1024,1536,{fit:'contain',kernel:'nearest',background:{r:4,g:3,b:2,alpha:1}})
      .png()
      .toBuffer();
    await Promise.all([fs.writeFile(path.join(reviewSkin,name),portrait),fs.writeFile(path.join(activeSkin,name),portrait)]);
  }
}

for(const [id] of sets){
  const atlas=path.join(uiRoot,`${id}-icon-sheet.png`);
  const atlasMeta=await sharp(atlas).metadata();
  if(atlasMeta.width!==2000||atlasMeta.height!==1000||!atlasMeta.hasAlpha)throw new Error(`Invalid atlas output: ${id}`);
  const {data,info}=await sharp(atlas).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let transparent=0,fringe=0;
  for(let i=0;i<data.length;i+=info.channels){
    if(data[i+3]===0)transparent++;
    if(data[i+3]>0&&data[i]>150&&data[i+2]>100&&data[i+1]<120&&data[i]>data[i+1]*1.5&&data[i+2]>data[i+1]*1.2)fringe++;
  }
  if(!transparent||fringe)throw new Error(`Atlas transparency audit failed: ${id} (${fringe} key-color pixels)`);
  for(const name of ['male-front.png','male-back.png','female-front.png','female-back.png']){
    const meta=await sharp(path.join(skinRoot,id,name)).metadata();
    if(meta.width!==1024||meta.height!==1536)throw new Error(`Invalid portrait output: ${id}/${name}`);
  }
}

console.log(`PASS: ${sets.length} transparent beginner atlases and ${sets.length*4} 1024x1536 runtime portraits.`);
