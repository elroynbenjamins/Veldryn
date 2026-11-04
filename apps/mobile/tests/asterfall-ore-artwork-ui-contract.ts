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
// The approved Asterfall Mineral Essence is now stored as a compact, transparent
// 256×256 WebP instead of its larger PNG. Verify real bytes, not just a path.
const fsBinary=require('fs') as {readFileSync:(path:string)=>Uint8Array};
const mineralIconPath='assets/items/resources/asterfall_mineral_essence.webp';
ok(resolver.includes("ASTERFALL_MINERAL_ESSENCE:require('../../"+mineralIconPath+"')"),
  'Asterfall Mineral Essence must resolve the approved direct WebP icon');
const icon=fsBinary.readFileSync(mineralIconPath);
const ascii=(from:number,to:number)=>String.fromCharCode(...icon.slice(from,to));
ok(icon.length>1000&&ascii(0,4)==='RIFF'&&ascii(8,12)==='WEBP'&&ascii(12,16)==='VP8L',
  'Approved mineral icon must be a real lossless WebP image');
const pixels=(icon[21]|(icon[22]<<8)|(icon[23]<<16)|(icon[24]<<24))>>>0;
const width=(pixels&0x3fff)+1,height=((pixels>>>14)&0x3fff)+1;
ok(width===256&&height===256,'Mineral resource icon must retain the 256×256 export size');
ok(((pixels>>>28)&1)===1,'Approved mineral icon must contain an alpha channel');
ok(artwork.includes('const source=resourceIconSource(itemId)'),
  'Mining drop, item inventory, Codex and material cost views must share resource artwork');
console.log('PASS: unified Asterfall ore visuals override older standalone resource artwork');
