export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const mapping=read('src/theme/remaining-item-assets.ts');
const resolver=read('src/theme/resource-assets.ts');
const artwork=read('src/components/ResourceArtwork.tsx');

const required=[
 'DEWLEAF','RIVER_MINT','IRONBLOOM','CAVELICHEN','CROWN_SAGE','OATHBLOSSOM','SUNSCALE','FROSTBLOOM','ASHEN_MYRRH',
 'DEWLEAF_DRAUGHT','RIVERHEART_DRAUGHT','OATHBLOOM_DRAUGHT','VIGOR_TONIC','GREATER_VIGOR_TONIC','OATH_VIGOR_TONIC','WARD_TONIC','GREATER_WARD_TONIC','OATH_WARD_TONIC',
 'ROYAL_CHITIN','BOAR_HIDE','WOLF_PELT','IRONWOOD_FANG','BLACKGLASS_CORE','CINDER_HEART','REGENT_SIGIL','EVENT_BONDBLOOM',
 'TRAVEL_RATION','FALLEN_KNIGHT_SIGIL',
];
for(const id of required)ok(mapping.includes(id+':'),'Missing unified artwork mapping for '+id);
ok(mapping.includes("require('../../assets/remaining-items-v1.png')"),'Remaining-item atlas must be a bundled PNG');
ok(resolver.includes('hasRemainingItemArtwork(itemId)'),'Shared resource resolver must recognize remaining-item atlas artwork');
ok(artwork.includes('remainingItemCell(itemId)')&&artwork.includes('remaining.column*size')&&artwork.includes('remaining.row*size'),'ResourceArtwork must crop remaining-item atlas cells');

console.log('PASS: every previously missing runtime non-equipment item has unified artwork');
