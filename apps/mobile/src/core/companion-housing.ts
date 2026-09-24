import type {OwnedCompanionProgress} from './combat-companion-types';

/** Every owned companion gets Basic Quarters automatically. Housing never limits collection or use. */
export const COMPANION_HOUSING_UNLIMITED=true;
export const COMPANION_HOUSING_MILESTONES=[
 {levelCap:10,housingTier:0,label:'Basic Quarters'},
 {levelCap:20,housingTier:1,label:'Reinforced Quarters'},
 {levelCap:25,housingTier:2,label:'Veteran Quarters'},
 {levelCap:35,housingTier:3,label:'Master Quarters'},
] as const;
export const COMPANION_HOUSING_UPGRADES=[
 {tier:1,gold:12000,inputs:[{itemId:'IRONWOOD_LOG',quantity:80},{itemId:'ASTER_IRON_INGOT',quantity:30},{itemId:'REINFORCED_FITTING',quantity:8}]},
 {tier:2,gold:45000,inputs:[{itemId:'CROWNWOOD_LOG',quantity:120},{itemId:'OATHSTONE_INGOT',quantity:45},{itemId:'REINFORCED_FITTING',quantity:16},{itemId:'OATHGLASS_SHARD',quantity:10}]},
 {tier:3,gold:140000,inputs:[{itemId:'WHITEPINE_LOG',quantity:150},{itemId:'FROSTIRON_INGOT',quantity:60},{itemId:'RIMEGLASS',quantity:18},{itemId:'CHOIR_BLOOM',quantity:6}]},
] as const;
export type CompanionHousingTiers=Record<string,number>;
export function companionHousingTier(companionId:string,tiers?:CompanionHousingTiers){return Math.max(0,Math.min(3,Math.floor(tiers?.[companionId]??0)));}
export function companionHousingLevelCap(housingTier:number){const tier=Math.max(0,Math.min(3,Math.floor(housingTier)));return COMPANION_HOUSING_MILESTONES[tier].levelCap;}
export function companionHousingRequiredTier(progress:OwnedCompanionProgress){if(progress.level<10)return 0;if(progress.level<20)return 1;if(progress.level<25)return 2;return 3;}
export function companionCanLevelWithHousing(companionId:string,progress:OwnedCompanionProgress,tiers?:CompanionHousingTiers){return progress.level<companionHousingLevelCap(companionHousingTier(companionId,tiers));}
