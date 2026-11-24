import {strict as assert} from 'node:assert';
import {
 V2_SERVER_PIECES,v2ServerPiece,
} from '../../../equipment/equipment-crafting-v2-manifest';
import {CLASS_NAMES_V2,SKILL_IDENTITIES_V2} from '../skill-catalog';
import {
 reviewNextMintAffixPieceV2,PROPOSED_FORGE_NEXT_MINT_ROLL_POLICY_V2,
} from '../equipment-forge-next-mint-roll-policy-review';
import {rehearseUniversalForgeRollV2} from '../equipment-universal-roll-rehearsal';
import {
 AUTHORED_EQ2_INNATE_PERCENT_REVIEW_V2,
 reviewAuthoredClassInnatesV2,reviewClassInnateForPinnedPieceV2,
 reviewInnateOriginalSkillTargetsV2,
} from '../equipment-authored-innate-percent-review';

const audit=reviewAuthoredClassInnatesV2();
assert.deepEqual(audit,reviewAuthoredClassInnatesV2());
assert.equal(audit.version,AUTHORED_EQ2_INNATE_PERCENT_REVIEW_V2);
assert.equal(audit.classRestrictedInnateAndUniversalRandomAffixesIndependent,true);
assert.equal(audit.canGrantInnates,false);
assert.equal(audit.canModifyExistingCopies,false);
assert.equal(audit.canModifyBonusRolls,false);
assert.equal(audit.approvedPercentCoefficients,0);
assert.equal(audit.approvedSkillBindings,0);
assert.ok(audit.classWeaponCandidates>0);
assert.ok(audit.classesRepresented>=3);
assert.equal(new Set(audit.candidates.map(x=>x.sourcePieceId)).size,
 audit.classWeaponCandidates);
assert.ok(Object.isFrozen(audit)&&Object.isFrozen(audit.candidates));
for(const candidate of audit.candidates){
 assert.ok(Object.isFrozen(candidate));
 const piece=v2ServerPiece(candidate.sourcePieceId)!;
 assert.ok(piece&&V2_SERVER_PIECES.includes(piece));
 assert.equal(piece.classRestriction,candidate.classRestriction);
 assert.ok(Object.keys(CLASS_NAMES_V2).includes(candidate.classRestriction));
 assert.ok(candidate.tier===3||candidate.tier===4);
 assert.equal(piece.tier,candidate.tier);
 assert.equal(candidate.sourceSlot,'weapon');
 assert.equal(piece.slot,'weapon');
 assert.equal(candidate.targetSkillId,null);
 assert.equal(candidate.percentCoefficient,null);
 assert.equal(candidate.rarityEligibility,'PENDING_OWNER_AUTHORED_ITEM_RARITY');
 assert.equal(candidate.proposedEffectFamily,'CLASS_SPECIFIC_ABILITY_PERCENT_SYNERGY');
 assert.equal(candidate.scope,'CANONICAL_ITEM_INNATE_NOT_RANDOM_BONUS');
 assert.equal(candidate.randomBonusPoolPolicy,PROPOSED_FORGE_NEXT_MINT_ROLL_POLICY_V2);
 assert.equal(candidate.randomRollSlotsConsumed,0);
 assert.equal(candidate.affectsBonusRollWeights,false);
 assert.equal(candidate.grantedByExistingFrozenItem,false);
 assert.equal(candidate.executableInCombat,false);
 assert.equal(candidate.mintPolicyEnabled,false);
 assert.deepEqual(reviewClassInnateForPinnedPieceV2(candidate.sourcePieceId),candidate);
 // A candidate class innate is completely independent of its possible
 // random rolls: full original rarity count remains available.
 for(const rarity of ['common','mythic'] as const){
  const pool=reviewNextMintAffixPieceV2(candidate.sourcePieceId,rarity);
  assert.ok(pool.candidates.length>=pool.exactExistingRarityCount);
  assert.equal(pool.classOrRoleBiasedPool,false);
 }
 const preview=rehearseUniversalForgeRollV2(candidate.sourcePieceId,()=>0);
 assert.equal(preview.innateEffectIncluded,false);
 assert.equal(preview.canMint,false);
 assert.equal(preview.randomRolls.length,
  reviewNextMintAffixPieceV2(candidate.sourcePieceId,'mythic').exactExistingRarityCount);
}
for(const piece of V2_SERVER_PIECES){
 const isCandidate=piece.slot==='weapon'&&piece.tier>=3&&piece.classRestriction;
 assert.equal(Boolean(reviewClassInnateForPinnedPieceV2(piece.id)),
  Boolean(isCandidate),'only source-pinned eligible class weapons are candidates');
}
assert.equal(reviewClassInnateForPinnedPieceV2('LEGACY_CLASS_WEAPON'),null);
assert.equal(reviewClassInnateForPinnedPieceV2(''),null);
const classSet=new Set(audit.candidates.map(x=>x.classRestriction));
assert.equal(classSet.size,audit.classesRepresented);
console.log('PASS separate class-authored innate percent source boundary',JSON.stringify({
 sourceOnlyCandidateWeapons:audit.classWeaponCandidates,
 classes:audit.classesRepresented,approvedBonuses:0,
 approvedSkillTargets:0,existingItemsModified:false,
 randomBonusPoolStillClassNeutral:true,
 freeExtraRollsFromInnates:0,liveGrantedInnates:0,
}));

