export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');
const mapping=read('src/theme/runtime-item-assets.ts');
const resolver=read('src/theme/resource-assets.ts');
const artwork=read('src/components/ResourceArtwork.tsx');
const required=[
'DEWLEAF','RIVER_MINT','IRONBLOOM','CAVELICHEN','CROWN_SAGE','OATHBLOSSOM','SUNSCALE','FROSTBLOOM','ASHEN_MYRRH',
'DEWLEAF_DRAUGHT','RIVERHEART_DRAUGHT','OATHBLOOM_DRAUGHT','VIGOR_TONIC','GREATER_VIGOR_TONIC','OATH_VIGOR_TONIC','WARD_TONIC','GREATER_WARD_TONIC','OATH_WARD_TONIC',
'ROYAL_CHITIN','BOAR_HIDE','WOLF_PELT','IRONWOOD_FANG','BLACKGLASS_CORE','CINDER_HEART','REGENT_SIGIL','EVENT_BONDBLOOM','TRAVEL_RATION','FALLEN_KNIGHT_SIGIL'];
for(const id of required)ok(mapping.includes(id+':'),'Missing runtime artwork mapping for '+id);
ok(mapping.includes("require('../../assets/runtime-missing-items-v1.png')"),'Runtime item atlas must be bundled');
ok(resolver.includes('hasRuntimeItemArtwork(itemId)'),'Shared resolver must recognize runtime atlas items');
ok(artwork.includes('runtimeItemCell(itemId)'),'ResourceArtwork must crop runtime atlas cells');
console.log('PASS: all previously missing runtime items have artwork');
