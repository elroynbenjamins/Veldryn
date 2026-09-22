export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const mapping=read('src/theme/misc-item-assets.ts');
const resolver=read('src/theme/resource-assets.ts');
const artwork=read('src/components/ResourceArtwork.tsx');

const ids=[
 'ROYAL_CHITIN','BOAR_HIDE','WOLF_PELT','IRONWOOD_FANG','BLACKGLASS_CORE',
 'CINDER_HEART','REGENT_SIGIL','EVENT_BONDBLOOM','TRAVEL_RATION','FALLEN_KNIGHT_SIGIL',
];
for(const id of ids)ok(mapping.includes(id+':'),'Missing unified miscellaneous artwork mapping for '+id);
ok(mapping.includes("data:image/png;base64,"),'Unified miscellaneous atlas must be an embedded runtime image source');
ok(resolver.includes('hasMiscItemArtwork(itemId)'),'Shared resource resolver must recognize unified miscellaneous artwork');
const miscIndex=artwork.indexOf('const misc=miscItemCell(itemId)');
const runtimeIndex=artwork.indexOf('const runtime=runtimeItemCell(itemId)');
ok(miscIndex>=0&&runtimeIndex>=0&&miscIndex<runtimeIndex,'Unified miscellaneous artwork must override older runtime fallback artwork');
console.log('PASS: unified miscellaneous item visuals override the older runtime atlas');
