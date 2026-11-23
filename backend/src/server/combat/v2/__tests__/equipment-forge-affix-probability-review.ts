/**
 * HIDDEN QA: source-matched exact probabilities of 1/2/3 independent
 * Forge affix draws without replacement, not approved stat weighting.
 */
import {strict as assert} from 'node:assert';
import {
 reviewExactWeightedAffixDrawV2,
 makeForgeAffixSensitivityFixtureV2,
 reviewForgeAffixSensitivityV2,
} from '../equipment-forge-affix-probability-review';
import {
 inspectForgeShadowPolicyRowsV2,
 previewForgeAffixNewMintSelectionV2,
} from '../equipment-forge-affix-newmint-shadow';
import {
 reviewProposedForgeRoleSlotAffixesV2,
} from '../equipment-forge-affix-pool-reconciliation-review';
import {
 V2_SERVER_PIECES,V2_SERVER_RECIPES,
} from '../../../equipment/equipment-crafting-v2-manifest';
import {
 V2_SERVER_RARITY_BANDS,draftEquipmentV2Outcome,
 EQUIPMENT_V2_SERVER_RULES_VERSION,v2ServerOriginalRoleAffixWeightsForReview,
} from '../../../equipment/equipment-crafting-v2-rolls';

const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-10,
 'Expected '+a+' to be within 1e-10 of '+b);
const sample=[
 {stat:'armor' as const,weight:3},
 {stat:'maxHp' as const,weight:1},
 {stat:'ward' as const,weight:1},
];
const one=reviewExactWeightedAffixDrawV2(sample,1);
assert.equal(one.subsets.length,3);
close(one.inclusion.find(x=>x.stat==='armor')!.probability,.6);
close(one.firstDraw.find(x=>x.stat==='maxHp')!.probability,.2);
const two=reviewExactWeightedAffixDrawV2(sample,2);
assert.equal(two.subsets.length,3);
const get=(stats:readonly string[])=>two.subsets.find(x=>
 x.stats.join('|')===[...stats].sort().join('|'))?.probability;
close(get(['armor','maxHp'])!,.45);
close(get(['armor','ward'])!,.45);
close(get(['maxHp','ward'])!,.1);
close(two.inclusion.find(x=>x.stat==='armor')!.probability,.9);
close(two.inclusion.find(x=>x.stat==='maxHp')!.probability,.55);
close(two.expectedSelectedCount,2);
const three=reviewExactWeightedAffixDrawV2(sample,3);
assert.equal(three.subsets.length,1);
close(three.subsets[0].probability,1);
assert.equal(three.expectedSelectedCount,3);
const four=reviewExactWeightedAffixDrawV2([
 ...sample,{stat:'haste' as const,weight:2},
],3);
assert.equal(four.subsets.length,4);
close(four.probabilityTotal,1);
close(four.inclusion.reduce((n,x)=>n+x.probability,0),3);
assert.ok(four.inclusion.every(x=>x.probability>0&&x.probability<1));
for(const [rows,n] of [
 [sample,0],[sample,4],[sample.slice(0,2),2],
] as const){
 assert.throws(()=>reviewExactWeightedAffixDrawV2(rows,n),
  /eq2_affix_probability_review_invalid_count_or_candidate_pool/);
}
const invalid=[
 [{...sample[0],weight:0},...sample.slice(1)],
 [{...sample[0],weight:1.2},...sample.slice(1)],
 [{...sample[0],weight:Infinity},...sample.slice(1)],
 [{...sample[0],stat:'potency' as const},...sample.slice(1)],
 [{...sample[0],stat:'UNISSUED_STAT' as typeof sample[0]['stat']},...sample.slice(1)],
 [sample[0],sample[0],sample[2]],
];
for(const rows of invalid){
 assert.throws(()=>reviewExactWeightedAffixDrawV2(rows,2),
  /eq2_affix_probability_review_invalid_candidate_weight_or_identity/);
}
assert.throws(()=>makeForgeAffixSensitivityFixtureV2(
 'AUTH' as 'EQUAL_WEIGHT_SENSITIVITY_ONLY'),
 /eq2_affix_probability_review_unknown_sensitivity_scenario/);
const scenarios=[
 'EQUAL_WEIGHT_SENSITIVITY_ONLY',
 'ORIGINAL_ROLE_CONTINUITY_SENSITIVITY_ONLY',
] as const;
const sourceRecipe=new Map(V2_SERVER_RECIPES.filter(r=>r.route==='foundation')
 .map(r=>[r.pieceId,r]));
