import assert from 'node:assert/strict';
import {EFFECT_GEMS_V34,STAT_GEMS_V34,effectGemValueV34,summarizeEffectGemsV34,validateGemCatalogV34} from './gem-system-v34';
import {GEM_COMBINE_COSTS_V34,dismantleDustV34,gemItemIdV34,unsocketCostV34} from './gem-progression-v34';
import {emptyGemPityStateV34,recipePoolForContentV34,resolveDirectGemRollV34,resolveRecipeRollV34,resonanceCacheChoicesV34,resonanceCacheProgressV34,validateGemAcquisitionV34} from './gem-acquisition-v34';

assert.equal(STAT_GEMS_V34.length,12);
assert.equal(EFFECT_GEMS_V34.length,20);
assert.deepEqual(validateGemCatalogV34(),[]);
assert.deepEqual(validateGemAcquisitionV34(),[]);
assert.equal(effectGemValueV34('effect_execution',5),.018);
assert.equal(gemItemIdV34('effect','effect_momentum',5),'GEM_EFFECT_MOMENTUM_G5');
assert.equal(GEM_COMBINE_COSTS_V34[3].gold,60000);
assert.equal(dismantleDustV34(4),22);
assert.deepEqual(unsocketCostV34(5),{gold:5000,dust:3});

const summary=summarizeEffectGemsV34([
 {familyId:'effect_momentum',grade:5},{familyId:'effect_momentum',grade:3},{familyId:'effect_momentum',grade:1},
]);
assert.equal(summary[0].resonance,3);
assert.equal(summary[0].copies,3);
assert.equal(summary[0].totalValue,.008);
assert.throws(()=>summarizeEffectGemsV34([
 {familyId:'effect_momentum',grade:1},{familyId:'effect_momentum',grade:1},{familyId:'effect_momentum',grade:1},{familyId:'effect_momentum',grade:1},
]),/effect_gem_resonance_cap/);

let pity=emptyGemPityStateV34();let result:ReturnType<typeof resolveDirectGemRollV34>|undefined;
for(let i=0;i<6;i++){result=resolveDirectGemRollV34({contentId:'COP_004',dropRoll:.99,gradeRoll:0,pityState:pity});pity=result.pityState;}
assert.ok(result?.drop,'sixth missed dungeon clear guarantees a mapped Effect Gem');
assert.equal(result?.pityTriggered,true);
assert.equal(result?.drop?.grade,2);

const pool=recipePoolForContentV34('COP_004');
assert.deepEqual(new Set(pool),new Set(['effect_execution','effect_predator']));
const learned=pool.map(id=>`recipe_gem_${id.replace('effect_','')}`);
const duplicate=resolveRecipeRollV34({contentId:'COP_004',roll:0,learnedRecipeIds:learned,pityState:emptyGemPityStateV34(),sourceKind:'dungeon'});
assert.equal(duplicate.dust,25);
assert.equal(duplicate.recipeId,undefined);

const choices=resonanceCacheChoicesV34({className:'Knife Dancer',resonanceCopies:{effect_momentum:2},rolls:[0,.35,.8]});
assert.equal(choices.length,3);
assert.equal(new Set(choices).size,3);
assert.deepEqual(resonanceCacheProgressV34(2),{clears:2,required:3,ready:false});
assert.equal(resonanceCacheProgressV34(3).ready,true);
console.log('V34 gem progression tests passed');
