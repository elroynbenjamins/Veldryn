import { COMBAT_LIMITS } from '../expeditions/constants';

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export function effectiveContentLevel(characterLevel: number, contentSyncCap: number): number {
  return Math.min(characterLevel, contentSyncCap);
}

export function syncedPrimaryStat(baseStat: number, syncScale: number, eligibleFlatStat: number): number {
  return baseStat * syncScale + eligibleFlatStat;
}

export function attackPower(classAttackBase: number, weaponPower: number, primaryStat: number, classPrimaryCoeff: number): number {
  return classAttackBase + weaponPower + primaryStat * classPrimaryCoeff;
}

/**
 * Player-only role offense conversion. Defensive/support builds gain a modest
 * amount of direct and periodic damage without displacing dedicated DPS roles.
 * The cap is relative to Attack Power so high-HP/shield builds cannot scale
 * offensive damage without also investing in a weapon.
 *
 * The combat engine uses healingPower for both healing and shielding. This
 * function never changes actual healing/shielding strength or enemy damage.
 */
export function roleAdjustedAttackPower(input:{
  team:'players'|'enemies';
  role:'tank'|'damage'|'support'|'enemy';
  attackPower:number;defense:number;maxHp:number;healingPower:number;
}):number{
  const attack=Math.max(0,input.attackPower);
  if(input.team!=='players'||input.role==='damage'||input.role==='enemy')return attack;
  const bonus=input.role==='tank'
    ?Math.min(attack*.10,Math.max(0,input.defense)*.014+Math.max(0,input.maxHp)*.0014)
    :Math.min(attack*.10,Math.max(0,input.healingPower)*.035);
  return attack+bonus;
}

export function defenseMitigation(defense: number, mitigationConstant: number): number {
  const raw = defense / Math.max(1, defense + mitigationConstant);
  return clamp(raw, COMBAT_LIMITS.mitigationMin, COMBAT_LIMITS.mitigationMax);
}

export function hitChance(accuracy: number, evasion: number, accuracyScale: number): number {
  return clamp(0.75 + (accuracy - evasion) / accuracyScale, COMBAT_LIMITS.hitChanceMin, COMBAT_LIMITS.hitChanceMax);
}

export function critChance(baseCrit: number, critRating: number, critScale: number, cap = COMBAT_LIMITS.critChanceCap): number {
  return clamp(baseCrit + critRating / critScale, 0, cap);
}

export function damageAfterMitigation(
  attackPowerValue: number,
  abilityCoeff: number,
  mitigation: number,
  variance: number,
  crit = false,
  critMultiplier: number = COMBAT_LIMITS.defaultCritMultiplier,
): number {
  const varianceClamped = clamp(variance, COMBAT_LIMITS.damageVarianceMin, COMBAT_LIMITS.damageVarianceMax);
  const normal = Math.max(1, attackPowerValue * abilityCoeff * varianceClamped * (1 - mitigation));
  return crit ? normal * critMultiplier : normal;
}

export function healAmount(healingPower: number, healCoeff: number, healingReceivedMult = 1): number {
  return Math.max(0, healingPower * healCoeff * healingReceivedMult);
}

export function shieldAmount(shieldPower: number, shieldCoeff: number, shieldReceivedMult = 1): number {
  return Math.max(0, shieldPower * shieldCoeff * shieldReceivedMult);
}

export function capUnitContribution(unitOutput: number, ownerBaselineOutput: number, capPct: number): number {
  return Math.min(unitOutput, ownerBaselineOutput * capPct);
}
