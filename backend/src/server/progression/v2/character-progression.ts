/**
 * Veldryn 2.0 overall character progression: isolated policy preview.
 *
 * NOT connected to gameplay, persistence, paid entitlement checks, UI or combat.
 * Existing character.level and character.xp remain combat-only in 1.x.
 * All events supplied to this module must originate from trusted server settlements;
 * callers must persist event IDs atomically before applying XP.
 */
export const OVERALL_PROGRESSION_VERSION_V2 = 1 as const;
export const OVERALL_CHARACTER_LEVEL_CAP_V2 = 100 as const;
export const PROFESSION_LEVEL_CAP_V2 = 100 as const;
export const PROFESSION_TIER_FLOORS_V2 = [1, 12, 24, 36, 48, 60, 72, 84, 96] as const;

export const PROFESSION_IDS_V2 = [
  'mining', 'woodcutting', 'fishing', 'herbalism',
  'smithing', 'tailoring', 'cooking', 'alchemy', 'enchanting',
  'exploration', 'faith', 'forge',
] as const;
export type ProfessionIdV2 = (typeof PROFESSION_IDS_V2)[number];
export type ProfessionTierV2 = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
const TIERED_PROFESSIONS_V2: ReadonlySet<string> = new Set([
  'mining', 'woodcutting', 'fishing', 'herbalism',
  'smithing', 'tailoring', 'cooking', 'alchemy', 'enchanting',
]);
const PROFESSION_ID_SET_V2: ReadonlySet<string> = new Set(PROFESSION_IDS_V2);
const isValidXp = (xp: number): boolean => Number.isSafeInteger(xp) && xp >= 0;
const isValidLevel = (level: number): boolean => Number.isSafeInteger(level) && level >= 1 && level <= 100;

export function overallXpForNextLevelV2(level: number): number {
  if (!isValidLevel(level)) throw new Error('overall_v2_invalid_level');
  return level === OVERALL_CHARACTER_LEVEL_CAP_V2 ? 0 : 200 + 50 * level + 5 * level * level;
}
export function professionXpForNextLevelV2(level: number): number {
  if (!isValidLevel(level)) throw new Error('overall_v2_invalid_level');
  return level === PROFESSION_LEVEL_CAP_V2 ? 0 : 150 + 45 * level + 8 * level * level;
}
function cumulativeXp(level: number, need: (level: number) => number): number {
  if (!isValidLevel(level)) throw new Error('overall_v2_invalid_level');
  let total = 0;
  for (let current = 1; current < level; current++) total += need(current);
  return total;
}
function levelFromXp(xp: number, need: (level: number) => number): number {
  if (!isValidXp(xp)) throw new Error('overall_v2_invalid_xp');
  let total = 0;
  for (let level = 1; level < 100; level++) {
    total += need(level);
    if (xp < total) return level;
  }
  return 100;
}
export const overallTotalXpForLevelV2 = (level: number): number => cumulativeXp(level, overallXpForNextLevelV2);
export const professionTotalXpForLevelV2 = (level: number): number => cumulativeXp(level, professionXpForNextLevelV2);
export const overallLevelFromXpV2 = (xp: number): number => levelFromXp(xp, overallXpForNextLevelV2);
export const professionLevelFromXpV2 = (xp: number): number => levelFromXp(xp, professionXpForNextLevelV2);

