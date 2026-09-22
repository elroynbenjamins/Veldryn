export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const map=read('src/theme/consumable-assets.ts');
const resolver=read('src/theme/resource-assets.ts');
const artwork=read('src/components/ResourceArtwork.tsx');

const herbs=['DEWLEAF','RIVER_MINT','IRONBLOOM','CAVELICHEN','CROWN_SAGE','OATHBLOSSOM','SUNSCALE','FROSTBLOOM','ASHEN_MYRRH'];
const potions=['DEWLEAF_DRAUGHT','RIVERHEART_DRAUGHT','OATHBLOOM_DRAUGHT','VIGOR_TONIC','GREATER_VIGOR_TONIC','OATH_VIGOR_TONIC','WARD_TONIC','GREATER_WARD_TONIC','OATH_WARD_TONIC'];
for(const id of [...herbs,...potions])ok(map.includes(id+':'),'Missing consumable artwork mapping for '+id);
ok(resolver.includes('hasConsumableArtwork(itemId)'),'Shared resource resolver must recognize herb/potion artwork');
ok(artwork.includes('consumableArtworkCell(itemId)'),'ResourceArtwork must crop consumable atlas cells');
ok(map.includes("data:image/png;base64,"),'Generated herb/potion atlases must be embedded as runtime image sources');
console.log('PASS: unified herb and potion artwork is mapped through shared item UI');
