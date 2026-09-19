import type {EquipmentTierId} from './equipment-types-v22';import {exactUpgradeStatMultiplierV24} from './equipment-balance-v24';
const MAX:Record<EquipmentTierId,number>={T1:3,T2:4,T3:5,T4:6,T5:7,T6:8,T7:9,T8:10,T9:10};
const GOLD_BASE:Record<EquipmentTierId,number>={T1:60,T2:110,T3:190,T4:320,T5:520,T6:800,T7:1200,T8:1750,T9:2500};
const GOLD_INDEX=[0,.6,1.76,3.29,5.14,7.27,9.64,12.25,15.06,18.08,21.29];const MAT_INDEX=[0,.7,1.72,2.92,4.24,5.67,7.19,8.78,10.45,12.18,13.97];
const TIER_STONE_SCALE:Record<EquipmentTierId,number>={T1:1,T2:1.1,T3:1.3,T4:1.5,T5:1.8,T6:2.1,T7:2.4,T8:2.8,T9:3.2};
export interface UpgradeCostV24{gold:number;materialKey:'upgrade_stone_minor'|'upgrade_stone_refined'|'upgrade_stone_resonant';materialQuantity:number;statMultiplierAfter:number;}
export function maxUpgradeRankV24(tier:EquipmentTierId){return MAX[tier];}
export function upgradeCostV24(tier:EquipmentTierId,nextRank:number):UpgradeCostV24{if(!Number.isInteger(nextRank)||nextRank<1||nextRank>MAX[tier])throw new Error('invalid_upgrade_rank');const materialKey=nextRank<=3?'upgrade_stone_minor':nextRank<=7?'upgrade_stone_refined':'upgrade_stone_resonant';return {gold:Math.max(1,Math.round(GOLD_BASE[tier]*GOLD_INDEX[nextRank])),materialKey,materialQuantity:Math.max(1,Math.round(MAT_INDEX[nextRank]*TIER_STONE_SCALE[tier]/2.5)),statMultiplierAfter:exactUpgradeStatMultiplierV24(nextRank)};}
export const UPGRADE_RULES_V24={successChance:1,destroyOnFail:false,downgradeOnFail:false,scalesBaseItemStatsOnly:true,gemsAndEnchantsNotScaledByUpgrade:true,remoteConfigCanTuneGoldBaseWithoutChangingItemDefinitions:true} as const;
