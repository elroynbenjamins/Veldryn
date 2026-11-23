/**
 * HIDDEN shadow policy tests. The policy weights here are synthetic QA
 * fixtures, never approved probabilities and never a production roll table.
 */
import {strict as assert} from 'node:assert';
import {
 FORGE_AFFIX_NEW_MINT_SHADOW_VERSION_V2,
 previewForgeAffixNewMintSelectionV2,
 type ForgeShadowPolicyV2,
} from '../equipment-forge-affix-newmint-shadow';
import {
 FORGE_AFFIX_POOL_RECONCILIATION_REVIEW_VERSION_V2,
 reviewProposedForgeRoleSlotAffixesV2,
} from '../equipment-forge-affix-pool-reconciliation-review';
import {
 V2_SERVER_MANIFEST_VERSION,V2_SERVER_PIECES,V2_SERVER_RECIPES,
} from '../../../equipment/equipment-crafting-v2-manifest';
import {
 EQUIPMENT_V2_SERVER_RULES_VERSION,V2_SERVER_RARITY_BANDS,
 V2_SERVER_AFFIX_RANGES,draftEquipmentV2Outcome,
} from '../../../equipment/equipment-crafting-v2-rolls';
import {EQ2_COMBAT_FROZEN_AFFIX_MAP_V2}
 from '../equipment-frozen-forge-bridge';
import {EQUIPMENT_AFFIXES_V2} from '../equipment-affixes';

const roles=['tank','damage','support'] as const;
const slots=['helmet','chest','gloves','legs','boots','weapon',
 'offhand','cape','amulet','ring'] as const;
const fixture:ForgeShadowPolicyV2={
 scope:'REVIEW_FIXTURE_NOT_SIGNED_POLICY',
 shadowVersion:FORGE_AFFIX_NEW_MINT_SHADOW_VERSION_V2,
 manifestVersion:V2_SERVER_MANIFEST_VERSION,
 originalForgeRulesVersion:EQUIPMENT_V2_SERVER_RULES_VERSION,
 proposedCandidatesVersion:FORGE_AFFIX_POOL_RECONCILIATION_REVIEW_VERSION_V2,
 roleSlots:roles.flatMap(role=>slots.map(slot=>({
  role,slot,candidates:reviewProposedForgeRoleSlotAffixesV2(role,slot)
   .proposedCombatCompatible.map((stat,i)=>({stat,weight:i+1})),
 }))),
};
assert.equal(fixture.roleSlots.length,30);
const sourceById=new Map(V2_SERVER_PIECES.map(x=>[x.id,x]));
assert.equal(sourceById.size,169);
const firstRecipe=new Map(V2_SERVER_RECIPES
 .filter(recipe=>recipe.route==='foundation')
 .map(recipe=>[recipe.pieceId,recipe]));
