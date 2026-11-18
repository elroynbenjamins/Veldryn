import type {GearSlot} from './types';
import type {ItemRarity} from './item-rarity';

/** Hidden Equipment 2.0 DESIGN MODEL, not the shipped stat or Forge authority.
 * Every generated item will ultimately be rolled and persisted by the server.
 * Do not connect this module to effectiveStats or claim settlement before parity tests.
 */
export type EquipmentV2Tier=1|2|3|4;
export type EquipmentV2Profile='attack'|'defense'|'health'|'attack_defense'|'attack_health'|'defense_health';
export type EquipmentV2Affix='armor'|'maxHp'|'ward'|'tenacity'|'critRate'|'critDamage'|'haste'|'penetration'|'accuracy'|'potency'|'abilityDamage'|'healingPower';
export interface EquipmentV2BaseStats {attack:number;defense:number;hp:number}
export interface EquipmentV2RarityOutcome {rarity:ItemRarity;chance:number;affixes:number;rollBand:[number,number]}

export const EQUIPMENT_V2_HP_PER_BUDGET_POINT=4;
export const EQUIPMENT_V2_TIER_BUDGET_FACTOR=1.08;
/** Derived from the existing V33 neutral slot templates, not from rarity. */
export const EQUIPMENT_V2_T1_SLOT_BUDGET:Readonly<Record<GearSlot,number>>={
 helmet:6,chest:11,gloves:5.5,legs:8,boots:5.75,cape:6.25,
 weapon:9,offhand:10,amulet:6,ring:5.5,
};
export const EQUIPMENT_V2_PROFILES:Readonly<Record<GearSlot,readonly EquipmentV2Profile[]>>={
 helmet:['defense','health','defense_health'],
 chest:['defense','health','defense_health'],
 gloves:['attack','attack_defense'],
 legs:['defense','health','defense_health'],
 boots:['attack','defense','attack_health','defense_health'],
 cape:['health','attack_health','defense_health'],
 weapon:['attack','attack_defense','attack_health'],
 offhand:['attack','defense','attack_defense','defense_health'],
 amulet:['attack','health','attack_health'],
 ring:['attack','health','attack_health'],
};
export const EQUIPMENT_V2_RARITIES:readonly EquipmentV2RarityOutcome[]=[
 {rarity:'common',chance:.8,affixes:1,rollBand:[0,.25]},
 {rarity:'uncommon',chance:.13,affixes:1,rollBand:[.2,.45]},
 {rarity:'rare',chance:.05,affixes:1,rollBand:[.4,.7]},
 {rarity:'epic',chance:.015,affixes:2,rollBand:[.55,.85]},
 {rarity:'legendary',chance:.004,affixes:2,rollBand:[.7,.95]},
 {rarity:'mythic',chance:.001,affixes:3,rollBand:[.85,1]},
] as const;
/** T1/T2 Epic has one affix; Legendary/Mythic have two. */
export function equipmentV2AffixCount(tier:EquipmentV2Tier,rarity:ItemRarity){
 const entry=EQUIPMENT_V2_RARITIES.find(row=>row.rarity===rarity);
 if(!entry)throw new Error('Unknown V2 rarity');
 return tier<3&&rarity==='epic'?1:tier<3&&rarity==='mythic'?2:entry.affixes;
}
export function equipmentV2QualityMultiplier(quality:number){
 if(!Number.isInteger(quality)||quality<0||quality>100)throw new Error('Quality must be an integer 0..100');
 return .75+quality*.005;
}
export function equipmentV2Budget(tier:EquipmentV2Tier,slot:GearSlot){
 if(![1,2,3,4].includes(tier))throw new Error('Unsupported Equipment V2 tier');
 return EQUIPMENT_V2_T1_SLOT_BUDGET[slot]*tier*EQUIPMENT_V2_TIER_BUDGET_FACTOR;
}
/** Profile selection only redistributes a constant budget. */
export function equipmentV2PreviewBaseStats(tier:EquipmentV2Tier,slot:GearSlot,profile:EquipmentV2Profile,quality=50,rarityMultiplier=1):EquipmentV2BaseStats{
 if(!EQUIPMENT_V2_PROFILES[slot]?.includes(profile))throw new Error('Profile not allowed for this slot');
 if(!Number.isFinite(rarityMultiplier)||rarityMultiplier<1||rarityMultiplier>3)throw new Error('Invalid preview rarity multiplier');
 const total=equipmentV2Budget(tier,slot)*equipmentV2QualityMultiplier(quality)*rarityMultiplier;
 const split=profile==='attack'?[1,0,0]
  :profile==='defense'?[0,1,0]
  :profile==='health'?[0,0,1]
  :profile==='attack_defense'?[.6,.4,0]
  :profile==='attack_health'?[.6,0,.4]
  :[0,2/3,1/3];
 return {attack:total*split[0],defense:total*split[1],hp:total*split[2]*EQUIPMENT_V2_HP_PER_BUDGET_POINT};
}
export function equipmentV2StatBudget(stats:EquipmentV2BaseStats){
 return stats.attack+stats.defense+stats.hp/EQUIPMENT_V2_HP_PER_BUDGET_POINT;
}
/** Percentage values, before rarity roll-band filtering. */
export const EQUIPMENT_V2_AFFIX_RANGES:Readonly<Record<EquipmentV2Affix,readonly [readonly [number,number],readonly [number,number],readonly [number,number],readonly [number,number]]>>={
 armor:[[.6,1.2],[1,2],[1.5,3],[1.5,3]],
 maxHp:[[.8,1.6],[1.2,2.5],[2,4],[2,4]],
 ward:[[.2,.7],[.3,1],[.5,1.5],[.5,1.5]],
 tenacity:[[.8,1.6],[1.2,2.6],[2,4],[2,4]],
 critRate:[[.2,.7],[.3,1],[.5,1.5],[.5,1.5]],
 critDamage:[[1,2.5],[1.5,3.5],[2.5,5.5],[2.5,5.5]],
 haste:[[.3,.9],[.5,1.3],[.8,2],[.8,2]],
 penetration:[[.4,1.1],[.7,1.7],[1,2.5],[1,2.5]],
 accuracy:[[.2,.7],[.3,1],[.5,1.5],[.5,1.5]],
 potency:[[.6,1.5],[1,2.3],[1.5,3.5],[1.5,3.5]],
 abilityDamage:[[.8,1.8],[1.2,2.8],[2,4.5],[2,4.5]],
 healingPower:[[.8,1.8],[1.2,2.8],[2,4.5],[2,4.5]],
};
export function equipmentV2AffixBounds(tier:EquipmentV2Tier,rarity:ItemRarity,affix:EquipmentV2Affix){
 const range=EQUIPMENT_V2_AFFIX_RANGES[affix][tier-1];
 const raritySpec=EQUIPMENT_V2_RARITIES.find(row=>row.rarity===rarity);
 if(!range||!raritySpec)throw new Error('Invalid affix preview parameters');
 const width=range[1]-range[0];
 const [low,high]=raritySpec.rollBand;
 return {minimum:range[0]+width*low,maximum:range[0]+width*high,fullMinimum:range[0],fullMaximum:range[1]};
}
/** Editorial target only; never force rating shares onto individual characters. */
export const EQUIPMENT_V2_TARGET_POWER_SHARES={
 classAndLevel:.17,gearBase:.45,rarityAndQuality:.14,affixesGemsSetsUpgrades:.14,companionAndOther:.10,
} as const;

/** One-handed weapon + off-hand, two-handed weapon and dual-blade loadouts
 * receive equivalent combined flat budgets. Off-hand remains unavailable
 * when a two/dual-hand weapon occupies both hands.
 */
export type EquipmentV2WeaponHands='one'|'two'|'dual';
export function equipmentV2WeaponAndOffhandBudget(tier:EquipmentV2Tier){
 return equipmentV2Budget(tier,'weapon')+equipmentV2Budget(tier,'offhand');
}
export function equipmentV2PreviewArmamentStats(
 tier:EquipmentV2Tier,profile:EquipmentV2Profile,hands:EquipmentV2WeaponHands,
 quality=50,rarityMultiplier=1,
):EquipmentV2BaseStats{
 const normal=equipmentV2PreviewBaseStats(tier,'weapon',profile,quality,rarityMultiplier);
 const multiplier=hands==='one'?1:equipmentV2WeaponAndOffhandBudget(tier)/equipmentV2Budget(tier,'weapon');
 return {attack:normal.attack*multiplier,defense:normal.defense*multiplier,hp:normal.hp*multiplier};
}
