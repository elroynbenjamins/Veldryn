export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');
const mapping=read('src/theme/asterfall-ore-assets.ts');
const resolver=read('src/theme/resource-assets.ts');
const artwork=read('src/components/ResourceArtwork.tsx');

const ids=['COPPER_ORE','ASTER_IRON_ORE','OATHSTONE_ORE','ECHO_QUARTZ'];
for(const id of ids)ok(mapping.includes(id+':'),'Missing Asterfall ore artwork mapping for '+id);
ok(mapping.includes("data:image/png;base64,"),'Asterfall ore atlas must be embedded');
ok(resolver.includes('hasAsterfallOreArtwork(itemId)'),'Shared resolver must recognize Asterfall ore artwork');
const oreIndex=artwork.indexOf('const asterfallOre=asterfallOreCell(itemId)');
const sourceIndex=artwork.indexOf('const source=resourceIconSource(itemId)');
ok(oreIndex>=0&&sourceIndex>oreIndex,'Unified ore artwork must override old standalone resource PNGs');
console.log('PASS: unified Asterfall ore visuals override older standalone resource artwork');
