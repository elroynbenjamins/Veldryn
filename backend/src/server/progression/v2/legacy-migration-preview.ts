/**
 * Veldryn 2.0 legacy migration PROJECTION, read-only and disconnected.
 *
 * Explicitly preserve 1.x character.xp, character.level, character_skills.xp
 * and character_skills.level. This computes separate, NEW proposed XP banks;
 * no historical earned XP or displayed levels are overwritten.
 *
 * Existing 1.x mobile skill curve: apps/mobile/src/core/progression.ts.
 * This copied version must be parity-checked against that source before
 * accepting a live migration; existing production may hold other level curves.
 */
import {
  type ProfessionIdV2, PROFESSION_IDS_V2,
  overallTotalXpForLevelV2, professionTotalXpForLevelV2,
  professionXpForNextLevelV2,
} from './character-progression';

const PROFESSION_IDS = new Set<string>(PROFESSION_IDS_V2);
const validLevel = (level: number) => Number.isSafeInteger(level) && level >= 1 && level <= 100;
const validXp = (xp: number) => Number.isSafeInteger(xp) && xp >= 0;

export function legacySkillXpForNextLevelV1(level: number): number {
  if (!validLevel(level)) throw new Error('migration_v2_invalid_legacy_level');
  return level === 100 ? 0 : Math.floor((Math.floor(90*Math.pow(level, 1.42)+level*35))*1.6);
}
export function legacySkillTotalXpAtLevelV1(level: number): number {
  if (!validLevel(level)) throw new Error('migration_v2_invalid_legacy_level');
  let total=0;
  for(let current=1;current<level;current++) total+=legacySkillXpForNextLevelV1(current);
  return total;
}
export function legacySkillLevelFromXpV1(xp: number): number {
  if (!validXp(xp)) throw new Error('migration_v2_invalid_legacy_xp');
  let remaining=xp;
  for(let level=1;level<100;level++){
    const need=legacySkillXpForNextLevelV1(level);
    if(remaining<need)return level;
    remaining-=need;
  }
  return 100;
}

/**
 * Map a verified lifetime skill XP bank to a new XP threshold, preserving:
 * - earned 1.x XP verbatim in its legacy field (outside this projection);
 * - current skill level;
 * - proportional progress within that level (0–99), floor-rounded.
 * The derived skill level MUST come from XP, not a device-supplied level.
 */
export function previewMigratedProfessionXpV2(legacySkillXp: number): number {
  if (!validXp(legacySkillXp)) throw new Error('migration_v2_invalid_legacy_xp');
  const level=legacySkillLevelFromXpV1(legacySkillXp);
  const start=legacySkillTotalXpAtLevelV1(level);
  const v2Start=professionTotalXpForLevelV2(level);
  if(level===100) return v2Start;
  const legacyNeed=legacySkillXpForNextLevelV1(level);
  const newNeed=professionXpForNextLevelV2(level);
  const progress=legacySkillXp-start;
  return v2Start+Math.floor(progress*newNeed/legacyNeed);
}

/** Separate 1.x combat XP curve; never changes legacy combat equip eligibility. */
export function legacyCombatLevelFromXpV1(xp:number):number{
  if(!validXp(xp))throw new Error('migration_v2_invalid_combat_xp');
  let remaining=xp;
  for(let level=1;level<100;level++){
    const needed=Math.floor(90*Math.pow(level,1.65)+level*35)*8;
    if(remaining<needed)return level;
    remaining-=needed;
  }
  return 100;
}

export interface LegacyCareerSnapshotV2 {
  readonly combatLevel: number; // persisted 1.x Combat Level; NEVER overwrite
  readonly combatLifetimeXp?:number; // persisted source, optional audit read
  readonly professionLifetimeXp: Readonly<Partial<Record<ProfessionIdV2, number>>>;
  /** Persisted server-saved levels, which take precedence when XP-level drift exists. */
  readonly professionSavedLevels?:Readonly<Partial<Record<ProfessionIdV2,number>>>;
}
export interface LegacyCareerMigrationPreviewV2 {
  readonly overallCharacterXp: number;
  readonly highestLegacyCareerLevel: number;
  readonly professionXpV2: Readonly<Partial<Record<ProfessionIdV2, number>>>;
  /** No changes to existing character.xp / character_skills.xp. */
  readonly legacyCombatAndProfessionXpUntouched: true;
}
/**
 * A no-regression baseline for backfilling Overall Character Level without
 * requiring an all-rounder skill sum: retain at least the strongest career.
 * Historical event-based supplemental grants need separate audit & deduplication.
 */
export function previewLegacyCareerMigrationV2(source: LegacyCareerSnapshotV2): LegacyCareerMigrationPreviewV2 {
  if (!source || !validLevel(source.combatLevel) ||
      !source.professionLifetimeXp || typeof source.professionLifetimeXp!=='object' ||
      Array.isArray(source.professionLifetimeXp)) throw new Error('migration_v2_invalid_snapshot');
  if(source.combatLifetimeXp!==undefined && !validXp(source.combatLifetimeXp))
    throw new Error('migration_v2_invalid_combat_xp');
  if(source.professionSavedLevels!==undefined){
    if(!source.professionSavedLevels||typeof source.professionSavedLevels!=='object'||Array.isArray(source.professionSavedLevels))
      throw new Error('migration_v2_invalid_saved_skills');
    for(const [id,level] of Object.entries(source.professionSavedLevels)){
      if(!PROFESSION_IDS.has(id)||!validLevel(level)||
         !Object.prototype.hasOwnProperty.call(source.professionLifetimeXp,id))
        throw new Error('migration_v2_invalid_saved_skills');
    }
  }
  // Use the stronger VERIFIED legacy milestone for migration only. Do not
  // adjust legacy Combat Level if its stored level and XP-derived level differ.
  let highest=Math.max(source.combatLevel,source.combatLifetimeXp===undefined
    ?1:legacyCombatLevelFromXpV1(source.combatLifetimeXp));
  const professionXpV2: Partial<Record<ProfessionIdV2,number>>={};
  for(const [id,xp] of Object.entries(source.professionLifetimeXp)){
    if(!PROFESSION_IDS.has(id)||typeof xp!=='number'||!validXp(xp))
      throw new Error('migration_v2_invalid_profession_bank');
    const xpLevel=legacySkillLevelFromXpV1(xp);
    const saved=source.professionSavedLevels?.[id as ProfessionIdV2];
    const bestLevel=Math.max(xpLevel,saved??1);
    highest=Math.max(highest,bestLevel);
    professionXpV2[id as ProfessionIdV2]=Math.max(
      previewMigratedProfessionXpV2(xp),professionTotalXpForLevelV2(bestLevel));
  }
  return {
    overallCharacterXp:overallTotalXpForLevelV2(highest),
    highestLegacyCareerLevel:highest,
    professionXpV2,
    legacyCombatAndProfessionXpUntouched:true,
  };
}