const skillBridge=reviewInnateOriginalSkillTargetsV2();
assert.deepEqual(skillBridge,reviewInnateOriginalSkillTargetsV2());
assert.equal(skillBridge.sourceWeaponCandidates,18);
assert.equal(skillBridge.sourceClassSkillOptions,108);
assert.equal(skillBridge.classes,9);
assert.equal(skillBridge.approvedItemSkillPairs,0);
assert.equal(skillBridge.approvedEffects,0);
assert.equal(skillBridge.canGrant,false);
assert.ok(Object.isFrozen(skillBridge)&&Object.isFrozen(skillBridge.sourceRows));
for(const weapon of skillBridge.sourceRows){
 assert.ok(Object.isFrozen(weapon)&&Object.isFrozen(weapon.proposedSkillOptions));
 const source=v2ServerPiece(weapon.pieceId)!;
 assert.equal(source.classRestriction,weapon.classId);
 assert.equal(source.tier,weapon.originalTier);
 assert.equal(weapon.approvedSelectedSkillId,null);
 assert.equal(weapon.approvedPercentCoefficient,null);
 assert.equal(weapon.combatAuthority,false);
 assert.equal(weapon.randomAffixPoolUnchanged,true);
 assert.equal(weapon.randomAffixSlotsConsumed,0);
 assert.equal(weapon.proposedSkillOptions.length,6);
 const canonical=SKILL_IDENTITIES_V2.filter(x=>x.classId===weapon.classId);
 assert.deepEqual(weapon.proposedSkillOptions.map(x=>x.id),
  canonical.map(x=>x.id),'no cross-class innate skill target admitted');
 for(const option of weapon.proposedSkillOptions){
  assert.ok(Object.isFrozen(option)&&Object.isFrozen(option.variantIds));
  const skill=canonical.find(x=>x.id===option.id)!;
  assert.ok(skill);
  assert.equal(option.name,skill.name);
  assert.equal(option.cooldownMs,skill.cooldownMs);
  assert.equal(option.sourceClass,weapon.classId);
  assert.deepEqual(option.variantIds,skill.variants.map(x=>x.id));
  assert.equal(option.itemPercentCoefficient,null);
  assert.equal(option.itemAbilityBindingApproved,false);
  assert.equal(option.sourceOnly,true);
 }
}
console.log('PASS authored innate to original Skills 2.0 identity bridge',JSON.stringify({
 classWeapons:skillBridge.sourceWeaponCandidates,classes:skillBridge.classes,
 verifiedClassSkillOptions:skillBridge.sourceClassSkillOptions,
 approvedEffects:0,approvedSkillPairs:0,randomAffixChanges:0,
 }));
