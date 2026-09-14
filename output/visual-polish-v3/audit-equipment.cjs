
const fs=require('fs'),path=require('path'),vm=require('vm');
const ts=require(path.resolve('apps/mobile/node_modules/typescript')),cache=new Map();
function moduleAt(file){file=path.resolve(file);if(file.endsWith('.png'))return file;if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021}}).outputText;
 vm.runInNewContext(js,{exports,require:id=>id==='react-native'?{StyleSheet:{create:x=>x},Platform:{select:x=>x.default??x.android}}:id.startsWith('.')?moduleAt(path.resolve(path.dirname(file),id+(path.extname(id)?'':'.ts'))):{},Map,Set,console});return exports;}
const {ITEMS}=moduleAt('apps/mobile/src/content/items.ts'),art=moduleAt('apps/mobile/src/theme/equipment-assets.ts');
const {equipmentFallbackSetByItemId:fallback}=moduleAt('apps/mobile/src/theme/equipment-fallback-art.ts');
const gear=ITEMS.filter(x=>x.type==='gear'),missing=gear.filter(x=>!art.equipmentSheetBySet[x.noviceSetId??art.equipmentArtworkSetByItemId[x.id]??fallback[x.id]]);
const report={totalItems:ITEMS.length,gear:gear.length,covered:gear.length-missing.length,representativeAliases:gear.filter(x=>fallback[x.id]).length,missingSheetFiles:Object.values(art.equipmentSheetBySet).filter(p=>!fs.existsSync(p)),missing:missing.map(x=>({id:x.id,slot:x.slot,set:x.equipmentSetId}))};
fs.writeFileSync('output/visual-polish-v3/equipment-art-audit.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
