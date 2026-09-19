import type {EquipmentTierId,EquipmentSlot} from './equipment-types-v22';
export type EquipmentPathV28='Foundation'|'Specialist'|'Alternate';
export const SET_EFFORT_HOURS_V28:Readonly<Record<EquipmentTierId,readonly [number,number]>>={T1:[1.5,2],T2:[3,4],T3:[6,8],T4:[9,12],T5:[13,16],T6:[18,22],T7:[22,28],T8:[27,34],T9:[32,42]};
export const SLOT_EFFORT_MULT_V28:Readonly<Record<EquipmentSlot,number>>={Helmet:.85,Chest:1.2,Gloves:.7,Legs:1,Boots:.75,Weapon:1.35,'Off-hand':1.15};
export const FINAL_CRAFT_TIMER_RANGE_MIN_V28:Readonly<Record<EquipmentTierId,readonly [number,number]>>={T1:[1,3],T2:[3,6],T3:[5,10],T4:[8,15],T5:[12,20],T6:[15,25],T7:[20,30],T8:[25,40],T9:[30,45]};
type Split={skilling:number;combat:number;dungeon:number};
export const ACQUISITION_SPLIT_V28:Readonly<Record<EquipmentPathV28,Split>>={Foundation:{skilling:.72,combat:.18,dungeon:.10},Specialist:{skilling:.51,combat:.21,dungeon:.28},Alternate:{skilling:.42,combat:.23,dungeon:.35}};
export const EARLY_ACQUISITION_SPLIT_V28:Readonly<Record<EquipmentPathV28,Split>>={Foundation:{skilling:.86,combat:.14,dungeon:0},Specialist:{skilling:.74,combat:.26,dungeon:0},Alternate:{skilling:.65,combat:.30,dungeon:.05}};
export function targetPieceHoursV28(tier:EquipmentTierId,slot:EquipmentSlot){const [lo,hi]=SET_EFFORT_HOURS_V28[tier];return ((lo+hi)/2/7)*SLOT_EFFORT_MULT_V28[slot];}
export function targetFinalCraftMinutesV28(tier:EquipmentTierId,slot:EquipmentSlot){const [lo,hi]=FINAL_CRAFT_TIMER_RANGE_MIN_V28[tier];const m=SLOT_EFFORT_MULT_V28[slot];return Math.round(lo+((m-.70)/(.65))*(hi-lo));}
export function targetAcquisitionHoursV28(tier:EquipmentTierId,path:EquipmentPathV28,slot:EquipmentSlot){const total=targetPieceHoursV28(tier,slot);const timer=targetFinalCraftMinutesV28(tier,slot)/60;const remaining=Math.max(0,total-timer);const split=tier==='T1'||tier==='T2'?EARLY_ACQUISITION_SPLIT_V28[path]:ACQUISITION_SPLIT_V28[path];return {total,finalCraft:timer,skilling:remaining*split.skilling,combat:remaining*split.combat,dungeon:remaining*split.dungeon};}