export interface TrustedCharacterProgressionV2 {
  /** Explicitly sourced from the unchanged authenticated combat XP curve. */
  readonly combatLevel: number;
  /** New independent account/character validated XP bank, never legacy combat XP. */
  readonly overallCharacterXp: number;
  /** Character-owned skill XP banks. Omitted skills are not yet trained. */
  readonly professionXp: Readonly<Partial<Record<ProfessionIdV2, number>>>;
}
export interface ProjectedCharacterProgressionV2 {
  readonly overallCharacterLevel: number;
  readonly combatLevel: number;
  readonly professionLevels: Readonly<Partial<Record<ProfessionIdV2, number>>>;
}
export function projectCharacterProgressionV2(source: TrustedCharacterProgressionV2): ProjectedCharacterProgressionV2 {
  if (!source || !isValidLevel(source.combatLevel) || !isValidXp(source.overallCharacterXp) ||
      !source.professionXp || typeof source.professionXp !== 'object' || Array.isArray(source.professionXp))
    throw new Error('overall_v2_invalid_source');
  const professionLevels: Partial<Record<ProfessionIdV2, number>> = {};
  for (const [id, xp] of Object.entries(source.professionXp)) {
    if (!PROFESSION_ID_SET_V2.has(id) || typeof xp !== 'number' || !isValidXp(xp))
      throw new Error('overall_v2_invalid_profession_xp');
    professionLevels[id as ProfessionIdV2] = professionLevelFromXpV2(xp);
  }
  return {
    overallCharacterLevel: overallLevelFromXpV2(source.overallCharacterXp),
    combatLevel: source.combatLevel,
    professionLevels,
  };
}
export function mayWorkProfessionTierV2(source: TrustedCharacterProgressionV2, professionId: ProfessionIdV2, tier: number): boolean {
  const projection = projectCharacterProgressionV2(source);
  if (!PROFESSION_ID_SET_V2.has(professionId) || !TIERED_PROFESSIONS_V2.has(professionId) ||
      !Number.isSafeInteger(tier) || tier < 1 || tier > 9) return false;
  return (projection.professionLevels[professionId] ?? 0) >= PROFESSION_TIER_FLOORS_V2[tier - 1];
}
export function mayEquipCombatGearV2(source: TrustedCharacterProgressionV2, requiredCombatLevel: number): boolean {
  const projection = projectCharacterProgressionV2(source);
  return Number.isSafeInteger(requiredCombatLevel) && requiredCombatLevel >= 1 &&
    projection.combatLevel >= requiredCombatLevel;
}

/** Only verified completed work can qualify; this function does not authorize an award. */
export interface TrustedCompletedActivityV2 {
  readonly settlementId: string;
  readonly kind: 'combat' | 'profession';
  readonly professionId?: ProfessionIdV2;
  /** Server-authored base effort, not user-supplied elapsed time. */
  readonly baseEffortSeconds: number;
  /** Server-computed difficulty: 25%, 50%, 100%, or 125%. */
  readonly difficultyBasisPoints: 2500 | 5000 | 10000 | 12500;
}
export interface ProposedActivityXpV2 {
  readonly settlementId: string;
  readonly overallCharacterXp: number;
  readonly professionId: ProfessionIdV2 | null;
  readonly professionXp: number;
  /** Combat XP is awarded separately by the existing combat settlement. */
  readonly combatXp: 0;
}
export function proposeTrustedActivityXpV2(event: TrustedCompletedActivityV2): ProposedActivityXpV2 {
  if (!event || typeof event.settlementId !== 'string' || !/^[a-zA-Z0-9:_-]{8,128}$/.test(event.settlementId) ||
      !Number.isSafeInteger(event.baseEffortSeconds) || event.baseEffortSeconds < 1 || event.baseEffortSeconds > 108000 ||
      !([2500, 5000, 10000, 12500] as number[]).includes(event.difficultyBasisPoints) ||
      !['combat', 'profession'].includes(event.kind)) throw new Error('overall_v2_invalid_settlement');
  if ((event.kind === 'profession' && (!event.professionId || !PROFESSION_ID_SET_V2.has(event.professionId))) ||
      (event.kind === 'combat' && event.professionId !== undefined)) throw new Error('overall_v2_invalid_activity');
  const effortXp = Math.floor(event.baseEffortSeconds * event.difficultyBasisPoints / 10000);
  return {
    settlementId: event.settlementId,
    overallCharacterXp: Math.floor(effortXp / 2),
    professionId: event.kind === 'profession' ? event.professionId! : null,
    professionXp: event.kind === 'profession' ? effortXp : 0,
    combatXp: 0,
  };
}
