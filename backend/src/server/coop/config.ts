export const COOP_ROGUELITE_CONFIG = Object.freeze({
  featureFlag: 'coopRogueliteV1',
  enabledByDefault: false,
  routeSchemaVersion: 1,
  routeGeneratorVersion: 'coop-route-v1',
  preBossNodeMin: 5,
  preBossNodeMax: 5,
  choicesPerDepth: 3,
  targetRunMinutesMin: 6,
  targetRunMinutesMax: 8,
  readyCheckMs: 20_000,
  liveVoteMs: 8_000,
  personalChoiceMs: 15_000,
  reconnectGraceMs: 60_000,
  echoFreshnessMs: 24 * 60 * 60 * 1_000,
  normalizedReadinessFloor: 0.8,
  enhancedRewardChargeCapacity: 3,
  enhancedRewardRechargeMs: 8 * 60 * 60 * 1_000,
  enhancedRewardWeeklyLimit: 12,
  tierMinimumLevelOffset: Object.freeze({1:0,2:5,3:10,4:15,5:20}),
} as const);

export type CoopTier=1|2|3|4|5;
export function coopRequiredLevel(baseMinimumLevel:number,tier:CoopTier):number{
  if(!Number.isInteger(baseMinimumLevel)||baseMinimumLevel<1)throw new Error('invalid_expedition_minimum_level');
  return baseMinimumLevel+COOP_ROGUELITE_CONFIG.tierMinimumLevelOffset[tier];
}

export function highestEligibleCoopTier(baseMinimumLevel:number,characterLevel:number):CoopTier|undefined{
  if(!Number.isInteger(characterLevel)||characterLevel<1)throw new Error('invalid_character_level');
  for(const tier of [5,4,3,2,1] as CoopTier[])if(characterLevel>=coopRequiredLevel(baseMinimumLevel,tier))return tier;
  return undefined;
}

export interface RootboundCoopBalance {
  version:string;
  enemyAttackMultiplier:number;
  lateDepthStart:number;
  lateDepthAttackMultiplier:number;
}

/** Role-kit corrections belong to the normalized co-op roster, not to one dungeon. */
export const COOP_CLASS_ABILITY_MULTIPLIERS:Readonly<Record<string,Readonly<Record<string,number>>>>=Object.freeze({
  STONECALLER:Object.freeze({SC_SHIELD:2,SC_HEAL:2}),
});

export const ROOTBOUND_COOP_BALANCE_V2:Readonly<RootboundCoopBalance> = Object.freeze({
  version: 'rootbound-coop-balance-v2',
  enemyAttackMultiplier: 2.9,
  lateDepthStart: 8,
  lateDepthAttackMultiplier: 1,
});
