/**
 * Veldryn Combat 2.0 — isolated, non-live stat and action-scaling contract.
 *
 * No production combat module imports this prototype. It must not be used to
 * translate a client-submitted snapshot or silently migrate saved equipment.
 * Coefficients and final damage caps require the coordinated 2.0 balance pass.
 */

/** Flat strength budgets, not % modifiers or the player-facing CP score. */
export interface CombatPowerStatsV2 {
  weaponPower:number;
  skillPower:number;
  /** These three are decimal fractional bonuses, 0.04 = +4%. */
  abilityDamage:number;
  healingPower:number;
  /** May amplify authored support/utility effects only when tagged explicitly. */
  potency:number;
}

export type CombatActionV2 =
  | {kind:'basic_weapon';purpose:'damage';powerSource:'weapon';coefficient:number}
  | {kind:'weapon_technique';purpose:'damage';powerSource:'weapon';coefficient:number}
  | {kind:'class_skill';purpose:'damage'|'heal'|'shield';powerSource:'skill';coefficient:number};

/** A class skill cannot scale with both weapon and skill budgets.
 * A weapon technique can receive an Ability Damage bonus but does not
 * secretly also take the Skill Power contribution. */
export function validateCombatActionV2(input:CombatActionV2):string[]{
  const errors:string[]=[];
  if(!Number.isFinite(input.coefficient)||input.coefficient<0||input.coefficient>100)errors.push('invalid_action_coefficient');
  if(input.kind==='basic_weapon'&&
    (input.powerSource!=='weapon'||input.purpose!=='damage'))errors.push('invalid_basic_weapon_tag');
  if(input.kind==='weapon_technique'&&
    (input.powerSource!=='weapon'||input.purpose!=='damage'))errors.push('invalid_weapon_technique_tag');
  if(input.kind==='class_skill'&&input.powerSource!=='skill')errors.push('invalid_class_skill_tag');
  if(!['damage','heal','shield'].includes(input.purpose))errors.push('invalid_action_purpose');
  return errors;
}

/** Defensive parsing boundary for server-verified snapshots; the server must
 * independently verify inventory ownership, equipped instance and class data.
 * Not an authority check for client-provided stats. */
export function validateCombatPowerStatsV2(input:unknown):string[]{
  const errors:string[]=[];
  if(!input||typeof input!=='object')return ['missing_stats'];
  const data=input as Partial<Record<keyof CombatPowerStatsV2,unknown>>;
  for(const key of ['weaponPower','skillPower','abilityDamage','healingPower','potency'] as const){
    const value=data[key];
    if(typeof value!=='number'||!Number.isFinite(value)||value<0){
      errors.push('invalid_'+key);
      continue;
    }
    // Broad anti-corruption bounds, NOT the final combat balance soft caps.
    if(value>(key==='weaponPower'||key==='skillPower'?1_000_000_000:10))errors.push('unbounded_'+key);
  }
  return errors;
}

export interface CombatActionPowerProjectionV2 {
  powerSource:'weapon'|'skill';
  basePower:number;
  coefficient:number;
  baseOutput:number;
  bonusMultiplier:number;
  powerAfterBonuses:number;
}

/** Isolated reference projection before crit, armor, wards, resistance,
 * vulnerability, class traits, boss modifiers and final mitigation.
 * Never substitute this function for the current authoritative combat engine.
 *
 * - Basic attacks receive no Ability Damage.
 * - Damaging weapon techniques and class skills receive Ability Damage.
 * - Restorative class skills receive Healing Power.
 * - Shields are Skill Power based but do not silently inherit Healing Power.
 * - Food, consumables and companions are not eligible action kinds here.
 */
export function projectCombatActionPowerV2(
  stats:CombatPowerStatsV2,action:CombatActionV2,
):CombatActionPowerProjectionV2{
  const issues=[...validateCombatPowerStatsV2(stats),...validateCombatActionV2(action)];
  if(issues.length)throw new Error('invalid_combat_v2_projection:'+issues.join(','));
  const basePower=action.powerSource==='weapon'?stats.weaponPower:stats.skillPower;
  const baseOutput=basePower*action.coefficient;
  const bonusMultiplier=action.purpose==='heal'
    ?1+stats.healingPower
    :action.purpose==='damage'&&action.kind!=='basic_weapon'
      ?1+stats.abilityDamage
      :1;
  return {powerSource:action.powerSource,basePower,coefficient:action.coefficient,
    baseOutput,bonusMultiplier,powerAfterBonuses:baseOutput*bonusMultiplier};
}

/** Accepted whole-build balance target for simulation only.
 * These are budget shares, not an additive multiplier and not a runtime CP formula. */
export const COMBAT_2_BUILD_POWER_SHARE_TARGETS={
  classAndLevel:.17,
  equipmentBase:.45,
  rarityAndQuality:.14,
  affixesUpgradesGemsSets:.14,
  companionsAndOther:.10,
} as const;
export type CombatPowerShareCategoryV2=keyof typeof COMBAT_2_BUILD_POWER_SHARE_TARGETS;

export function summarizeBuildContributionV2(
  contributions:Readonly<Record<CombatPowerShareCategoryV2,number>>,
):{total:number;shares:Record<CombatPowerShareCategoryV2,number>}{
  const keys=Object.keys(COMBAT_2_BUILD_POWER_SHARE_TARGETS) as CombatPowerShareCategoryV2[];
  if(keys.some(key=>!Number.isFinite(contributions[key])||contributions[key]<0))
    throw new Error('invalid_build_contribution');
  const total=keys.reduce((sum,key)=>sum+contributions[key],0);
  if(total<=0)throw new Error('empty_build_contribution');
  const shares={} as Record<CombatPowerShareCategoryV2,number>;
  for(const key of keys)shares[key]=contributions[key]/total;
  return {total,shares};
}
