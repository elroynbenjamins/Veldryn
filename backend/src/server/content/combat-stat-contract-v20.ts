/**
 * VELDRYN v20 combat-stat contract.
 *
 * This deliberately decouples encounter/content balance from the later equipment rework.
 * Sunscar enemies and bosses may rely on these stats now; regional equipment sets are NOT
 * authored in v20. Existing draft Sunscar gear data should not be imported as authoritative.
 */

export interface CombatStatsV20 {
  maxHp:number;
  power:number;
  accuracy:number;
  armor:number;
  ward:number;
  evasion:number;
  critChance:number;       // decimal, e.g. 0.08 = 8%
  critDamage:number;       // multiplier, e.g. 1.55 = 155%
  haste:number;            // decimal action-speed bonus
  tenacity:number;         // decimal crowd-control/debuff-duration resistance
  healingPower:number;     // scalar budget; 0 for non-support enemies
  shieldingPower:number;   // scalar budget; 0 for non-support enemies
}

export type CombatStatKey=keyof CombatStatsV20;

export const COMBAT_STAT_LIMITS_V20={
  critChance:{min:0,max:0.50},
  critDamage:{min:1,max:2.50},
  haste:{min:-0.50,max:0.75},
  tenacity:{min:0,max:0.75},
} as const;

export function validateCombatStatsV20(stats:CombatStatsV20):string[]{
  const errors:string[]=[];
  const positive:CombatStatKey[]=['maxHp','power','accuracy'];
  for(const key of positive){if(!Number.isFinite(stats[key])||stats[key]<=0) errors.push(`${key}_must_be_positive`);}
  const nonNegative:CombatStatKey[]=['armor','ward','evasion','healingPower','shieldingPower'];
  for(const key of nonNegative){if(!Number.isFinite(stats[key])||stats[key]<0) errors.push(`${key}_must_be_non_negative`);}
  if(stats.critChance<COMBAT_STAT_LIMITS_V20.critChance.min||stats.critChance>COMBAT_STAT_LIMITS_V20.critChance.max) errors.push('critChance_out_of_range');
  if(stats.critDamage<COMBAT_STAT_LIMITS_V20.critDamage.min||stats.critDamage>COMBAT_STAT_LIMITS_V20.critDamage.max) errors.push('critDamage_out_of_range');
  if(stats.haste<COMBAT_STAT_LIMITS_V20.haste.min||stats.haste>COMBAT_STAT_LIMITS_V20.haste.max) errors.push('haste_out_of_range');
  if(stats.tenacity<COMBAT_STAT_LIMITS_V20.tenacity.min||stats.tenacity>COMBAT_STAT_LIMITS_V20.tenacity.max) errors.push('tenacity_out_of_range');
  return errors;
}

export function clampHitChance(accuracy:number,evasion:number):number{
  // Tunable deterministic pre-roll chance. Content can modify via mechanics, but clients never choose it.
  const delta=Math.max(-80,Math.min(120,accuracy-evasion));
  return Math.max(0.55,Math.min(0.98,0.88+delta*0.0025));
}

export interface SetStatModifier {
  stat:CombatStatKey|'maxHpPercent'|'damageReduction'|'cooldownRecovery'|'resourceRegen'|'healingDone'|'damageDone';
  flat?:number;
  percent?:number;
}

export interface SetTriggeredEffect {
  id:string;
  description:string;
  internalCooldownSeconds?:number;
  maxStacks?:number;
  tags:readonly string[];
}

export interface EquipmentSetThresholdV20 {
  pieces:number;
  label:string;
  statModifiers:readonly SetStatModifier[];
  triggeredEffect?:SetTriggeredEffect;
  powerBudgetWeight:number;
}

export interface EquipmentSetDefinitionV20 {
  id:string;
  name:string;
  allowedClasses?:readonly string[];
  eligibleSlots:readonly string[];
  thresholds:readonly EquipmentSetThresholdV20[];
  notes?:string;
}

export interface EquippedSetPieceV20 {setId:string;slot:string;itemId:string;}
export interface ActiveSetBonusV20 {setId:string;pieces:number;unlocked:readonly EquipmentSetThresholdV20[];}

