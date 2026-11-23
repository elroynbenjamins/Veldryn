/**
 * Hidden original-Forge to Combat 2.0 source affix compatibility contract.
 * This test authorizes ZERO production rolls, balances or item mutations.
 */
import {strict as assert} from 'node:assert';
import {
 reviewForgeNewMintAffixPolicyV2,reviewProposedForgeRoleSlotAffixesV2,
 FORGE_AFFIX_POOL_RECONCILIATION_REVIEW_VERSION_V2,
} from '../equipment-forge-affix-pool-reconciliation-review';
import {V2_SERVER_PIECES,V2_SERVER_RECIPES}
 from '../../../equipment/equipment-crafting-v2-manifest';
import {draftEquipmentV2Outcome,V2_SERVER_RARITY_BANDS,
 V2_SERVER_AFFIX_RANGES,EQUIPMENT_V2_SERVER_RULES_VERSION,
 v2ServerAuthoredAffixChoices,
 type V2Role,type V2Slot}
 from '../../../equipment/equipment-crafting-v2-rolls';
import {EQ2_COMBAT_FROZEN_AFFIX_MAP_V2}
 from '../equipment-frozen-forge-bridge';
import {EQUIPMENT_AFFIXES_V2} from '../equipment-affixes';
import {auditRealForgeTenSlotsV2}
 from '../equipment-frozen-forge-slot-audit';

const roleSlots=['tank','damage','support'] as const;
const slots=['helmet','chest','gloves','legs','boots','weapon','offhand',
 'cape','amulet','ring'] as const;
const unchanged=V2_SERVER_PIECES.map(piece=>{
 const recipe=V2_SERVER_RECIPES.find(x=>
  x.pieceId===piece.id&&x.route==='foundation');
 assert.ok(recipe);
 return draftEquipmentV2Outcome({
  pieceId:piece.id,recipeId:recipe!.id,tier:piece.tier,
  role:piece.role,slot:piece.slot,
 },max=>0);
});
const report=reviewForgeNewMintAffixPolicyV2();
assert.deepEqual(reviewForgeNewMintAffixPolicyV2(),report,
 'Review must be deterministic without reading client or QA inventory');
assert.equal(report.scope,'EQ2_NEW_MINT_AFFIX_POOL_REVIEW_NOT_A_GENERATOR');
assert.equal(report.version,FORGE_AFFIX_POOL_RECONCILIATION_REVIEW_VERSION_V2);
assert.equal(report.actualForgeTemplates,169);
assert.equal(report.actualForgeRecipes,338);
assert.equal(report.physicalClassTierSlotCells,340);
assert.equal(report.originalEmptyOffhandReservations,20);
assert.equal(report.originalPhysicalCellsWithoutCompatibleAffix,88);
assert.equal(report.originalPhysicalCellsWithUnsafeRng,316);
assert.equal(report.originalPhysicalCellsWithMaxRarityShortage,168);
assert.equal(report.proposedPhysicalCellsWithoutCandidateCoverage,0);
assert.equal(report.uniqueRoleSlotPolicies,30);
assert.equal(report.roleSlots.length,30);
assert.equal(report.originalRngUnchanged,true);
assert.equal(report.originalPotencyQuarantined,true);
assert.equal(report.ownerApprovalRequired,true);
assert.equal(report.newRulesVersionRequired,true);
assert.equal(report.executableNewMintPolicy,false);
assert.equal(report.authorizedProductionRolls,0);
assert.equal(report.actualPersistedItemsRewritten,0);
assert.ok(report.uniqueRoleSlotPoliciesNeedingNewRoleCandidates>0);
assert.ok(report.sourceTemplatesThatWouldNeedNewMintPolicy>0);
assert.equal(V2_SERVER_RARITY_BANDS.length,6);
const maxRolls=Math.max(...V2_SERVER_RARITY_BANDS.flatMap(b=>[
 b.affixesLowTier,b.affixesHighTier]));
