const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');

const source=fs.readFileSync(path.join(__dirname,'../src/core/ascendant-blessings.ts'),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
const mod={exports:{}};new Function('exports','module','require',js)(mod.exports,mod,require);
const {
 ASCENDANT_BLESSING_CHOICES,
 ASCENDANT_PET_BLESSING_BPS,
 ASCENDANT_BACKGROUND_BLESSING_BPS,
 ASCENDANT_PROGRESSION_BLESSINGS_ENABLED,
 isAscendantBlessing,
 previewAscendantBlessingTotals,
 activeAscendantBlessingTotals,
}=mod.exports;

assert.deepEqual(ASCENDANT_BLESSING_CHOICES,['gathering_speed','skill_xp','combat_xp']);
assert.equal(ASCENDANT_PET_BLESSING_BPS,500);
assert.equal(ASCENDANT_BACKGROUND_BLESSING_BPS,300);
assert.equal(ASCENDANT_PROGRESSION_BLESSINGS_ENABLED,false);
assert(isAscendantBlessing('skill_xp'));
assert(!isAscendantBlessing('damage'));

const valid=(blessing)=>({blessing,equipped:true,owned:true,eligible:true});
assert.deepEqual(previewAscendantBlessingTotals({pet:valid('skill_xp'),background:valid('skill_xp')}),{
 gathering_speed:0,skill_xp:800,combat_xp:0,
});
assert.deepEqual(previewAscendantBlessingTotals({pet:valid('gathering_speed'),background:valid('combat_xp')}),{
 gathering_speed:500,skill_xp:0,combat_xp:300,
});
for(const invalid of [
 {blessing:'skill_xp',equipped:false,owned:true,eligible:true},
 {blessing:'skill_xp',equipped:true,owned:false,eligible:true},
 {blessing:'skill_xp',equipped:true,owned:true,eligible:false},
 {blessing:'damage',equipped:true,owned:true,eligible:true},
]){
 assert.deepEqual(previewAscendantBlessingTotals({pet:invalid}),{gathering_speed:0,skill_xp:0,combat_xp:0});
}
assert.deepEqual(activeAscendantBlessingTotals({pet:valid('skill_xp'),background:valid('skill_xp')}),{
 gathering_speed:0,skill_xp:0,combat_xp:0,
},'closed launch gate must make paid progression inert');
console.log('Ascendant blessing contract: 5/3 preview math and closed gameplay gate passed.');
