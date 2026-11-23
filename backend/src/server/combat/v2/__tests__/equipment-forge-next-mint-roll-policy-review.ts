/** Nonissuable new-mint affix candidate: exhaustive source and trust gates. */
import {strict as assert} from 'node:assert';
import {
 V2_SERVER_PIECES,V2_SERVER_MANIFEST_VERSION,
} from '../../../equipment/equipment-crafting-v2-manifest';
import {
 V2_SERVER_RARITY_BANDS,V2_SERVER_AFFIX_RANGES,
 v2OriginalForgeAffixSourcePoolV2,EQUIPMENT_V2_SERVER_RULES_VERSION,
} from '../../../equipment/equipment-crafting-v2-rolls';
import {EQ2_COMBAT_FROZEN_AFFIX_MAP_V2} from '../equipment-frozen-forge-bridge';
import {EQUIPMENT_AFFIXES_V2} from '../equipment-affixes';
import {
 PROPOSED_FORGE_NEXT_MINT_ROLL_POLICY_V2,
 reviewNextMintAffixCatalogueV2,reviewNextMintAffixPieceV2,
} from '../equipment-forge-next-mint-roll-policy-review';

const report=reviewNextMintAffixCatalogueV2();
const second=reviewNextMintAffixCatalogueV2();
assert.deepEqual(report,second,'same source must yield deterministic review');
assert.equal(report.proposalVersion,PROPOSED_FORGE_NEXT_MINT_ROLL_POLICY_V2);
assert.equal(report.sourceForgeManifest,V2_SERVER_MANIFEST_VERSION);
assert.equal(report.sourceForgeRules,EQUIPMENT_V2_SERVER_RULES_VERSION);
assert.equal(report.templateCount,169);
assert.equal(report.rarityScenarios,1014);
assert.equal(report.scenarios.length,169*6);
assert.equal(report.originalSetMembers,42);
assert.equal(report.failedToFillFullRarityBudget,0);
assert.equal(report.canIssueItems,false);
assert.equal(report.canEditExistingItems,false);
assert.equal(report.originalRngUntouched,true);
assert.equal(report.originalRarityCountsUntouched,true);
assert.equal(report.originalPercentRangesUntouched,true);
assert.equal(report.valueCapsApprovalPending,true);
assert.equal(report.rollWeightRedistributionApprovalPending,true);
assert.equal(report.executableCombatSlotExpansionApprovalPending,true);
assert.equal(report.marketMintProvenanceApprovalPending,true);
assert.ok(report.piecesRequiringAnySlotExtension>0,
 'existing Combat 2.0 slot conflicts must be visible, not invented away');
assert.ok(report.scenariosRequiringAnySlotExtension>0);
assert.ok(report.distinctPendingRoleSlotStats.length>0);
assert.equal(new Set(report.distinctPendingRoleSlotStats).size,
 report.distinctPendingRoleSlotStats.length);
assert.ok(report.distinctPendingRoleSlotStats.every(x=>x.split('|').length===3));
assert.ok(Object.isFrozen(report));
assert.ok(Object.isFrozen(report.scenarios));