assert.equal(maxRolls,3);
const seen=new Set<string>();
for(const role of roleSlots){
 for(const slot of slots){
  const proposal=reviewProposedForgeRoleSlotAffixesV2(role,slot);
  const key=role+'|'+slot;
  assert.ok(!seen.has(key));
  seen.add(key);
  assert.deepEqual(report.roleSlots.find(x=>x.role===role&&x.slot===slot),
   proposal);
  assert.deepEqual(proposal.originalRoleCandidates,
   v2ServerAuthoredAffixChoices(role,slot));
  assert.equal(proposal.role,role);
  assert.equal(proposal.slot,slot);
  assert.ok(proposal.proposedCombatCompatible.length>=maxRolls);
  assert.ok(proposal.proposedCombatCompatible.length<=4);
  assert.equal(new Set(proposal.proposedCombatCompatible).size,
   proposal.proposedCombatCompatible.length);
  assert.equal(proposal.highestCurrentRarityRollCount,3);
  assert.equal(proposal.weightsApproved,false);
  assert.equal(proposal.eligibleForActualMint,false);
  assert.equal(proposal.executableCombatAuthorized,false);
  assert.equal(proposal.requiresMintRulesVersionChange,true);
  for(const stat of proposal.proposedCombatCompatible){
   assert.notEqual(stat,'potency');
   assert.ok(Object.prototype.hasOwnProperty.call(V2_SERVER_AFFIX_RANGES,stat));
   const mapped=EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[stat];
   assert.ok(mapped,'Every proposed stat must map to existing Combat effect');
   assert.equal(EQUIPMENT_AFFIXES_V2[mapped!].runtime,'supported');
   assert.ok(EQUIPMENT_AFFIXES_V2[mapped!].slots.includes(slot));
  }
  for(const stat of proposal.proposedNewRoleCandidates){
   assert.ok(!proposal.originalRoleCandidates.includes(stat));
   assert.ok(proposal.proposedCombatCompatible.includes(stat));
  }
  for(const stat of proposal.originalRejectedOrOffSlot)
   assert.ok(!proposal.proposedCombatCompatible.includes(stat));
  for(const band of V2_SERVER_RARITY_BANDS){
   assert.ok(proposal.proposedCombatCompatible.length>=
    band.affixesLowTier);
   assert.ok(proposal.proposedCombatCompatible.length>=
    band.affixesHighTier);
  }
 }
}
assert.equal(seen.size,30);
const tankGlove=reviewProposedForgeRoleSlotAffixesV2('tank','gloves');
assert.equal(tankGlove.originallyCombatCompatible.length,0);
assert.equal(tankGlove.proposedCombatCompatible.length,4);
const damageHelm=reviewProposedForgeRoleSlotAffixesV2('damage','helmet');
assert.equal(damageHelm.originallyCombatCompatible.length,0);
assert.equal(damageHelm.proposedCombatCompatible.length,4);
const supportCape=reviewProposedForgeRoleSlotAffixesV2('support','cape');
assert.ok(supportCape.originalRejectedOrOffSlot.includes('potency'));
assert.ok(!supportCape.proposedCombatCompatible.includes('potency'));
assert.throws(()=>reviewProposedForgeRoleSlotAffixesV2(
 'SOME_CHEAT' as V2Role,'gloves'),/unknown_role_or_slot/);
assert.throws(()=>reviewProposedForgeRoleSlotAffixesV2(
 'tank','second_ring' as V2Slot),/unknown_role_or_slot/);

const audit=auditRealForgeTenSlotsV2();
const existingSources=new Set(V2_SERVER_PIECES.map(x=>x.id));
assert.equal(existingSources.size,169);
for(const cell of audit.cells.filter(c=>c.sourceCoverage==='present')){
 const proposal=reviewProposedForgeRoleSlotAffixesV2(
  ({IRONWARDEN:'tank',BASTION:'tank',DREADGUARD:'tank',
    WAYFINDER:'damage',RAVAGER:'damage',HEXWEAVER:'damage',
    KNIFE_DANCER:'damage',DAWNKEEPER:'support',STONECALLER:'support'} as const)[cell.classId],
  cell.slot);
 assert.ok(proposal.proposedCombatCompatible.length>=cell.maximumAuthoredAffixRolls);
 for(const pieceId of cell.eligibleSourcePieceIds)
  assert.ok(existingSources.has(pieceId));
}
const replay=V2_SERVER_PIECES.map(piece=>{
 const recipe=V2_SERVER_RECIPES.find(x=>
  x.pieceId===piece.id&&x.route==='foundation');
 assert.ok(recipe);
 return draftEquipmentV2Outcome({
  pieceId:piece.id,recipeId:recipe!.id,tier:piece.tier,
  role:piece.role,slot:piece.slot,
 },max=>0);
});
assert.deepEqual(replay,unchanged,
 'Review must not patch legacy Forge original RNG, rarity, copy or roll');
assert.ok(replay.every(x=>x.rulesVersion===EQUIPMENT_V2_SERVER_RULES_VERSION),
 'No actual mint uses a proposed review-version tag');
console.log(JSON.stringify({
 kind:report.scope,policies:report.uniqueRoleSlotPolicies,
 needingRoleCandidateAuthoring:report.uniqueRoleSlotPoliciesNeedingNewRoleCandidates,
 templatesRequiringNewMintPolicy:report.sourceTemplatesThatWouldNeedNewMintPolicy,
 physicalCells:report.physicalClassTierSlotCells,
 proposalCoverageGaps:report.proposedPhysicalCellsWithoutCandidateCoverage,
 originalRngStillUnchanged:true,productionRollsAuthorized:0,
}));
