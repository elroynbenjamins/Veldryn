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
ok(sourceIndex>=0&&oreIndex>sourceIndex,'Bundled resource PNGs must render first, with ore atlas fallback');
// The approved Asterfall Mineral Essence must use a real transparent PNG, not
// the generic fallback icon or an incomplete resource atlas entry.
const fsBinary=require('fs') as {readFileSync:(path:string)=>Uint8Array};
const mineralIconPath='assets/items/resources/asterfall_mineral_essence.png';
ok(resolver.includes("ASTERFALL_MINERAL_ESSENCE:require('../../"+mineralIconPath+"')"),
  'Asterfall Mineral Essence must resolve the actual approved direct icon');
const icon=fsBinary.readFileSync(mineralIconPath);
ok(icon.length>1000&&icon[0]===137&&icon[1]===80&&icon[2]===78&&icon[3]===71,
  'Approved mineral icon must be a nonempty PNG');
const width=(icon[16]*2**24+icon[17]*2**16+icon[18]*256+icon[19]);
const height=(icon[20]*2**24+icon[21]*2**16+icon[22]*256+icon[23]);
ok(width===256&&height===256,'Mineral resource icon must use the 256×256 export size');
const colorType=icon[25];
const hasTransparencyChunk=icon.some((byte,index)=>byte===116&&icon[index+1]===82&&icon[index+2]===78&&icon[index+3]===83);
ok(colorType===6||(colorType===3&&hasTransparencyChunk),
  'Approved mineral icon must contain transparency');
ok(artwork.includes('const source=resourceIconSource(itemId)'),
  'Mining drop, item inventory, Codex and material cost views must share resource artwork');
console.log('PASS: unified Asterfall ore visuals override older standalone resource artwork');