let fullRarityTests=0,extensionScenarios=0,oneOrMoreExtensions=0;
let originalsWithPotency=0,pendingPermissions=0,executablePoolItems=0;
const exposed=new Set<string>();
for(const piece of V2_SERVER_PIECES){
 const original=v2OriginalForgeAffixSourcePoolV2(piece.role,piece.slot);
 const originalByStat=new Map(original.map(x=>[x.stat,x]));
 assert.ok(original.length>=4,'source roles must have enough possible distinct stats');
 const totalWeight=original.reduce((n,x)=>n+x.weight,0);
 assert.equal(totalWeight,100,'source original role weights must not be reweighted in this review');
 for(const band of V2_SERVER_RARITY_BANDS){
  const preview=reviewNextMintAffixPieceV2(piece.id,band.rarity);
  const baseline=report.scenarios.find(x=>x.pieceId===piece.id&&x.rarity===band.rarity);
  assert.deepEqual(preview,baseline);
  assert.equal(preview.pieceId,piece.id);
  assert.equal(preview.role,piece.role);
  assert.equal(preview.slot,piece.slot);
  assert.equal(preview.tier,piece.tier);
  assert.equal(preview.forgeSetId,piece.setId??null);
  assert.equal(preview.permittedToMint,false);
  assert.equal(preview.permittedToAlterLegacyOrExistingCopies,false);
  assert.equal(preview.currentSlotPermissionsUnchanged,true);
  assert.equal(preview.potencyRejected,original.some(x=>x.stat==='potency'));
  assert.ok(Object.isFrozen(preview));
  assert.ok(Object.isFrozen(preview.candidates));
  const expectedCount=piece.tier>=3?band.affixesHighTier:band.affixesLowTier;
  assert.equal(preview.exactExistingRarityCount,expectedCount);
  assert.ok(preview.candidates.length>=expectedCount,
   'every original source tier/rarity must have enough distinct roll channels');
  assert.equal(preview.distinctSupportedCandidateStats,preview.candidates.length);
  assert.equal(preview.fullRollBudgetSatisfiableAfterApproval,true);
  const picked=new Set<string>(),mappedIds=new Set<string>();
  let added=0;
  for(const row of preview.candidates){
   assert.ok(Object.isFrozen(row));
   assert.ok(Object.isFrozen(row.originalPercentRange));
   assert.notEqual(row.forgeStat,'potency',
    'generic Potency is not an approved damage/healing mapping');
   assert.ok(originalByStat.has(row.forgeStat),'must not add unrelated-role stats');
   const originalRow=originalByStat.get(row.forgeStat)!;
   assert.equal(row.authoredSourceWeight,originalRow.weight);
   assert.equal(row.authoredSlotPreferred,originalRow.slotPreferred);
   assert.equal(row.combatAffixId,EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[row.forgeStat]);
   const engineDef=EQUIPMENT_AFFIXES_V2[row.combatAffixId];
   assert.equal(engineDef.runtime,'supported');
   const currentlyAllowed=engineDef.slots.includes(piece.slot);
   assert.equal(row.currentCombatSlotValid,currentlyAllowed);
   assert.equal(row.disposition,currentlyAllowed?
    'CURRENT_COMBAT_SLOT_VALID':'PENDING_COMBAT_SLOT_APPROVAL');
   assert.deepEqual(row.originalPercentRange,
    V2_SERVER_AFFIX_RANGES[row.forgeStat][piece.tier-1]);
   assert.equal(row.authoringOnly,true);
   if(!currentlyAllowed){
    added++;
    exposed.add(piece.role+'|'+piece.slot+'|'+row.combatAffixId);
   }
   assert.ok(!picked.has(row.forgeStat),'no duplicate same-stat affixes');
   assert.ok(!mappedIds.has(row.combatAffixId),'no duplicate aliases');
   picked.add(row.forgeStat);
   mappedIds.add(row.combatAffixId);
  }
  assert.equal(added,preview.requiredNewCombatSlotPermissions.length);
  assert.deepEqual(preview.requiredNewCombatSlotPermissions,
   preview.candidates.filter(x=>!x.currentCombatSlotValid).map(x=>x.combatAffixId));
  assert.equal(added>0,
   preview.requiredNewCombatSlotPermissions.length>0);
  assert.ok(preview.candidates.length<=original.length);
  assert.ok(preview.candidates.length<=original.length-Number(preview.potencyRejected));
  // Each pool retains ALL already-legal current-slot source choices.
  assert.equal(preview.candidates.filter(x=>x.currentCombatSlotValid).length,
   original.filter(x=>x.stat!=='potency'&&
    EQUIPMENT_AFFIXES_V2[EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[x.stat]!]
     .slots.includes(piece.slot)).length);
  if(preview.potencyRejected)originalsWithPotency++;
  if(added){extensionScenarios++;pendingPermissions+=added;}
  if(preview.candidates.every(x=>x.currentCombatSlotValid))executablePoolItems++;
  fullRarityTests++;
 }
 if(report.scenarios.some(x=>x.pieceId===piece.id&&
     x.requiredNewCombatSlotPermissions.length))
   oneOrMoreExtensions++;
}
assert.equal(fullRarityTests,1014);
assert.equal(extensionScenarios,report.scenariosRequiringAnySlotExtension);
assert.equal(oneOrMoreExtensions,report.piecesRequiringAnySlotExtension);
assert.deepEqual([...exposed].sort(),report.distinctPendingRoleSlotStats);
assert.ok(originalsWithPotency>0);
assert.ok(pendingPermissions>0);
assert.throws(()=>reviewNextMintAffixPieceV2('LEGACY_T1_WAYFINDER','mythic'),
 /unrecognized_pinned_forge_piece/);
assert.throws(()=>reviewNextMintAffixPieceV2('EQ2_WEAPON_T6_WAYFINDER','mythic'),
 /unrecognized_pinned_forge_piece/);
assert.throws(()=>reviewNextMintAffixPieceV2('', 'common'),
 /unrecognized_pinned_forge_piece/);
assert.throws(()=>reviewNextMintAffixPieceV2('EQ2_WEAPON_T1_WAYFINDER',
 'client_mythic_override' as never),
 /unknown_source_rarity/);
assert.deepEqual(report,reviewNextMintAffixCatalogueV2(),
 'review cannot change original Forge generator tables or draft item copies');
console.log('PASS original Forge next-mint review: ',JSON.stringify({
 sourcePieces:report.templateCount,
 rarityScenarios:report.rarityScenarios,
 noRarityBudgetShortfalls:report.failedToFillFullRarityBudget,
 piecesNeedingProposedSlotExpansion:report.piecesRequiringAnySlotExtension,
 scenariosNeedingExpansion:report.scenariosRequiringAnySlotExtension,
 distinctRoleSlotApprovalDecisions:report.distinctPendingRoleSlotStats.length,
 pendingSlotChoicesAcrossScenarios:pendingPermissions,
 scenariosAlreadyRunnableUnderCurrentSlots:executablePoolItems,
 sourceScenariosIncludingUnmappedPotency:originalsWithPotency,
 originalRngUnchanged:true,originalRollCountsUnchanged:true,
 sourceMagnitudeBandsUnchanged:true,liveMintEnabled:false,
}));