/**
 * Generic threshold model. Sets are free to use 2/3/4/5pc, 2/3/5pc, 2/4pc, etc.
 * v20 intentionally authors NO Sunscar-specific set definitions.
 */
export const SET_BONUS_GUIDANCE_V20={
  commonThresholdPattern:[2,3,5] as const,
  alternateThresholdPattern:[2,3,4,5] as const,
  designPrinciples:[
    '2pc should be broadly useful but modest.',
    '3pc is a good home for a visible stat breakpoint such as +2% Crit Chance or +Max HP.',
    '4pc/5pc should specialize a build rather than provide universally mandatory raw power.',
    '3+2 mixed-set combinations must remain competitive with a full set.',
    'Set bonuses count inside the total item power budget; they are not free power on top.',
    'Major boss mechanics should not require one exact set bonus.',
  ] as const,
  exampleOnly:{
    damage:{twoPiece:'+3% Max HP',threePiece:'+2% Crit Chance',fivePiece:'rotation-specific effect rather than unconditional damage'},
    tank:{twoPiece:'+Armor',threePiece:'+4% Max HP',fivePiece:'timed mitigation/guard interaction'},
    support:{twoPiece:'+Ward',threePiece:'+2% Haste',fivePiece:'conditional healing/shield/resource utility'},
  },
} as const;

export function validateEquipmentSetDefinitionV20(def:EquipmentSetDefinitionV20):string[]{
  const errors:string[]=[];
  if(!def.id.trim()) errors.push('set_id_required');
  if(!def.name.trim()) errors.push('set_name_required');
  if(def.eligibleSlots.length<2) errors.push('set_requires_multiple_slots');
  const seen=new Set<number>();
  let previous=0;
  for(const threshold of def.thresholds){
    if(!Number.isInteger(threshold.pieces)||threshold.pieces<2||threshold.pieces>def.eligibleSlots.length) errors.push('threshold_piece_count_invalid');
    if(seen.has(threshold.pieces)) errors.push('duplicate_threshold');
    if(threshold.pieces<=previous) errors.push('thresholds_must_increase');
    if(threshold.powerBudgetWeight<=0||threshold.powerBudgetWeight>1) errors.push('threshold_power_budget_invalid');
    seen.add(threshold.pieces); previous=threshold.pieces;
  }
  return [...new Set(errors)];
}

export function resolveActiveSetBonusesV20(pieces:readonly EquippedSetPieceV20[],definitions:readonly EquipmentSetDefinitionV20[]):ActiveSetBonusV20[]{
  const bySet=new Map<string,Set<string>>();
  for(const piece of pieces){
    let slots=bySet.get(piece.setId); if(!slots){slots=new Set<string>();bySet.set(piece.setId,slots);} slots.add(piece.slot);
  }
  const defs=new Map(definitions.map(d=>[d.id,d] as const));
  const out:ActiveSetBonusV20[]=[];
  for(const [setId,slots] of bySet){
    const def=defs.get(setId); if(!def) continue;
    const piecesCount=[...slots].filter(slot=>def.eligibleSlots.includes(slot)).length;
    const unlocked=def.thresholds.filter(t=>piecesCount>=t.pieces);
    if(unlocked.length) out.push({setId,pieces:piecesCount,unlocked});
  }
  return out.sort((a,b)=>a.setId.localeCompare(b.setId));
}

/**
 * Encounter mechanics should opt out of random crits when the damage is a telegraphed pass/fail mechanic.
 */
export interface DamagePacketPolicyV20 {
  canCrit:boolean;
  telegraphedMechanic:boolean;
  avoidable:boolean;
  notes?:string;
}

export function mechanicDamagePolicyV20(input:{telegraphed:boolean;avoidable:boolean;basicAttack?:boolean}):DamagePacketPolicyV20{
  const canCrit=Boolean(input.basicAttack)||(!input.telegraphed&&input.avoidable===false);
  return {canCrit,telegraphedMechanic:input.telegraphed,avoidable:input.avoidable,notes:input.telegraphed?'Telegraphed pass/fail damage is deterministic by default.':undefined};
}
