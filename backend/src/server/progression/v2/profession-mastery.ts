/** Preview-only profession mastery policy; no live rewards or crafting mutations. */
import {PROFESSION_IDS_V2,type ProfessionIdV2} from './character-progression';

export type ProfessionSpecializationV2 = 'efficiency' | 'precision' | 'production';
export type GatheringSpecializationV2 = 'extraction' | 'prospecting' | 'tempo';
export interface ProfessionMasteryV2 {
  readonly professionId: ProfessionIdV2;
  readonly level: number;
  readonly specialization: ProfessionSpecializationV2 | GatheringSpecializationV2 | null;
}
export interface ProfessionBonusesV2 {
  readonly specializationRank: number;
  readonly speedBasisPoints: number;
  readonly commonRecoveryBasisPoints: number;
  readonly qualityPoints: number;
  readonly commonYieldBasisPoints: number;
  readonly relativeRareFindBasisPoints: number;
}
const GATHERING: ReadonlySet<string> = new Set(['mining','woodcutting','fishing','herbalism']);
const CRAFTING: ReadonlySet<string> = new Set(['smithing','tailoring','cooking','alchemy','enchanting']);
const KNOWN: ReadonlySet<string> = new Set(PROFESSION_IDS_V2);
const valid = (n: number): boolean => Number.isSafeInteger(n) && n >= 1 && n <= 100;

export function specializationRankV2(level: number): number {
  if (!valid(level)) throw new Error('mastery_v2_invalid_level');
  return level >= 100 ? 4 : level >= 75 ? 3 : level >= 50 ? 2 : level >= 25 ? 1 : 0;
}
/** Every percentage is an integer basis-point value; quality is absolute 0–100 roll points. */
export function professionBonusesV2(source: ProfessionMasteryV2): ProfessionBonusesV2 {
  if (!source || !KNOWN.has(source.professionId)) throw new Error('mastery_v2_invalid_profession');
  if (!valid(source.level)) throw new Error('mastery_v2_invalid_level');
  const rank = specializationRankV2(source.level);
  const gathering = GATHERING.has(source.professionId);
  const crafting = CRAFTING.has(source.professionId);
  if (!gathering && !crafting && source.specialization !== null)
    throw new Error('mastery_v2_unsupported_specialization');
  if (rank === 0 && source.specialization !== null)
    throw new Error('mastery_v2_locked_specialization');
  if (source.specialization !== null) {
    const choices = gathering ? ['extraction','prospecting','tempo'] : ['efficiency','precision','production'];
    if (!choices.includes(source.specialization)) throw new Error('mastery_v2_invalid_specialization');
  }
  const baseSpeed = source.level >= 100 ? 1000 : source.level >= 80 ? 600 : source.level >= 60 ? 400 : source.level >= 30 ? 200 : source.level >= 10 ? 100 : 0;
  const baseRecovery = source.level >= 100 ? 500 : source.level >= 90 ? 400 : source.level >= 70 ? 300 : source.level >= 40 ? 200 : source.level >= 20 ? 100 : 0;
  const baseQuality = source.level >= 90 ? 2 : source.level >= 50 ? 1 : 0;
  return {
    specializationRank: rank,
    speedBasisPoints: crafting ? baseSpeed + (source.specialization === 'production' ? 200 * rank : 0) : gathering ? (source.specialization === 'tempo' ? 200 * rank : 0) : 0,
    commonRecoveryBasisPoints: crafting ? baseRecovery + (source.specialization === 'efficiency' ? 100 * rank : 0) : 0,
    qualityPoints: crafting ? baseQuality + (source.specialization === 'precision' ? Math.floor(rank / 2) : 0) : 0,
    commonYieldBasisPoints: gathering && source.specialization === 'extraction' ? 100 * rank : 0,
    relativeRareFindBasisPoints: gathering && source.specialization === 'prospecting' ? 200 * rank : 0,
  };
}
/** Speed stacks additively with Forge; cap the combined result at 20% for preview. */
export function cappedCombinedSpeedBasisPointsV2(...sources: readonly number[]): number {
  if (sources.some(value => !Number.isSafeInteger(value) || value < 0 || value > 2000))
    throw new Error('mastery_v2_invalid_speed_source');
  return Math.min(2000, sources.reduce((total,value)=>total+value,0));
}
/** Relative rare-find modifiers MUST NOT be added as percentage points. */
export function rareFindChancePartsPerMillionV2(basePpm: number, relativeBonusBps: number): number {
  if (!Number.isSafeInteger(basePpm) || basePpm < 0 || basePpm > 1_000_000 ||
      !Number.isSafeInteger(relativeBonusBps) || relativeBonusBps < 0 || relativeBonusBps > 800)
    throw new Error('mastery_v2_invalid_rare_chance');
  return Math.min(1_000_000, Math.floor(basePpm * (10000 + relativeBonusBps) / 10000));
}
