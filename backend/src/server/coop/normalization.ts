import type { AbilityDefinition } from '../combat/types';
import type { VerifiedCombatSnapshot } from '../combat/snapshot-adapter';
import type { CoopRole } from '../../shared/coop-types';

export interface NormalizationReference {
  level: number;
  maxHp: number;
  attackPower: number;
  healingPower: number;
  defense: number;
  accuracy: number;
  evasion: number;
}

export interface NormalizationConfig {
  version: string;
  softThreshold: number;
  primaryRetention: number;
  secondaryRetention: number;
  hpRetention: number;
  primaryHardRatio: number;
  secondaryHardRatio: number;
  hpHardRatio: number;
  flatEffectHardRatio: number;
  coefficientHardCap: number;
}

export const COOP_NORMALIZATION_V1: Readonly<NormalizationConfig> = Object.freeze({
  version: 'coop-normalization-v1', softThreshold: 1.15,
  primaryRetention: 0.35, secondaryRetention: 0.50, hpRetention: 0.60,
  primaryHardRatio: 1.25, secondaryHardRatio: 1.25, hpHardRatio: 1.35,
  flatEffectHardRatio: 0.35, coefficientHardCap: 3,
});

/** Q-Mode only: host-visible levels, with a bounded diminishing gear tail. */
export const COOP_HOST_LEVEL_NORMALIZATION_VERSION = 'coop-host-level-v1';
export const ROOTBOUND_ROLE_REFERENCES: Readonly<Record<CoopRole, NormalizationReference>> = Object.freeze({
  tank: { level: 25, maxHp: 5_200, attackPower: 420, healingPower: 180, defense: 1_500, accuracy: 680, evasion: 180 },
  damage: { level: 25, maxHp: 3_400, attackPower: 625, healingPower: 120, defense: 750, accuracy: 780, evasion: 250 },
  support: { level: 25, maxHp: 3_800, attackPower: 330, healingPower: 650, defense: 900, accuracy: 700, evasion: 210 },
});

function compress(value: number, reference: number, retention: number, hardRatio: number, softThreshold: number, retainGearTail = false): number {
  const safe = Math.max(0, value);
  const soft = softThreshold * reference;
  if (safe <= soft) return safe;
  const compressed = soft + (safe - soft) * retention;
  const cap = hardRatio * reference;
  if (!retainGearTail || compressed <= cap || reference <= 0) return Math.min(cap, compressed);
  // Smooth, strictly increasing tail instead of making all strong builds identical.
  const excess = compressed - cap;
  return cap + reference * .5 * (excess / (reference + excess));
}

export interface NormalizedCombatInput {
  snapshot: VerifiedCombatSnapshot;
  abilities: AbilityDefinition[];
  effectiveLevel: number;
  normalizationVersion: string;
  before: Pick<VerifiedCombatSnapshot, 'level'|'maxHp'|'attackPower'|'healingPower'|'defense'>;
}

export function normalizeCombatInput(
  source: VerifiedCombatSnapshot,
  abilities: readonly AbilityDefinition[],
  syncLevel: number,
  reference: NormalizationReference,
  config: NormalizationConfig = COOP_NORMALIZATION_V1,
  visibleLevel?: number,
): NormalizedCombatInput {
  if (!Number.isInteger(source.level) || source.level < 1 || source.level > 100 || !Number.isInteger(syncLevel) || syncLevel < 1 || syncLevel > 100) throw new Error('invalid_snapshot_level');
  const sourceStats=[source.maxHp,source.attackPower,source.healingPower,source.defense,source.accuracy,source.evasion,source.critChance,source.haste];
  if(sourceStats.some(value=>!Number.isFinite(value)) || source.maxHp<=0 || [source.attackPower,source.healingPower,source.defense,source.accuracy,source.evasion].some(value=>value<0)) throw new Error('invalid_snapshot_stats');
  if (visibleLevel !== undefined && (!Number.isInteger(visibleLevel) || visibleLevel < 1 || visibleLevel > 100)) throw new Error('invalid_snapshot_level');
  const effectiveLevel = Math.min(visibleLevel ?? source.level, syncLevel);
  // Online source stats are calibrated in legacy level units. Convert those
  // units once to the effective visible level without ever raising a donor's visible level.
  const levelRatio = visibleLevel !== undefined ? effectiveLevel / source.level : source.level > effectiveLevel ? effectiveLevel / source.level : 1;
  const retainGearTail = visibleLevel !== undefined;
  const refScale = effectiveLevel / reference.level;
  const ref = {
    maxHp: reference.maxHp * refScale, attackPower: reference.attackPower * refScale,
    healingPower: reference.healingPower * refScale, defense: reference.defense * refScale,
    accuracy: reference.accuracy * refScale, evasion: reference.evasion * refScale,
  };
  const scaled = {
    maxHp: source.maxHp * levelRatio, attackPower: source.attackPower * levelRatio,
    healingPower: source.healingPower * levelRatio, defense: source.defense * levelRatio,
    accuracy: source.accuracy * levelRatio, evasion: source.evasion * levelRatio,
  };
  const snapshot: VerifiedCombatSnapshot = {
    ...source,
    level: effectiveLevel,
    maxHp: compress(scaled.maxHp, ref.maxHp, config.hpRetention, config.hpHardRatio, config.softThreshold, retainGearTail),
    attackPower: compress(scaled.attackPower, ref.attackPower, config.primaryRetention, config.primaryHardRatio, config.softThreshold, retainGearTail),
    healingPower: compress(scaled.healingPower, ref.healingPower, config.primaryRetention, config.primaryHardRatio, config.softThreshold, retainGearTail),
    defense: compress(scaled.defense, ref.defense, config.secondaryRetention, config.secondaryHardRatio, config.softThreshold, retainGearTail),
    accuracy: compress(scaled.accuracy, ref.accuracy, config.secondaryRetention, config.secondaryHardRatio, config.softThreshold, retainGearTail),
    evasion: compress(scaled.evasion, ref.evasion, config.secondaryRetention, config.secondaryHardRatio, config.softThreshold, retainGearTail),
  };
  const flatCap = Math.max(ref.attackPower, ref.healingPower, ref.maxHp) * config.flatEffectHardRatio;
  const normalizedAbilities = abilities.map(ability => ({
    ...ability,
    effects: ability.effects.map(effect => ({
      ...effect,
      ...(effect.flat === undefined ? {} : { flat: Math.min(Math.max(0, effect.flat * levelRatio), flatCap) }),
      ...(effect.coeff === undefined ? {} : { coeff: Math.min(Math.max(0, effect.coeff), config.coefficientHardCap) }),
      ...(effect.value === undefined ? {} : { value: effect.kind==='taunt' ? Math.min(Math.max(0,effect.value*levelRatio),flatCap) : Math.min(Math.max(-1, effect.value), 1) }),
    })),
  }));
  return {
    snapshot, abilities: normalizedAbilities, effectiveLevel, normalizationVersion: retainGearTail ? COOP_HOST_LEVEL_NORMALIZATION_VERSION : config.version,
    before: { level: source.level, maxHp: source.maxHp, attackPower: source.attackPower, healingPower: source.healingPower, defense: source.defense },
  };
}
