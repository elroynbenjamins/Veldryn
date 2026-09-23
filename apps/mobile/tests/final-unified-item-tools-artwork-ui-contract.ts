export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');

const gathering=read('src/theme/asterfall-gathering-assets.ts');
const crafted=read('src/theme/asterfall-crafted-assets.ts');
const arcane=read('src/theme/arcane-material-assets.ts');
const tools=read('src/theme/gathering-tool-assets.ts');
const toolArtwork=read('src/components/GatheringToolArtwork.tsx');
const resourceArtwork=read('src/components/ResourceArtwork.tsx');
const resolver=read('src/theme/resource-assets.ts');

const gatheringIds=['GREENWOOD_LOG','IRONWOOD_LOG','CROWNWOOD_LOG','SILVERFIN','RIVER_EEL','OATHSCALE_PIKE'];
const craftedIds=['COPPER_INGOT','ASTER_IRON_INGOT','OATHSTONE_INGOT','REINFORCED_FITTING','COOKED_SILVERFIN','SEARED_RIVER_EEL','ROASTED_OATHSCALE','IRONWOOD_STEW'];
const arcaneIds=['ASTRAL_SCRIPT','RUNEBOUND_CORE'];
const toolIds=['COPPER_PICKAXE','ASTER_IRON_PICKAXE','OATHSTONE_PICKAXE','FROSTIRON_PICKAXE','GREENWOOD_HATCHET','ASTER_IRON_HATCHET','OATHSTONE_HATCHET','FROSTIRON_HATCHET','REEDLINE_ROD','IRONWOOD_ROD','OATHSCALE_ROD','RIMEGLASS_ROD'];

for(const id of gatheringIds)ok(gathering.includes(id+':'),'Missing unified gathering artwork mapping for '+id);
for(const id of craftedIds)ok(crafted.includes(id+':'),'Missing unified crafted artwork mapping for '+id);
for(const id of arcaneIds)ok(arcane.includes(id+':'),'Missing unified arcane artwork mapping for '+id);
for(const id of toolIds)ok(tools.includes(id+':'),'Missing regenerated gathering tool mapping for '+id);

ok(gathering.includes("require('../../assets/asterfall-logs-fish-v1.png')"),'Logs/fish atlas must be bundled');
ok(crafted.includes("require('../../assets/asterfall-crafted-v1.png')"),'Crafted atlas must be bundled');
ok(arcane.includes("require('../../assets/arcane-materials-v1.png')"),'Arcane atlas must be bundled');
ok(tools.includes("require('../../assets/tools/gathering-tools-v2.png')"),'Gathering tools must use v2 regenerated atlas');

ok(resolver.includes('hasAsterfallGatheringArtwork(itemId)'),'Shared resolver must recognize logs/fish atlas');
ok(resolver.includes('hasAsterfallCraftedArtwork(itemId)'),'Shared resolver must recognize crafted atlas');
ok(resolver.includes('hasArcaneMaterialArtwork(itemId)'),'Shared resolver must recognize arcane atlas');

const fallbackIndex=resourceArtwork.indexOf('const source=resourceIconSource(itemId)');
for(const needle of ['const asterfallGathering=asterfallGatheringCell(itemId)','const asterfallCrafted=asterfallCraftedCell(itemId)','const arcaneMaterial=arcaneMaterialCell(itemId)']){
  const index=resourceArtwork.indexOf(needle);
  ok(index>=0&&fallbackIndex>index,needle+' must take priority over legacy standalone PNG fallback');
}

ok(toolArtwork.includes('GATHERING_TOOL_SHEET_WIDTH')&&toolArtwork.includes('GATHERING_TOOL_SHEET_HEIGHT'),'Tool artwork must use explicit v2 atlas dimensions');
ok(!toolArtwork.includes('ATLAS_ASPECT'),'Old gathering-tool atlas aspect workaround must be removed');

console.log('PASS: remaining Asterfall resources, crafted items, arcane materials, and all gathering tools use unified artwork');
