import {strict as assert} from 'node:assert';
import {V2_SERVER_PIECES,V2_SERVER_MANIFEST_VERSION}
 from '../../../equipment/equipment-crafting-v2-manifest';
import {
 EQUIPMENT_V2_SERVER_RULES_VERSION,V2_SERVER_RARITY_BANDS,
 v2OriginalForgeAffixSourcePoolV2,
} from '../../../equipment/equipment-crafting-v2-rolls';
import {EQUIPMENT_AFFIXES_V2} from '../equipment-affixes';
import {EQ2_COMBAT_FROZEN_AFFIX_MAP_V2} from '../equipment-frozen-forge-bridge';
import {
 reviewOriginalForgeAffixCoverageV2,reviewOriginalForgeAffixPieceV2,
} from '../equipment-forge-affix-coverage-review';

const report=reviewOriginalForgeAffixCoverageV2();
assert.equal(report.scope,'NO_RNG_CHANGE_NO_MINT_AND_NO_COMBAT_AUTHORIZATION');
assert.equal(report.forgeManifestVersion,V2_SERVER_MANIFEST_VERSION);
assert.equal(report.forgeRulesVersion,EQUIPMENT_V2_SERVER_RULES_VERSION);
assert.equal(report.pinnedPieces,169);
assert.equal(report.setMemberPieces,42);
assert.equal(report.piecesWithNoExecutableRolls>=0,true);
assert.equal(report.highestOriginalAffixCount,3);
assert.equal(report.newMintRollPolicyApproved,false);
assert.equal(report.currentCopiesRerolled,false);
assert.equal(report.pieces.length,169);
assert.deepEqual(
 [...new Set(report.pieces.map(x=>x.pieceId))].sort(),
 [...new Set(V2_SERVER_PIECES.map(x=>x.id))].sort(),
 'audit must cover exactly every pinned original Forge item');
assert.ok(report.exposedToUnexecutableSourceRolls>0,
 'hidden original generator must be audited for real compatibility exposure');
assert.ok(report.notFullyFillableAtMaxRarity>0,
 'role/slot mismatches can make source rarity budget unfillable');
assert.ok(report.slotForbiddenCandidateChannels>0);
assert.ok(report.unsupportedCandidateChannels>0);
let tierRarityPermutations=0;
let badSourceChoices=0;
let maxBudgetShortfalls=0;
for(const piece of V2_SERVER_PIECES){
 const review=reviewOriginalForgeAffixPieceV2(piece.id)!;
 assert.ok(review&&review.pieceId===piece.id);
 assert.equal(review.tier,piece.tier);
 assert.equal(review.role,piece.role);
 assert.equal(review.slot,piece.slot);
 assert.equal(review.setId,piece.setId??null);
 const raw=v2OriginalForgeAffixSourcePoolV2(piece.role,piece.slot);
 assert.equal(review.exposure.length,raw.length);
 assert.equal(raw.reduce((n,x)=>n+x.weight,0),100,
  'original Forge weighted pool must remain exactly unchanged');
 const statuses=review.exposure.map(row=>{
  const mapped=EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[row.stat];
  if(!mapped)return 'AMBIGUOUS_SEMANTICS';
  if(!EQUIPMENT_AFFIXES_V2[mapped].slots.includes(piece.slot))
   return 'COMBAT_SLOT_FORBIDDEN';
  return 'COMPATIBLE';
 });
 assert.deepEqual(review.exposure.map(x=>x.classification),statuses,
  'Combat type and slot compatibility must derive from source, not copied tables');
 badSourceChoices+=review.incompatibleChoices;
 for(const rarity of V2_SERVER_RARITY_BANDS){
  const max=piece.tier>=3?rarity.affixesHighTier:rarity.affixesLowTier;
  assert.ok(max>=1&&max<=3);
  const feasible=review.executableChoices>=max;
  if(!feasible)maxBudgetShortfalls++;
  assert.equal(review.maximumAffixBudgetSupportable,
   review.executableChoices>=review.originalMaxAffixes);
  tierRarityPermutations++;
 }
 assert.equal(review.originalRoleChoices,
  review.executableChoices+review.incompatibleChoices);
 assert.equal(review.incompatibleChoices,
  review.ambiguousChoices+review.slotForbiddenChoices);
 assert.equal(review.risks.includes('ORIGINAL_ROLL_CAN_BE_UNSUPPORTED'),
  review.incompatibleChoices>0);
}
assert.equal(tierRarityPermutations,169*6);
assert.ok(badSourceChoices>0&&maxBudgetShortfalls>0);
assert.equal(reviewOriginalForgeAffixPieceV2('OLD_EQUIPMENT_1_0'),null);
assert.equal(reviewOriginalForgeAffixPieceV2('EQ2_WEAPON_T6_WAYFINDER'),null);
const supportAmulet=reviewOriginalForgeAffixPieceV2('EQ2_FIELDBORN_ACOLYTE_AMULET');
assert.ok(supportAmulet);
assert.equal(supportAmulet.role,'support');
assert.equal(supportAmulet.slot,'amulet');
assert.ok(supportAmulet.executableChoices<2,
 'T1 mythic 2-roll guarantee cannot be satisfied by original support amulet slot mapping');
assert.equal(supportAmulet.maximumAffixBudgetSupportable,false);
const hexWeapon=reviewOriginalForgeAffixPieceV2('EQ2_WEAPON_T1_HEXWEAVER');
assert.ok(hexWeapon?.exposure.some(x=>
 x.stat==='potency'&&x.classification==='AMBIGUOUS_SEMANTICS'));
assert.equal(hexWeapon?.setId,null);
const fieldGuard=reviewOriginalForgeAffixPieceV2('EQ2_FIELDBORN_GUARD_HELMET');
assert.ok(fieldGuard?.setId==='EQ2_SET_FIELDBORN_GUARD');
assert.equal(fieldGuard?.slot,'helmet');
console.log('PASS pinned Forge roll compatibility exposure audit:',JSON.stringify({
 sourcePieces:report.pinnedPieces,setMemberPieces:report.setMemberPieces,
 tierRarityPermutations,originalRoleChoiceExposures:badSourceChoices,
 piecesWithUnsafeOriginalRollChoices:report.exposedToUnexecutableSourceRolls,
 piecesUnableToMeetMaxRarityBudget:report.notFullyFillableAtMaxRarity,
 tierRarityBudgetShortfalls:maxBudgetShortfalls,
 zeroSafeChoices:report.piecesWithNoExecutableRolls,
 unsupportedPotencyExposure:report.unsupportedCandidateChannels,
 slotForbiddenExposure:report.slotForbiddenCandidateChannels,
 originalRngUnchanged:true,combatNotActivated:true,
}));