assert.equal(sourceRecipe.size,169);
const old=V2_SERVER_PIECES.map(piece=>{
 const recipe=sourceRecipe.get(piece.id);
 assert.ok(recipe);
 return draftEquipmentV2Outcome({
  pieceId:piece.id,recipeId:recipe!.id,
  slot:piece.slot,role:piece.role,tier:piece.tier,
 },()=>0);
});
let exactCases=0,subsets=0;
for(const scenario of scenarios){
 const policy=makeForgeAffixSensitivityFixtureV2(scenario);
 const rows=inspectForgeShadowPolicyRowsV2(policy);
 assert.equal(rows.length,30);
 assert.equal(new Set(rows.map(x=>x.role+'|'+x.slot)).size,30);
 if(scenario==='EQUAL_WEIGHT_SENSITIVITY_ONLY')
  assert.ok(rows.every(row=>row.candidates.every(x=>x.weight===100)));
 else for(const row of rows){
  const original=v2ServerOriginalRoleAffixWeightsForReview(row.role);
  const minimum=Math.min(...original.map(x=>x.weight));
  assert.deepEqual(row.candidates.map(x=>x.weight),
   row.candidates.map(x=>
    original.find(source=>source.stat===x.stat)?.weight??minimum));
 }
 const keyed=new Map(rows.map(r=>[r.role+'|'+r.slot,r]));
 for(const piece of V2_SERVER_PIECES){
  const recipe=sourceRecipe.get(piece.id);
  assert.ok(recipe);
  const row=keyed.get(piece.role+'|'+piece.slot);
  assert.ok(row);
  const candidates=reviewProposedForgeRoleSlotAffixesV2(piece.role,piece.slot);
  assert.deepEqual(row!.candidates.map(x=>x.stat),
   candidates.proposedCombatCompatible);
  for(const rarity of V2_SERVER_RARITY_BANDS){
   const count=piece.tier<=2?
    rarity.affixesLowTier:rarity.affixesHighTier;
   const result=reviewExactWeightedAffixDrawV2(row!.candidates,count);
   assert.equal(result.scope,'EQ2_EXACT_SHADOW_PROBABILITY_NO_MINT');
   assert.equal(result.selectionCount,count);
   assert.equal(result.candidateCount,row!.candidates.length);
   assert.equal(result.weightsApproved,false);
   assert.equal(result.signedPolicy,false);
   close(result.probabilityTotal,1);
   close(result.expectedSelectedCount,count);
   close(result.firstDraw.reduce((n,x)=>n+x.probability,0),1);
   assert.ok(result.subsets.length>=1&&result.subsets.length<=4);
   assert.ok(result.subsets.every(x=>x.stats.length===count));
   assert.ok(result.inclusion.every(x=>x.probability>0&&x.probability<=1));
   assert.ok(result.subsets.every(x=>x.probability>0&&x.probability<=1));
   // Re-check a VALID original Forge item still generates against the
   // frozen legacy RNG even after the independent shadow analysis.
   const shadow=previewForgeAffixNewMintSelectionV2(policy,{
    pieceId:piece.id,recipeId:recipe!.id,rarity:rarity.rarity,
   },()=>0);
   assert.equal(shadow.affixes.length,count);
   assert.equal(shadow.releaseReady,false);
   assert.ok(shadow.affixes.every(x=>
    result.inclusion.some(y=>x.stat===y.stat&&y.probability>0)));
   subsets+=result.subsets.length;
   exactCases++;
  }
 }
}
assert.equal(exactCases,169*6*2);
const summary=reviewForgeAffixSensitivityV2();
assert.deepEqual(reviewForgeAffixSensitivityV2(),summary);
assert.equal(summary.scope,'EQ2_AFFIX_PROBABILITY_SENSITIVITY_NO_GAMEPLAY');
assert.equal(summary.originalTemplates,169);
assert.equal(summary.originalRecipes,338);
assert.equal(summary.reviewedRoleSlotPolicies,30);
assert.equal(summary.exactTemplateRarityScenarioCases,2028);
assert.equal(summary.scenarios.length,2);
assert.equal(summary.originalForgeRngUnchanged,true);
assert.equal(summary.noItemMints,true);
assert.equal(summary.approvedStatWeights,0);
assert.equal(summary.releaseReady,false);
for(const scenario of summary.scenarios){
 assert.equal(scenario.sourceTemplateRarityCases,169*6);
 assert.equal(scenario.originalForgeRarityDistributionUnchanged,true);
 assert.equal(scenario.originalRollCountsUnchanged,true);
 assert.equal(scenario.executableNewMintRules,false);
 assert.ok(scenario.uniformTemplateRarityWeightedMeanAtLeastOneNewStat>=0);
 assert.ok(scenario.uniformTemplateRarityWeightedMeanAtLeastOneNewStat<=1);
 assert.ok(scenario.uniformTemplateRarityWeightedMeanNewStatCount>=0);
 assert.ok(scenario.uniformTemplateRarityWeightedMeanNewStatCount<=3);
 assert.ok(scenario.maximumFirstDrawShareAmongTemplates>0);
 assert.ok(scenario.maximumFirstDrawShareAmongTemplates<=1);
}
const unchanged=V2_SERVER_PIECES.map(piece=>{
 const recipe=sourceRecipe.get(piece.id);
 assert.ok(recipe);
 return draftEquipmentV2Outcome({
  pieceId:piece.id,recipeId:recipe!.id,
  slot:piece.slot,role:piece.role,tier:piece.tier,
 },()=>0);
});
assert.deepEqual(old,unchanged,
 'No original Forge RNG item outcomes may change from probability review');
assert.ok(unchanged.every(x=>
 x.rulesVersion===EQUIPMENT_V2_SERVER_RULES_VERSION));
console.log(JSON.stringify({
 kind:summary.scope,exactSourceRarityScenarioCases:exactCases,
 probabilitySubsets:subsets,
 scenarioComparisons:summary.scenarios.map(s=>({
  name:s.scenario,meanAtLeastOneNewStat:
   s.uniformTemplateRarityWeightedMeanAtLeastOneNewStat,
  meanNewStats:s.uniformTemplateRarityWeightedMeanNewStatCount,
  maximumFirstDrawShare:s.maximumFirstDrawShareAmongTemplates,
 })),
 oldForgeOutcomesChanged:0,approvedWeights:0,liveItemGrants:0,
 releaseReady:false,
}));
