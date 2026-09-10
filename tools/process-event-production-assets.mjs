import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'file:///C:/Users/elroy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp/dist/index.cjs';

const workspace='C:/Users/elroy/OneDrive/Documents/ChatGPT/Veldryn';
const generated='C:/Users/elroy/.codex/generated_images/01a081fc-9992-7b13-8fd8-684ef81b7f44';
const mobile=path.join(workspace,'apps/mobile');
const equipmentDir=path.join(mobile,'assets/equipment-ui');
const characterDir=path.join(mobile,'assets/character-runtime/events-v1');
const reviewDir=path.join(mobile,'art-review/event-sets-v1/production');

const sets=[
  {id:'harvestwake-harvest-defender',name:'Harvest Defender',event:'Harvestwake',classId:'IRONWARDEN',atlas:'exec-2d2ad4f5-d54f-463d-af74-4d0d477baf61.png',skins:'exec-ecc04a57-9e25-4c9e-8855-8da4f1c4bf4c.png'},
  {id:'harvestwake-granary-bastion',name:'Granary Bastion',event:'Harvestwake',classId:'BASTION',atlas:'exec-29c7e54b-1976-4a4e-9d85-542c75d0052d.png',skins:'exec-cdb611ad-c409-4b23-bcfa-78f23f3adddb.png'},
  {id:'harvestwake-autumn-warden',name:'Autumn Warden',event:'Harvestwake',classId:'DREADGUARD',atlas:'exec-70c5b374-6ea7-4977-a8a3-82512e694420.png',skins:'exec-b270e90c-fb00-4056-874e-17ac84c8e083.png'},
  {id:'harvestwake-hearthkeeper',name:'Hearthkeeper',event:'Harvestwake',classId:'DAWNKEEPER',atlas:'exec-6e40ed77-15d7-4785-8ac0-56923d9ab604.png',skins:'exec-45cc736a-6c9f-465b-9b17-069cc112451a.png'},
  {id:'harvestwake-field-ranger',name:'Field Ranger',event:'Harvestwake',classId:'WAYFINDER',atlas:'exec-e4b810c3-eaa9-47da-b58c-635ee39153b9.png',skins:'exec-186ef187-28ba-424a-9cfd-b432b140591f.png'},
  {id:'harvestwake-reapers-guard',name:"Reaper's Guard",event:'Harvestwake',classId:'RAVAGER',atlas:'exec-2014aa52-8843-4ccb-a802-038871b41442.png',skins:'exec-05a65699-15ee-4e70-a537-6a325c84b9e3.png'},
  {id:'harvestwake-amber-brewer',name:'Amber Brewer',event:'Harvestwake',classId:'HEXWEAVER',atlas:'exec-15041c10-a52f-4900-82d5-834f2cca6b5c.png',skins:'exec-b2c60fec-d426-4a22-9e30-4702b0371e0e.png'},
  {id:'harvestwake-harvest-blade',name:'Harvest Blade',event:'Harvestwake',classId:'KNIFE_DANCER',atlas:'exec-966e431c-251b-47cf-bc0e-76de4ec6de24.png',skins:'exec-4f9506cc-5907-487d-8b3d-d2ccbd8e5909.png'},
  {id:'harvestwake-granary-keeper',name:'Granary Keeper',event:'Harvestwake',classId:'STONECALLER',atlas:'exec-9e722990-7f10-4b07-9e9a-28ae0453b001.png',skins:'exec-2550655a-5793-4809-96a6-534af169fac2.png'},
  {id:'echo-surge',name:'Veilglass Echo',event:'Echo Surge',atlas:'exec-77532f32-bf26-4852-a0a4-35953ee8aad5.png',skins:'exec-40595def-fc1c-4b36-aa97-23247d066242.png'},
  {id:'gatherers-week',name:'Greenhand Jubilee',event:"Gatherer's Week",atlas:'exec-d4957392-d1e6-4a40-a1a5-e95b5b9e616f.png',skins:'exec-94cd09f0-5464-4ff7-94c4-ac311a8a984d.png'},
  {id:'guild-rally',name:'Bannerbound Oath',event:'Guild Rally',atlas:'exec-366c9ede-1ed2-455b-b446-b413008958d9.png',skins:'exec-c87708d0-7e57-448e-a981-e329e0743713.png'},
  {id:'monster-hunt',name:'Trophyfang Pursuit',event:'Monster Hunt',atlas:'exec-79f41184-24d3-4034-9960-0a419ea25fb8.png',skins:'exec-344f96be-06ad-4244-a98c-9e141c15cfd0.png'},
  {id:'coop-festival',name:'Concord Lantern',event:'Co-op Festival',atlas:'exec-fa5614ca-5f9b-429d-a0c7-fb8da8da0fd4.png',skins:'exec-3b4b5061-7cde-4ea4-a28f-5438fbb53a9b.png'},
  {id:'market-fair',name:'Giltroad Finery',event:'Market Fair',atlas:'exec-e5cf9c81-20bd-452d-aa30-81514d3fb80c.png',skins:'exec-5121b2ad-f0e9-461c-b388-f9a936f92772.png'},
  {id:'anniversary-of-veldryn',name:'Firstlight Legacy',event:'Anniversary of Veldryn',atlas:'exec-43ad8775-c4f6-4140-96bb-10e7dd934630.png',skins:'exec-d3e924fb-72f8-4447-9692-829d715ec057.png'},
  {id:'winters-bell',name:'Bellfrost Vigil',event:"Winter's Bell",atlas:'exec-9af66f5b-f9e9-4049-9eaa-b882bfbcf9e2.png',skins:'exec-0211d832-c62f-4e7f-afdf-594304be4448.png'},
];

