/**
 * Hidden Veldryn 2.0 alternate character-slot eligibility policy.
 *
 * Existing 1.x account skill-total unlocks and previously earned character
 * slots MUST be retained. This preview adds a single-career alternative to
 * avoid demanding that a pure artisan train every unrelated skill.
 *
 * Account-wide: use the HIGHEST independently verified Overall Character
 * Level across that account's own characters; not a sum of level/XP across
 * alts and never an unverified client profile attribute.
 *
 * No live entitlement or roster integration.
 */
export const ACCOUNT_CAREER_SLOT_LEVELS_V2=[25,50,75,100] as const;
export const MAX_CAREER_SLOTS_V2=5;

export interface AccountCareerSlotProjectionV2 {
  readonly verifiedHighestOverallCharacterLevel:number;
  readonly legacyUnlockedSlots:number;
  readonly careerUnlockedSlots:number;
  readonly effectiveSlots:number;
  readonly existingSlotsNeverRegress:true;
}
export function accountCareerSlotsV2(
  verifiedHighestOverallCharacterLevel:number,
  existingLegacyUnlockedSlots:number,
):AccountCareerSlotProjectionV2{
  if(!Number.isSafeInteger(verifiedHighestOverallCharacterLevel) ||
     verifiedHighestOverallCharacterLevel<1 || verifiedHighestOverallCharacterLevel>100 ||
     !Number.isSafeInteger(existingLegacyUnlockedSlots) ||
     existingLegacyUnlockedSlots<1 || existingLegacyUnlockedSlots>MAX_CAREER_SLOTS_V2)
    throw new Error('account_career_v2_invalid_progress');
  const careerUnlockedSlots=1+ACCOUNT_CAREER_SLOT_LEVELS_V2.filter(
    requirement=>verifiedHighestOverallCharacterLevel>=requirement,
  ).length;
  return {
    verifiedHighestOverallCharacterLevel,
    legacyUnlockedSlots:existingLegacyUnlockedSlots,
    careerUnlockedSlots,
    effectiveSlots:Math.max(existingLegacyUnlockedSlots,careerUnlockedSlots),
    existingSlotsNeverRegress:true,
  };
}