assert.equal(firstRecipe.size,169);
const original=V2_SERVER_PIECES.map(piece=>{
 const recipe=firstRecipe.get(piece.id);
 assert.ok(recipe);
 return draftEquipmentV2Outcome({
  pieceId:piece.id,recipeId:recipe!.id,
  role:piece.role,slot:piece.slot,tier:piece.tier,
 },()=>0);
});
let previews=0,rarityTallies=0,stats=0,maximumCount=0;
for(const piece of V2_SERVER_PIECES){
 const recipe=firstRecipe.get(piece.id);
 assert.ok(recipe);
 for(const band of V2_SERVER_RARITY_BANDS){
  for(const draw of [(_max:number)=>0,(max:number)=>max-1]){
   const selected=previewForgeAffixNewMintSelectionV2(
    fixture,{pieceId:piece.id,recipeId:recipe!.id,rarity:band.rarity},
    draw);
   const repeat=previewForgeAffixNewMintSelectionV2(
    fixture,{pieceId:piece.id,recipeId:recipe!.id,rarity:band.rarity},
    draw);
   assert.deepEqual(selected,repeat,'pure, deterministic QA selection');
   assert.equal(selected.scope,'EQ2_AFFIX_SELECTION_SHADOW_NOT_AN_ITEM');
   assert.equal(selected.shadowVersion,FORGE_AFFIX_NEW_MINT_SHADOW_VERSION_V2);
   assert.equal(selected.sourcePieceId,piece.id);
   assert.equal(selected.sourceRecipeId,recipe!.id);
   assert.equal(selected.role,piece.role);
   assert.equal(selected.slot,piece.slot);
   assert.equal(selected.tier,piece.tier);
   assert.equal(selected.inspectedRarity,band.rarity);
   assert.equal(selected.originalForgeRulesUnchanged,true);
   assert.equal(selected.simulatedProbabilityWeightsUnapproved,true);
   assert.equal(selected.noAuthoritativeMintIdentity,true);
   assert.equal(selected.noReceiptOrCustody,true);
   assert.equal(selected.releaseReady,false);
   assert.ok(!('accountId' in selected));
   assert.ok(!('instanceId' in selected));
   assert.ok(!('rulesVersion' in selected),
    'QA preview cannot masquerade as original Forge item receipt');
   assert.ok(!('baseStatMultiplier' in selected));
   const expectedCount=piece.tier<=2?
    band.affixesLowTier:band.affixesHighTier;
   assert.equal(selected.affixes.length,expectedCount);
   assert.equal(new Set(selected.affixes.map(x=>x.stat)).size,
    selected.affixes.length,'No duplicate affixes on a single simulated item');
   maximumCount=Math.max(maximumCount,expectedCount);
   for(const row of selected.affixes){
    assert.notEqual(row.stat,'potency',
     'Original ambiguous Forge Potency is not secretly mapped');
    assert.equal(row.combatAffixId,EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[row.stat]);
    assert.ok(EQUIPMENT_AFFIXES_V2[row.combatAffixId].slots.includes(piece.slot));
    assert.equal(EQUIPMENT_AFFIXES_V2[row.combatAffixId].runtime,'supported');
    const [lo,hi]=V2_SERVER_AFFIX_RANGES[row.stat][piece.tier-1];
    const min=lo+(hi-lo)*band.low;
    const max=lo+(hi-lo)*band.high;
    assert.ok(row.percent>=min-.011&&row.percent<=max+.011,
     'Shadow magnitude uses only original Forge rarity/tier range');
    assert.ok(Number.isInteger(row.grade)&&row.grade>=0&&row.grade<=100);
    stats++;
   }
   previews++;
  }
  rarityTallies++;
 }
}
assert.equal(previews,169*6*2);
assert.equal(rarityTallies,169*6);
assert.equal(maximumCount,3);
assert.ok(stats>previews);
const after=V2_SERVER_PIECES.map(piece=>{
 const recipe=firstRecipe.get(piece.id);
 assert.ok(recipe);
 return draftEquipmentV2Outcome({
  pieceId:piece.id,recipeId:recipe!.id,role:piece.role,
  slot:piece.slot,tier:piece.tier,
 },()=>0);
});
assert.deepEqual(after,original,
 'Shadow preview cannot change original Forge rolls, RNG or rulesVersion');

const validSource={
 pieceId:V2_SERVER_PIECES[0].id,
 recipeId:firstRecipe.get(V2_SERVER_PIECES[0].id)!.id,
 rarity:'common' as const,
};
function rejected(policy:ForgeShadowPolicyV2,expected:string){
 assert.throws(
  ()=>previewForgeAffixNewMintSelectionV2(policy,validSource,()=>0),
  new RegExp('eq2_affix_shadow_'+expected));
}
const replaceFirst=(changes:Partial<ForgeShadowPolicyV2['roleSlots'][number]>)=>({
 ...fixture,
 roleSlots:[{...fixture.roleSlots[0],...changes},...fixture.roleSlots.slice(1)],
});
const first=fixture.roleSlots[0];
assert.ok(first.candidates.length>=3);
rejected({...fixture,roleSlots:fixture.roleSlots.slice(1)},
 'missing_full_versioned_review_fixture');
rejected({...fixture,roleSlots:[first,...fixture.roleSlots.slice(0,29)]},
 'duplicate_role_slot_row');
