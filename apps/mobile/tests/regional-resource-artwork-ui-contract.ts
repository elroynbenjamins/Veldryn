export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const mapping=read('src/theme/regional-resource-assets.ts');
const resolver=read('src/theme/resource-assets.ts');
const artwork=read('src/components/ResourceArtwork.tsx');
const required=[
 'SUNSTONE_ORE','AMBERGLASS','SAFFRON_REED','MIRAGE_BLOOM','DUNEWOOD','CHARBARK',
 'OASIS_CARP','GLASSFIN','SCORPION_VENOM','TYRANT_SEAL',
 'WHITEPINE_LOG','RIME_RESIN','WINTERMINT','ICEFIN','BELLFIN_SCALE','WYRMSCALE',
 'FROZEN_HEART','FROSTIRON','RIMEGLASS','CHOIR_BLOOM',
];
for(const id of required)ok(mapping.includes(id+':'),'Missing unified regional artwork mapping for '+id);
ok(mapping.includes("require('../../assets/regional-resources-v1.png')"),'Regional resource atlas must be a real bundled asset');
ok(resolver.includes('hasRegionalResourceArtwork(itemId)'), 'Shared resource resolver must recognize regional atlas artwork');
ok(artwork.includes('regionalResourceCell(itemId)')&&artwork.includes('AtlasCell')&&artwork.includes('column*size')&&artwork.includes('row*size'),'ResourceArtwork must crop the correct atlas cell');
console.log('PASS: unified Sunscar/Frostmarch resource artwork is mapped into shared item UI');
