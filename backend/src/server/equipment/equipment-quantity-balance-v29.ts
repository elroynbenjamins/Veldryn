import type {EquipmentTierId,EquipmentSlot} from './equipment-types-v22';
import {targetAcquisitionHoursV28,targetFinalCraftMinutesV28} from './equipment-acquisition-balance-v28';

export const GLOBAL_CRAFT_RARITY_V29={Common:.888,Uncommon:.08,Rare:.025,Epic:.006,Mythic:.001} as const;
export type GlobalCraftRarityV29=keyof typeof GLOBAL_CRAFT_RARITY_V29;

export const GATHER_SEC_PER_RAW_V29:Readonly<Record<EquipmentTierId,number>>={T1:6,T2:8,T3:10,T4:14,T5:12,T6:17,T7:14,T8:20,T9:20};
export const COMBAT_SEC_PER_COMPONENT_V29:Readonly<Record<EquipmentTierId,number>>={T1:45,T2:60,T3:90,T4:120,T5:150,T6:180,T7:210,T8:240,T9:270};
export const DUNGEON_SEC_PER_TOKEN_V29:Readonly<Record<EquipmentTierId,number>>={T1:0,T2:0,T3:180,T4:210,T5:225,T6:240,T7:240,T8:255,T9:270};
export const COMPONENT_INPUT_SCALE_V29:Readonly<Record<EquipmentTierId,number>>={T1:1,T2:1.5,T3:2.5,T4:3.5,T5:5,T6:6.5,T7:8,T8:10,T9:12};

export function targetQuantityBudgetV29(tier:EquipmentTierId,path:'Foundation'|'Specialist'|'Alternate',slot:EquipmentSlot){
 const h=targetAcquisitionHoursV28(tier,path,slot);
 return {
   totalHours:h.total,
   skillingMinutes:h.skilling*60,
   combatMinutes:h.combat*60,
   dungeonMinutes:(tier==='T1'||tier==='T2')?0:h.dungeon*60,
   finalCraftMinutes:targetFinalCraftMinutesV28(tier,slot),
 };
}

export function combatComponentQtyV29(tier:EquipmentTierId,combatMinutes:number){
 if(combatMinutes<=0)return 0;
 return Math.max(1,Math.round(combatMinutes/(COMBAT_SEC_PER_COMPONENT_V29[tier]/60)));
}

export function guaranteedTokenQtyV29(tier:EquipmentTierId,dungeonMinutes:number){
 if(tier==='T1'||tier==='T2'||dungeonMinutes<=0)return 0;
 return Math.max(1,Math.round(dungeonMinutes/(DUNGEON_SEC_PER_TOKEN_V29[tier]/60)));
}

export function validateGlobalRarityV29(){
 const total=Object.values(GLOBAL_CRAFT_RARITY_V29).reduce((a,b)=>a+b,0);
 if(Math.abs(total-1)>1e-12)throw new Error('v29_rarity_total_invalid');
 if(GLOBAL_CRAFT_RARITY_V29.Mythic!==.001)throw new Error('v29_mythic_not_global_point_one_percent');
 if(GLOBAL_CRAFT_RARITY_V29.Epic!==.006)throw new Error('v29_epic_not_global_point_six_percent');
 return true;
}
