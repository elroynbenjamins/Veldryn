import {SLOT_PACING_V22,TIER_PACING_V22} from './equipment-catalog-v22';import type {EquipmentSlot,EquipmentTierId} from './equipment-types-v22';
const slotMap=new Map(SLOT_PACING_V22.map(v=>[v.slot,v.costMultiplier]));
export const CRAFTING_BALANCE_V22={firstPrimarySetAcceleration:0.15,requiredMaterialShare:{regionalCommon:[.55,.70],processed:[.15,.25],monsterSpecific:[.10,.15],dungeonBoss:[.05,.10]},guaranteedRequiredBossMaterials:true,paidTimerSkipCreatesNoExtraStats:true} as const;
export function slotCostMultiplierV22(slot:EquipmentSlot):number{return slotMap.get(slot)??1;}
export function tierPacingV22(tier:EquipmentTierId){const v=TIER_PACING_V22.find(p=>p.tier===tier);if(!v)throw new Error(`unknown_tier:${tier}`);return v;}
export function storyAcceleratedEffortV22(baseHours:number,isFirstPrimarySet:boolean):number{return baseHours*(isFirstPrimarySet?1-CRAFTING_BALANCE_V22.firstPrimarySetAcceleration:1);}
export function oldTierCatchupMultiplierV22(currentTier:number,craftTier:number):number{const gap=Math.max(0,currentTier-craftTier);return Math.min(4,1+gap*.45);}
