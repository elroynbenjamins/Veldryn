export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const read=(path:string)=>fs.readFileSync(path,'utf8');
const mapping=read('src/theme/asterfall-ingredient-assets.ts');
const resolver=read('src/theme/resource-assets.ts');
const artwork=read('src/components/ResourceArtwork.tsx');
const ids=['BOAR_HIDE','WOLF_PELT','IRONWOOD_FANG','MOSS_FIBER','WISP_DUST','THORN_SAP','TROLL_HIDE','ECHO_BAT_WING','OATHGLASS_SHARD','TORN_OATHCLOTH','LANTERNSTEEL_SHARD','FALLEN_RIVET','ECHO_TOUCHED_PELT','BANNER_ASH','OATHGLASS_FRAGMENT','GLOAM_DUST'];
for(const id of ids)ok(mapping.includes(id+':'),'Missing Asterfall ingredient mapping for '+id);
ok(mapping.includes("data:image/png;base64,"),'Asterfall ingredient atlas must be embedded');
ok(resolver.includes('hasAsterfallIngredientArtwork(itemId)'),'Shared resolver must recognize Asterfall ingredient atlas');
const miscIndex=artwork.indexOf('const misc=miscItemCell(itemId)');
const ingredientIndex=artwork.indexOf('const asterfallIngredient=asterfallIngredientCell(itemId)');
const runtimeIndex=artwork.indexOf('const runtime=runtimeItemCell(itemId)');
ok(miscIndex>=0&&ingredientIndex>miscIndex,'Latest misc hide/fang art must keep priority over duplicate ingredient cells');
ok(runtimeIndex>ingredientIndex,'Unified Asterfall ingredient art must override legacy runtime fallbacks');
console.log('PASS: unified Asterfall ingredient art replaces older mixed-style ingredient assets safely');
