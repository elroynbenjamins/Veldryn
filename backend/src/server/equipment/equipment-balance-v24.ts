import type {EquipmentSlot,EquipmentTierId,GearStatKey} from './equipment-types-v22';

export const TIER_BASE_BUDGET_V24:Readonly<Record<EquipmentTierId,number>>={T1:12,T2:20,T3:31,T4:44,T5:62,T6:83,T7:108,T8:138,T9:172};
export const SLOT_BUDGET_MULTIPLIER_V24:Readonly<Record<EquipmentSlot,number>>={Gloves:.70,Boots:.75,Helmet:.85,Legs:1,Chest:1.20,'Off-hand':1.15,Weapon:1.35};
export const STAT_SHARE_V24={primary:.55,secondary:.30,tertiary:.15} as const;
export const STAT_STORAGE_UNIT_V24:Readonly<Record<GearStatKey,'flat'|'decimal'>>={maxHp:'flat',power:'flat',armor:'flat',ward:'flat',accuracy:'flat',evasion:'decimal',critRate:'decimal',critDamage:'decimal',haste:'decimal',tenacity:'decimal',penetration:'flat',potency:'decimal'};
export const STAT_BUDGET_CONVERSION_V24:Readonly<Record<GearStatKey,number>>={maxHp:10,power:1,armor:1,ward:1,accuracy:1,evasion:.00025,critRate:.00025,critDamage:.00070,haste:.00030,tenacity:.00030,penetration:1,potency:.00035};
export const STAT_LABEL_TO_KEY_V24:Readonly<Record<string,GearStatKey>>={'Max HP':'maxHp','Power':'power','Armor':'armor','Ward':'ward','Accuracy':'accuracy','Evasion':'evasion','Crit Rate':'critRate','Crit Damage':'critDamage','Haste':'haste','Tenacity':'tenacity','Penetration':'penetration','Potency':'potency'};
export const TIER_CRAFT_TIMER_RANGE_MINUTES_V24:Readonly<Record<EquipmentTierId,readonly [number,number]>>={T1:[1,3],T2:[3,6],T3:[5,10],T4:[8,15],T5:[12,20],T6:[15,25],T7:[20,30],T8:[25,40],T9:[30,45]};
export const TIER_RECIPE_UNITS_V24:Readonly<Record<EquipmentTierId,number>>={T1:8,T2:13,T3:20,T4:29,T5:41,T6:55,T7:72,T8:92,T9:116};
export const TIER_CATCHUP_CAP_V24:Readonly<Record<EquipmentTierId,number>>={T1:4,T2:4,T3:4,T4:4,T5:3.5,T6:3,T7:2.5,T8:2.25,T9:2};
export const TIER_FULL_SET_TARGET_HOURS_V24:Readonly<Record<EquipmentTierId,readonly [number,number]>>={T1:[1.5,2],T2:[3,4],T3:[6,8],T4:[9,12],T5:[13,16],T6:[18,22],T7:[22,28],T8:[27,34],T9:[32,42]};
export const RECIPE_SHARE_V24:Readonly<Record<EquipmentTierId,{regionalCommon:number;processed:number;monsterSpecific:number;dungeonBoss:number}>>={
 T1:{regionalCommon:.72,processed:.20,monsterSpecific:.08,dungeonBoss:0},T2:{regionalCommon:.68,processed:.20,monsterSpecific:.12,dungeonBoss:0},T3:{regionalCommon:.63,processed:.20,monsterSpecific:.12,dungeonBoss:.05},
 T4:{regionalCommon:.60,processed:.20,monsterSpecific:.12,dungeonBoss:.08},T5:{regionalCommon:.60,processed:.20,monsterSpecific:.12,dungeonBoss:.08},T6:{regionalCommon:.60,processed:.20,monsterSpecific:.12,dungeonBoss:.08},
 T7:{regionalCommon:.60,processed:.20,monsterSpecific:.12,dungeonBoss:.08},T8:{regionalCommon:.60,processed:.20,monsterSpecific:.12,dungeonBoss:.08},T9:{regionalCommon:.60,processed:.20,monsterSpecific:.12,dungeonBoss:.08}
};
export function exactUpgradeStatMultiplierV24(rank:number):number{if(!Number.isInteger(rank)||rank<0||rank>10)throw new Error('bad_upgrade_rank');return Number((1+rank*.035).toFixed(3));}
export function finalCraftMinutesV24(tier:EquipmentTierId,slot:EquipmentSlot):number{const [lo,hi]=TIER_CRAFT_TIMER_RANGE_MINUTES_V24[tier],m=SLOT_BUDGET_MULTIPLIER_V24[slot],minM=.70,maxM=1.35;return Math.round(lo+((m-minM)/(maxM-minM))*(hi-lo));}
export function oldTierAcquisitionMultiplierV24(currentTier:EquipmentTierId,craftTier:EquipmentTierId):number{const n=(t:EquipmentTierId)=>Number(t.slice(1));const gap=Math.max(0,n(currentTier)-n(craftTier));return Math.min(TIER_CATCHUP_CAP_V24[craftTier],Number((1+gap*.45).toFixed(2)));}
