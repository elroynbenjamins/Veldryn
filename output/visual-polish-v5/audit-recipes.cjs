const fs=require('fs'),path=require('path'),ts=require('../../apps/mobile/node_modules/typescript');
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,f);
require.extensions['.png']=(m,f)=>m.exports=f;
const root=path.resolve(__dirname,'../../apps/mobile/src');
const {RECIPES}=require(root+'/content/skills.ts'),{itemDef}=require(root+'/content/items.ts');
const {resourceIconSourceById}=require(root+'/theme/resource-assets.ts'),{gatheringToolCells}=require(root+'/theme/gathering-tool-assets.ts');
const {equipmentArtworkSetByItemId,equipmentSheetBySet}=require(root+'/theme/equipment-assets.ts'),{equipmentFallbackSetByItemId}=require(root+'/theme/equipment-fallback-art.ts');
function art(id){const item=itemDef(id);if(resourceIconSourceById[id])return 'dedicated';if(gatheringToolCells[id])return 'tool-atlas';const set=item.noviceSetId??equipmentArtworkSetByItemId[id]??equipmentFallbackSetByItemId[id];if(item.type==='gear'&&set&&equipmentSheetBySet[set])return equipmentFallbackSetByItemId[id]&&!equipmentArtworkSetByItemId[id]?'representative-gear':'gear-atlas';return 'neutral-marker';}
const outputs=[...new Set(RECIPES.map(r=>r.output.itemId))].map(id=>({id,art:art(id)}));
const inputs=[...new Set(RECIPES.flatMap(r=>r.inputs.map(i=>i.itemId)))].map(id=>({id,art:art(id)}));
const report={recipeCount:RECIPES.length,outputs,inputs,missingOutputs:outputs.filter(x=>x.art==='neutral-marker'),genericIngredients:inputs.filter(x=>x.art==='neutral-marker')};
fs.writeFileSync(path.join(__dirname,'recipe-art-audit.json'),JSON.stringify(report,null,2));
if(report.genericIngredients.length||report.missingOutputs.length)throw Error('Unmapped recipe artwork: '+JSON.stringify(report));
console.log('PASS: '+RECIPES.length+' recipe outputs and all '+inputs.length+' unique recipe ingredients have mapped artwork.');
