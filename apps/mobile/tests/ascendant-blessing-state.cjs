const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');

const root=path.join(__dirname,'../src/core');
const cache=new Map();
function load(file){
 const abs=path.resolve(root,file.endsWith('.ts')?file:file+'.ts');
 if(cache.has(abs))return cache.get(abs).exports;
 const source=fs.readFileSync(abs,'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const mod={exports:{}};cache.set(abs,mod);
 const localRequire=(request)=>{
  if(request.startsWith('.'))return load(path.relative(root,path.resolve(path.dirname(abs),request)).replace(/\\/g,'/'));
  return require(request);
 };
 new Function('exports','module','require',js)(mod.exports,mod,localRequire);
 return mod.exports;
}
const cosmetics=load('ascendant-cosmetics');
const stateApi=load('ascendant-blessing-state');
const {CELESTIAL_IDS}=cosmetics;
const base={
 character:{id:'c1',selectedCosmeticPetId:CELESTIAL_IDS.pet,profileBackgroundId:CELESTIAL_IDS.background},
 account:{unlockedCosmeticPetIds:[CELESTIAL_IDS.pet],unlockedProfileBackgroundIds:[CELESTIAL_IDS.background]},
};
let state=stateApi.selectAscendantBlessing(base,'pet','gathering_speed');
state=stateApi.selectAscendantBlessing(state,'background','combat_xp');
assert.equal(state.character.ascendantPetBlessing,'gathering_speed');
assert.equal(state.character.ascendantBackgroundBlessing,'combat_xp');
assert.deepEqual(stateApi.previewAscendantBlessingsForState(state),{gathering_speed:500,skill_xp:0,combat_xp:300});
assert.deepEqual(stateApi.activeAscendantBlessingsForState(state),{gathering_speed:0,skill_xp:0,combat_xp:0});

const switched={...state,character:{...state.character,selectedCosmeticPetId:'PET_001'}};
assert.deepEqual(stateApi.previewAscendantBlessingsForState(switched),{gathering_speed:0,skill_xp:0,combat_xp:300});
assert.throws(()=>stateApi.selectAscendantBlessing(switched,'pet','skill_xp'),/ascendant_cosmetic_not_equipped/);

const unowned={...base,account:{...base.account,unlockedCosmeticPetIds:[]}};
assert.throws(()=>stateApi.selectAscendantBlessing(unowned,'pet','skill_xp'),/ascendant_cosmetic_not_owned/);
console.log('Ascendant per-character selection: ownership/equip validation and inactive settlement passed.');