rejected(replaceFirst({candidates:first.candidates.slice(1)}),
 'candidate_count_changed');
rejected(replaceFirst({candidates:first.candidates.map((x,i)=>i===0?
  {...x,weight:0}:x)}),'unauthorized_stat_or_unapproved_weight_shape');
rejected(replaceFirst({candidates:first.candidates.map((x,i)=>i===0?
  {...x,weight:1.1}:x)}),'unauthorized_stat_or_unapproved_weight_shape');
rejected(replaceFirst({candidates:first.candidates.map((x,i)=>i===0?
  {...x,weight:Infinity}:x)}),'unauthorized_stat_or_unapproved_weight_shape');
rejected(replaceFirst({candidates:first.candidates.map((x,i)=>i===0?
  {...x,weight:10001}:x)}),'unauthorized_stat_or_unapproved_weight_shape');
rejected(replaceFirst({candidates:first.candidates.map((x,i)=>i===0?
  {...x,stat:'potency'}:x)}),'unauthorized_stat_or_unapproved_weight_shape');
rejected(replaceFirst({candidates:[first.candidates[1],first.candidates[0],
 ...first.candidates.slice(2)]}),'unauthorized_stat_or_unapproved_weight_shape');
rejected({...fixture,manifestVersion:'FORGED' as typeof V2_SERVER_MANIFEST_VERSION},
 'missing_full_versioned_review_fixture');
rejected({...fixture,originalForgeRulesVersion:'FORGED' as
 typeof EQUIPMENT_V2_SERVER_RULES_VERSION},
 'missing_full_versioned_review_fixture');
rejected({...fixture,shadowVersion:'LIVE' as
 typeof FORGE_AFFIX_NEW_MINT_SHADOW_VERSION_V2},
 'missing_full_versioned_review_fixture');
rejected({...fixture,scope:'PRODUCTION' as ForgeShadowPolicyV2['scope']},
 'missing_full_versioned_review_fixture');
assert.throws(()=>previewForgeAffixNewMintSelectionV2(fixture,
 {...validSource,pieceId:'EQ2_FAKE'},()=>0),
 /eq2_affix_shadow_unknown_or_forged_source_recipe/);
assert.throws(()=>previewForgeAffixNewMintSelectionV2(fixture,
 {...validSource,recipeId:'EQ2_FAKE_RECIPE'},()=>0),
 /eq2_affix_shadow_unknown_or_forged_source_recipe/);
assert.throws(()=>previewForgeAffixNewMintSelectionV2(fixture,
 {...validSource,rarity:'cheat' as typeof validSource.rarity},()=>0),
 /eq2_affix_shadow_unknown_source_rarity/);
assert.throws(()=>previewForgeAffixNewMintSelectionV2(fixture,
 validSource,(max)=>max),/eq2_affix_shadow_invalid_qa_rng/);
assert.throws(()=>previewForgeAffixNewMintSelectionV2(fixture,
 validSource,()=>-1),/eq2_affix_shadow_invalid_qa_rng/);
assert.throws(()=>previewForgeAffixNewMintSelectionV2(fixture,
 validSource,()=>NaN),/eq2_affix_shadow_invalid_qa_rng/);
assert.throws(()=>previewForgeAffixNewMintSelectionV2(fixture,
 {...validSource,instanceId:'INJECTED'} as typeof validSource,()=>0),
 /eq2_affix_shadow_invalid_review_request/);
console.log(JSON.stringify({
 kind:'EQ2_AFFIX_NEW_MINT_SHADOW_NOT_ITEM',
 sourceTemplates:V2_SERVER_PIECES.length,
 completeRoleSlotPolicies:fixture.roleSlots.length,
 rarityBands:V2_SERVER_RARITY_BANDS.length,
 deterministicPreviewCases:previews,validatedAffixMagnitudes:stats,
 maximumDistinctAffixes:maximumCount,
 originalForgeOutcomesChanged:0,
 approvedNumericalWeights:0,realMintAuthorizations:0,releaseReady:false,
}));
