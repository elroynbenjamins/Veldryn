import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const fail=(message)=>{throw new Error(message)};
const src=(path)=>resolve(repoRoot,path);
const read=(path)=>readFileSync(src(path),'utf8');

function pngSize(path){
 const bytes=readFileSync(src(path));
 if(bytes.length<24||bytes.toString('hex',0,8)!=='89504e470d0a1a0a')fail(`Not a PNG: ${path}`);
 return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
}
function expectPng(path,width,height){
 const actual=pngSize(path);
 if(actual.width!==width||actual.height!==height)fail(`${path}: expected ${width}x${height}, got ${actual.width}x${actual.height}`);
}
function expectPortrait(path){
 const {width,height}=pngSize(path);
 const bytes=readFileSync(src(path));
 if(width<512||height<512||bytes.length<200_000)fail(`Not a portrait-grade Guild pet PNG: ${path}`);
}
function expectWebp(path){
 const bytes=readFileSync(src(path));
 if(bytes.length<5_000||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')fail(`Invalid optimized Guild Shop WebP: ${path}`);
}
const compactPets=[
 ['GUILD_PET_001','Stormwatch_Fox'],
 ['GUILD_PET_002','Oathwood_Wyrmling'],
];
for(const [id,name] of compactPets){
 expectWebp(`apps/mobile/assets/guild-token-shop/pets/${id}_${name}.webp`);
 expectPortrait(`apps/mobile/assets/guild-token-shop/pets/portraits/${id}_${name}.png`);
}
for(const name of [
 'GUILD_UNIT_001_Stormwatch_Sentinel',
 'GUILD_UNIT_002_Oathbound_Seeker',
 'GUILD_UNIT_003_Dawncall_Herald',
])expectWebp(`apps/mobile/assets/guild-token-shop/companions/${name}.webp`);
expectWebp('apps/mobile/assets/guild-token-shop/guild-token.webp');
expectPng('apps/mobile/assets/profile-icons-v1/guild-stormwatch-crest.png',128,128);
for(const id of ['silver','emerald','royal'])expectPng(`apps/mobile/assets/profile-borders/guild-border-${id}.png`,512,512);

const shopArt=read('apps/mobile/src/theme/guild-token-shop-art.ts');
for(const id of ['guild_pet_01','guild_pet_02','guild_companion_01','guild_companion_02','guild_companion_03','border_silver','border_emerald','border_royal','icon_guild','emotes_fellowship','emotes_adventure','emotes_legends']){
 if(!shopArt.includes(`'${id}'`))fail(`Guild Token Shop artwork is missing SKU ${id}`);
}
for(const [id,name] of compactPets){
 const art=`guild-token-shop/pets/${id}_${name}.webp`;
 if(!shopArt.includes(art))fail(`Missing compact Guild Token Shop art for ${id}`);
}

const petArt=read('apps/mobile/src/theme/pet-art.ts');
for(const [id,name] of compactPets){
 const portrait=`guild-token-shop/pets/portraits/${id}_${name}.png`;
 if(!petArt.includes(`'${id}',require('../../assets/${portrait}')`))fail(`Pet detail resolver is missing high-resolution ${id} portrait`);
}
const companionArt=read('apps/mobile/src/theme/companion-art.ts');
for(const id of ['GUILD_UNIT_001','GUILD_UNIT_002','GUILD_UNIT_003'])if(!companionArt.includes(`'${id}'`))fail(`Companion resolver is missing ${id}`);
const profileIcons=read('apps/mobile/src/theme/profile-icon-assets.ts');
if(!profileIcons.includes("'guild:stormwatch-crest'"))fail('Profile icon artwork is missing Stormwatch Crest');
const borders=read('apps/mobile/src/theme/profile-border-assets.ts');
for(const id of ['guild-border-silver','guild-border-emerald','guild-border-royal'])if(!borders.includes(`'${id}'`))fail(`Profile border artwork is missing ${id}`);
console.log('PASS: Guild Token Shop artwork validated (12 SKUs + 2 high-resolution pet portraits + compact exports)');
