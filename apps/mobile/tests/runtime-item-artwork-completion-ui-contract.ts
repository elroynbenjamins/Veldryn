export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');
const resolver=read('src/theme/resource-assets.ts');
const consumables=read('src/theme/consumable-assets.ts');
const ingredients=read('src/theme/ingredient-assets.ts');
const consumableIds=[
'DEWLEAF','RIVER_MINT','IRONBLOOM','CAVELICHEN','CROWN_SAGE','OATHBLOSSOM','SUNSCALE','FROSTBLOOM','ASHEN_MYRRH',
'DEWLEAF_DRAUGHT','RIVERHEART_DRAUGHT','OATHBLOOM_DRAUGHT','VIGOR_TONIC','GREATER_VIGOR_TONIC','OATH_VIGOR_TONIC','WARD_TONIC','GREATER_WARD_TONIC','OATH_WARD_TONIC'];
const ingredientIds=['ROYAL_CHITIN','BOAR_HIDE','WOLF_PELT','IRONWOOD_FANG','BLACKGLASS_CORE','CINDER_HEART','REGENT_SIGIL','EVENT_BONDBLOOM','TRAVEL_RATION','FALLEN_KNIGHT_SIGIL'];
for(const id of consumableIds)ok(consumables.includes(id+':'),'Missing consumable artwork mapping for '+id);
for(const id of ingredientIds)ok(ingredients.includes(id+':require('),'Missing direct ingredient artwork mapping for '+id);
ok(!resolver.includes('hasRuntimeItemArtwork(itemId)'),'Shared resolver must not keep the dead runtime atlas fallback');
console.log('PASS: previously missing runtime items resolve through canonical consumable or ingredient artwork');
