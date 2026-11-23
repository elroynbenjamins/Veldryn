/** HIDDEN: universal class- and role-neutral random affix pool proposal.
 * The original Forge role-weighted generator is NOT executed or changed. */
import {strict as assert} from 'node:assert';
import {
 V2_SERVER_PIECES,V2_SERVER_MANIFEST_VERSION,
} from '../../../equipment/equipment-crafting-v2-manifest';
import {
 V2_SERVER_RARITY_BANDS,V2_SERVER_AFFIX_RANGES,
 EQUIPMENT_V2_SERVER_RULES_VERSION,
} from '../../../equipment/equipment-crafting-v2-rolls';
import {EQUIPMENT_AFFIXES_V2} from '../equipment-affixes';
import {EQ2_COMBAT_FROZEN_AFFIX_MAP_V2} from '../equipment-frozen-forge-bridge';
import {
 PROPOSED_FORGE_NEXT_MINT_ROLL_POLICY_V2,
 reviewNextMintAffixCatalogueV2,reviewNextMintAffixPieceV2,
} from '../equipment-forge-next-mint-roll-policy-review';

const report=reviewNextMintAffixCatalogueV2();
assert.deepEqual(report,reviewNextMintAffixCatalogueV2(),
 'pure authoring-only universal review must be reproducible');
assert.equal(report.proposalVersion,PROPOSED_FORGE_NEXT_MINT_ROLL_POLICY_V2);
assert.equal(report.sourceForgeManifest,V2_SERVER_MANIFEST_VERSION);
assert.equal(report.sourceForgeRules,EQUIPMENT_V2_SERVER_RULES_VERSION);
assert.equal(report.templateCount,169);
assert.equal(report.rarityScenarios,169*6);
assert.equal(report.scenarios.length,169*6);
assert.equal(report.originalSetMembers,42);
assert.equal(report.universalSourceAffixes,11);
assert.equal(report.failedToFillFullRarityBudget,0);
assert.equal(report.piecesRequiringAnySlotExtension,0);
assert.equal(report.scenariosRequiringAnySlotExtension,0);
assert.deepEqual(report.distinctPendingRoleSlotStats,[]);
assert.equal(report.sharedAcrossAllClasses,true);
assert.equal(report.sharedAcrossAllRoles,true);
assert.equal(report.randomAffixesNotInnate,true);
assert.equal(report.existingItemClassRequirementsUnchanged,true);
assert.equal(report.originalRngUntouched,true);
assert.equal(report.originalRarityCountsUntouched,true);
assert.equal(report.originalPercentRangesUntouched,true);
assert.equal(report.classNeutralRollWeightsApprovalPending,true);
assert.equal(report.valueCapsApprovalPending,true);
assert.equal(report.allUnmappedStatsRequireSeparateSourceDesign,true);
assert.equal(report.marketMintProvenanceApprovalPending,true);
assert.equal(report.canIssueItems,false);
assert.equal(report.canEditExistingItems,false);
assert.ok(Object.isFrozen(report)&&Object.isFrozen(report.scenarios));

const mappedOriginal=Object.keys(V2_SERVER_AFFIX_RANGES).filter(x=>x!=='potency');
assert.equal(mappedOriginal.length,11);
assert.ok(mappedOriginal.every(x=>Boolean(EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[
 x as keyof typeof EQ2_COMBAT_FROZEN_AFFIX_MAP_V2])));
