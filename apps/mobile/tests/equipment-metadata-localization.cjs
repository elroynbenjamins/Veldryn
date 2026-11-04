const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');
require.extensions['.ts']=(module,filename)=>module._compile(
 ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
 }).outputText,filename);
const {equipmentMaterialMetadataRows,equipmentMaterialMetadataText}=require('../src/i18n/equipment-metadata.ts');
const {SUPPORTED_LANGUAGES}=require('../src/i18n/languages.ts');
const source='EQUIPMENT 2.0 · T1/T2/T3 MATERIAL';
const sourceRange='EQUIPMENT 2.0 · T2–T9 MATERIAL';
assert.deepEqual(Object.keys(equipmentMaterialMetadataRows).sort(),[...SUPPORTED_LANGUAGES].sort());
for(const language of SUPPORTED_LANGUAGES){
 const row=equipmentMaterialMetadataRows[language];
 assert.equal(row.split('{tiers}').length,2,language+' requires one tier placeholder');
 assert.equal(equipmentMaterialMetadataText(language,source),row.replace('{tiers}','T1/T2/T3'));
 assert.equal(equipmentMaterialMetadataText(language,sourceRange),row.replace('{tiers}','T2–T9'));
}
assert.equal(equipmentMaterialMetadataText('en',source),source,'English label unchanged');
assert.equal(equipmentMaterialMetadataText('de','PLAYER EQUIPMENT 2.0 · T1 MATERIAL'),undefined,'Unrelated text must not be rewritten');
assert.equal(equipmentMaterialMetadataText('tr','EQUIPMENT 2.0 · IGNORE MATERIAL'),undefined,'Only valid tiers can be substituted');
assert.equal(equipmentMaterialMetadataText('nl','EQUIPMENT 2.0 · T0 MATERIAL'),undefined,'Unsupported tiers must not match');
const gameplay=fs.readFileSync(path.join(__dirname,'../src/i18n/gameplay.ts'),'utf8');
assert.ok(gameplay.includes("import {equipmentMaterialMetadataText} from './equipment-metadata';"),'Gameplay translator must import Equipment 2.0 metadata');
assert.ok(gameplay.includes('equipmentMaterialMetadataText(language,value)'),'Gameplay presentation must route Equipment 2.0 metadata through the translator');
console.log('PASS: equipment tier metadata in all eight languages');