function checkerToAlpha(data,width,height,channels){
  const count=width*height;
  const candidate=new Uint8Array(count);
  for(let i=0;i<count;i++){
    const o=i*channels,r=data[o],g=data[o+1],b=data[o+2];
    // Image generation sometimes bakes the transparency preview into the PNG.
    // Its checker tiles range from mid-grey to near-white, so classify neutral
    // pixels broadly and only remove connected background-sized regions below.
    candidate[i]=(Math.min(r,g,b)>=130&&Math.max(r,g,b)-Math.min(r,g,b)<=24)?1:0;
  }
  const visited=new Uint8Array(count),remove=new Uint8Array(count),queue=new Int32Array(count);
  for(let start=0;start<count;start++){
    if(!candidate[start]||visited[start])continue;
    let head=0,tail=0,touchesEdge=false;
    queue[tail++]=start;visited[start]=1;
    while(head<tail){
      const p=queue[head++],x=p%width,y=Math.floor(p/width);
      if(x===0||y===0||x===width-1||y===height-1)touchesEdge=true;
      const neighbours=[p-1,p+1,p-width,p+width];
      for(let n=0;n<4;n++){
        const q=neighbours[n];
        if(q<0||q>=count)continue;
        const qx=q%width;
        if((n===0||n===1)&&Math.abs(qx-x)!==1)continue;
        if(candidate[q]&&!visited[q]){visited[q]=1;queue[tail++]=q;}
      }
    }
    if(touchesEdge||tail>=500)for(let i=0;i<tail;i++)remove[queue[i]]=1;
  }
  const rgba=Buffer.alloc(count*4);
  for(let i=0;i<count;i++){
    const source=i*channels,target=i*4;
    rgba[target]=data[source];rgba[target+1]=data[source+1];rgba[target+2]=data[source+2];rgba[target+3]=remove[i]?0:255;
  }
  return rgba;
}

async function processAtlas(source,destination){
  const {data,info}=await sharp(source).raw().toBuffer({resolveWithObject:true});
  const rgba=checkerToAlpha(data,info.width,info.height,info.channels);
  await sharp(rgba,{raw:{width:info.width,height:info.height,channels:4}})
    .resize(2000,800,{fit:'fill',kernel:sharp.kernel.nearest})
    .png({compressionLevel:9})
    .toFile(destination);
}

async function processPortrait(source,left,destination){
  const metadata=await sharp(source).metadata();
  const half=Math.floor(metadata.width/2);
  await sharp(source)
    .extract({left:left?0:half,top:0,width:left?half:metadata.width-half,height:metadata.height})
    .resize(1024,1536,{fit:'contain',kernel:sharp.kernel.nearest,background:'#080604'})
    .png({compressionLevel:9})
    .toFile(destination);
}

await fs.mkdir(equipmentDir,{recursive:true});
await fs.mkdir(characterDir,{recursive:true});
await fs.mkdir(reviewDir,{recursive:true});

for(const set of sets){
  const sourceAtlas=path.join(generated,set.atlas),sourceSkins=path.join(generated,set.skins);
  const atlasPath=path.join(equipmentDir,`event-${set.id}-icon-sheet.png`);
  const skinDir=path.join(characterDir,set.id);
  await fs.mkdir(skinDir,{recursive:true});
  await processAtlas(sourceAtlas,atlasPath);
  await processPortrait(sourceSkins,true,path.join(skinDir,'male-front.png'));
  await processPortrait(sourceSkins,false,path.join(skinDir,'female-front.png'));
}

const manifest=sets.map(({atlas,skins,...set})=>({
  ...set,
  equipmentFile:`event-${set.id}-icon-sheet.png`,
  appearanceId:`event-front-${set.id}`,
}));
await fs.writeFile(path.join(reviewDir,'manifest.json'),`${JSON.stringify(manifest,null,2)}\n`);
console.log(JSON.stringify({sets:sets.length,equipmentAtlases:sets.length,characterPortraits:sets.length*2,reviewDir},null,2));