const expectedBySlotTier=new Map<string,string>();
const rolesBySlotTier=new Map<string,Set<string>>();
const roleExamples=new Set<string>();
let scenarios=0,classesProtected=0,handsProtected=0;
let minSafePool=Infinity,maxSafePool=0,crossRoleChecks=0;
for(const piece of V2_SERVER_PIECES){
 for(const band of V2_SERVER_RARITY_BANDS){
  const review=reviewNextMintAffixPieceV2(piece.id,band.rarity);
  const inCatalogue=report.scenarios.find(x=>x.pieceId===piece.id&&x.rarity===band.rarity);
  assert.deepEqual(review,inCatalogue);
  assert.ok(Object.isFrozen(review)&&Object.isFrozen(review.candidates));
  assert.equal(review.role,piece.role);
  assert.equal(review.slot,piece.slot);
  assert.equal(review.tier,piece.tier);
  assert.equal(review.forgeSetId,piece.setId??null);
  assert.equal(review.classRestriction,piece.classRestriction??null,
   'item itself may remain class-specific; no bonus pool restriction');
  assert.equal(review.hands,piece.hands??null,
   'paired, one- and two-handed weapon identities stay unchanged');
  assert.equal(review.permittedToMint,false);
  assert.equal(review.permittedToAlterLegacyOrExistingCopies,false);
  assert.equal(review.classOrRoleBiasedPool,false);
  assert.equal(review.slotRulesChanged,false);
  assert.equal(review.innatePercentBonuses,
   'SEPARATE_AUTHORED_ITEM_OR_CLASS_EFFECTS_NOT_RANDOM');
  assert.equal(review.universalSourcedStatsBeforeSlotFilter,11);
  const wanted=piece.tier>=3?band.affixesHighTier:band.affixesLowTier;
  assert.equal(review.exactExistingRarityCount,wanted);
  assert.ok(review.candidates.length>=wanted);
  assert.equal(review.distinctSupportedCandidateStats,review.candidates.length);
  assert.equal(review.fullRollBudgetSatisfiableUnderCurrentSlotRules,true);
  const uniqueStats=new Set<string>(),uniqueCombatIds=new Set<string>();
  for(const row of review.candidates){
   assert.ok(Object.isFrozen(row)&&Object.isFrozen(row.originalPercentRange));
   assert.notEqual(row.forgeStat,'potency');
   assert.equal(row.availableToEveryClass,true);
   assert.equal(row.availableToEveryEquipmentRole,true);
   assert.equal(row.currentCombatSlotValid,true);
   assert.equal(row.randomBonusOnly,true);
   assert.equal(row.authoringOnly,true);
   assert.ok(mappedOriginal.includes(row.forgeStat));
   assert.equal(row.combatAffixId,EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[row.forgeStat]);
   assert.equal(EQUIPMENT_AFFIXES_V2[row.combatAffixId].runtime,'supported');
   assert.ok(EQUIPMENT_AFFIXES_V2[row.combatAffixId].slots.includes(piece.slot));
   assert.deepEqual(row.originalPercentRange,
    V2_SERVER_AFFIX_RANGES[row.forgeStat][piece.tier-1],
    'no invented stat magnitude or tier progression');
   assert.ok(!uniqueStats.has(row.forgeStat),'no duplicate random stat');
   assert.ok(!uniqueCombatIds.has(row.combatAffixId),'no duplicate Combat alias');
   uniqueStats.add(row.forgeStat);uniqueCombatIds.add(row.combatAffixId);
  }
  const expected=mappedOriginal
   .filter(x=>EQUIPMENT_AFFIXES_V2[
    EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[x as keyof typeof EQ2_COMBAT_FROZEN_AFFIX_MAP_V2]!
   ].slots.includes(piece.slot));
  assert.deepEqual(review.candidates.map(x=>x.forgeStat),expected,
   'every source-compatible bonus is available, regardless of piece role');
  // For the SAME slot, tier and rarity, the identical pool MUST apply to
  // Tank, Damage and Support. Piece class identity is never consulted.
  const signature=JSON.stringify(review.candidates);
  const key=piece.tier+'|'+piece.slot+'|'+band.rarity;
  const previous=expectedBySlotTier.get(key);
  if(previous!==undefined){
   assert.equal(signature,previous,
    'class/role-dependent random-affix pool detected on same slot/tier');
   crossRoleChecks++;
  }else expectedBySlotTier.set(key,signature);
  const roles=rolesBySlotTier.get(key)??new Set<string>();
  roles.add(piece.role);rolesBySlotTier.set(key,roles);
  roleExamples.add(piece.role);
  minSafePool=Math.min(minSafePool,review.candidates.length);
  maxSafePool=Math.max(maxSafePool,review.candidates.length);
  if(piece.classRestriction)classesProtected++;
  if(piece.hands)handsProtected++;
  scenarios++;
 }
}
assert.equal(scenarios,1014);
assert.ok(crossRoleChecks>0);
assert.deepEqual([...roleExamples].sort(),['damage','support','tank']);
assert.ok([...rolesBySlotTier.values()].some(x=>x.size===3),
 'at least one tier/slot must share one pool across all three roles');
