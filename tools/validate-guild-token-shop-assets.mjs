import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const fail=(message)=>{throw new Error(message)};

function pngSize(path){
 const bytes=readFileSync(path);
 if(bytes.length<24||bytes.toString('ascii',1,4)!=='PNG')fail(`Not a PNG: ${path}`);
 return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
}
function expectPng(path,width,height){
 const actual=pngSize(resolve(repoRoot,path));
 if(actual.width!==width||actual.height!==height)fail(`${path}: expected ${width}x${height}, got ${actual.width}x${actual.height}`);
}

const portraits=[
 'apps/mobile/assets/guild-token-shop/pets/GUILD_PET_001_Stormwatch_Fox.png',
 'apps/mobile/assets/guild-token-shop/pets/GUILD_PET_002_Oathwood_Wyrmling.png',
 'apps/mobile/assets/guild-token-shop/companions/GUILD_UNIT_001_Stormwatch_Sentinel.png',
 'apps/mobile/assets/guild-token-shop/companions/GUILD_UNIT_002_Oathbound_Seeker.png',
 'apps/mobile/assets/guild-token-shop/companions/GUILD_UNIT_003_Dawncall_Herald.png',
];
for(const path of portraits)expectPng(path,96,96);
expectPng('apps/mobile/assets/guild-token-shop/guild-token.png',128,128);
expectPng('apps/mobile/assets/profile-icons-v1/guild-stormwatch-crest.png',128,128);
for(const id of ['silver','emerald','royal'])expectPng(`apps/mobile/assets/profile-borders/guild-border-${id}.png`,512,512);

const read=(path)=>readFileSync(resolve(repoRoot,path),'utf8');
const shopArt=read('apps/mobile/src/theme/guild-token-shop-art.ts');
for(const id of ['guild_pet_01','guild_pet_02','guild_companion_01','guild_companion_02','guild_companion_03','border_silver','border_emerald','border_royal','icon_guild','emotes_fellowship','emotes_adventure','emotes_legends']){
 if(!shopArt.includes(`'${id}'`))fail(`Guild Token Shop artwork is missing SKU ${id}`);
}
const petArt=read('apps/mobile/src/theme/pet-art.ts');
for(const id of ['GUILD_PET_001','GUILD_PET_002'])if(!petArt.includes(`'${id}'`))fail(`Pet resolver is missing ${id}`);
const companionArt=read('apps/mobile/src/theme/companion-art.ts');
for(const id of ['GUILD_UNIT_001','GUILD_UNIT_002','GUILD_UNIT_003'])if(!companionArt.includes(`'${id}'`))fail(`Companion resolver is missing ${id}`);
const profileIcons=read('apps/mobile/src/theme/profile-icon-assets.ts');
if(!profileIcons.includes("'guild:stormwatch-crest'"))fail('Profile icon artwork is missing Stormwatch Crest');
const borders=read('apps/mobile/src/theme/profile-border-assets.ts');
for(const id of ['guild-border-silver','guild-border-emerald','guild-border-royal'])if(!borders.includes(`'${id}'`))fail(`Profile border artwork is missing ${id}`);

console.log('PASS: Guild Token Shop artwork validated (12 SKUs + shared roster/profile mappings)');