assert.ok(minSafePool>=3,'all item slots must support 3 distinct original mythic rolls');
assert.ok(maxSafePool<=11);
assert.ok(classesProtected>0&&handsProtected>0);
// Explicit off-role examples: a defensive Tank item CAN roll damage-related
// random bonuses; a Damage item can roll defensive; Support is unrestricted.
const tankWeapon=V2_SERVER_PIECES.find(x=>x.role==='tank'&&x.slot==='weapon');
const damageChest=V2_SERVER_PIECES.find(x=>x.role==='damage'&&x.slot==='chest');
const supportGloves=V2_SERVER_PIECES.find(x=>x.role==='support'&&x.slot==='gloves');
assert.ok(tankWeapon&&damageChest&&supportGloves);
const tankPool=reviewNextMintAffixPieceV2(tankWeapon!.id,'mythic').candidates;
const damagePool=reviewNextMintAffixPieceV2(damageChest!.id,'mythic').candidates;
const supportPool=reviewNextMintAffixPieceV2(supportGloves!.id,'mythic').candidates;
assert.ok(tankPool.some(x=>x.forgeStat==='critRate'),
 'Tank weapons may roll Crit Rate despite original tank-only roll pool');
assert.ok(tankPool.some(x=>x.forgeStat==='abilityDamage'),
 'Tank weapons may roll Ability Damage despite source role');
assert.ok(damagePool.some(x=>x.forgeStat==='armor'),
 'Damage chest may roll Defense');
assert.ok(damagePool.some(x=>x.forgeStat==='maxHp'),
 'Damage chest may roll HP');
assert.ok(supportPool.some(x=>x.forgeStat==='critRate'),
 'Support gloves may roll Crit Rate');
assert.ok(supportPool.some(x=>x.forgeStat==='abilityDamage'),
 'Support gloves may roll Ability Damage');
assert.throws(()=>reviewNextMintAffixPieceV2('LEGACY_1_0_CHEST','mythic'),
 /unrecognized_pinned_forge_piece/);
assert.throws(()=>reviewNextMintAffixPieceV2('EQ2_WEAPON_T6_WAYFINDER','mythic'),
 /unrecognized_pinned_forge_piece/);
assert.throws(()=>reviewNextMintAffixPieceV2('', 'common'),
 /unrecognized_pinned_forge_piece/);
assert.throws(()=>reviewNextMintAffixPieceV2(tankWeapon!.id,
 'client_mythic' as never),/unknown_source_rarity/);
console.log('PASS universal class-neutral next-mint bonus affix proposal',JSON.stringify({
 sourceEquipment:169,rarityScenarios:scenarios,universalMappedStats:11,
 originalRarityBudgetShortfalls:0,proposedSlotExpansions:0,
 minimumLegalStatChoicesPerSlot:minSafePool,maximumLegalStatChoices:maxSafePool,
 reviewedSameSlotTierComparisons:crossRoleChecks,
 sameSlotTierAcrossThreeRoles:[...rolesBySlotTier.values()].some(x=>x.size===3),
 classRestrictedSourceCopyScenarios:classesProtected,
 handedWeaponSourceCopyScenarios:handsProtected,
 offRoleExamples:['tank_crit','damage_defense','support_ability_damage'],
 innateEffects:'separate_authoring_not_random_and_not_activated',
 originalForgeRoleGeneratorUntouched:true,rollRatesPendingApproval:true,
 noNewMintOrExistingItemMutation:true,
}));
