import {EXPEDITION} from '../expeditions/constants';
/** Server-only mirror of the published Combat XP rebasing curve.
 * Kept inside backend/src to avoid importing mobile files into the backend
 * rootDir-only build. Online parity tests compare both implementations.
 *
 * These three numbers are the whole mirror, and they must stay equal to
 * apps/mobile/src/core/progression.ts:
 *   LEGACY_EXPONENT   <- baseXpForNextLevel, scaled by CHARACTER_XP_SCALE
 *   CHARACTER_EXPONENT <- CHARACTER_XP_EXPONENT, the combat curve players are on
 *   XP_SCALE          <- CHARACTER_XP_SCALE
 * CLASS_COMBAT_XP_EXPONENT (2.09) is a different, steeper curve used only by
 * class combat disciplines. It must never appear here: reading a character
 * level off it under-levels every player and closes co-op gates the client
 * has already opened. */
const LEGACY_EXPONENT=1.42,CHARACTER_EXPONENT=1.65,XP_SCALE=8;
export function rebaseLegacyCombatLevel(level:number):number {
  const bounded=Math.max(1,Math.min(100,Math.floor(Number.isFinite(level)?level:1)));
  let earned=0;
  for(let previous=1;previous<bounded;previous++)earned+=Math.floor(90*Math.pow(previous,LEGACY_EXPONENT)+previous*35)*XP_SCALE;
  let current=1,spent=0;
  while(current<100){
    const need=Math.floor(90*Math.pow(current,CHARACTER_EXPONENT)+current*35)*XP_SCALE;
    if(spent+need>earned)return current;
    spent+=need;
    current++;
  }
  return 100;
}
export const COOP_ROGUELITE_CONFIG = Object.freeze({
  featureFlag: 'coopRogueliteV1',
  enabledByDefault: false,
  routeSchemaVersion: 1,
  routeGeneratorVersion: 'coop-route-v2',
  preBossNodeMin: 5,
  preBossNodeMax: 5,
  choicesPerDepth: 3,
  targetRunMinutesMin: 6,
  targetRunMinutesMax: 8,
  readyCheckMs: 20_000,
  liveVoteMs: 8_000,
  eventLiveVoteMs: 10_000,
  personalChoiceMs: 15_000,
  reconnectGraceMs: 60_000,
  echoFreshnessMs: 7 * 24 * 60 * 60 * 1_000,
  normalizedReadinessFloor: 0.8,
  enhancedRewardChargeCapacity: 3,
  enhancedRewardRechargeMs: 8 * 60 * 60 * 1_000,
  enhancedRewardWeeklyLimit: 12,
  tierMinimumLevelOffset: Object.freeze({1:0,2:5,3:10,4:15,5:20}),
} as const);

export type CoopTier=1|2|3|4|5;
/** Only these tiers may be selected for NEW runs; higher legacy tiers remain valid for replay and rewards. */
export const PUBLISHED_COOP_TIERS=[1,2,3] as const satisfies readonly CoopTier[];
export function isPublishedCoopTier(tier:number):tier is 1|2|3{return PUBLISHED_COOP_TIERS.some(value=>value===tier);}
export function coopRequiredLevel(baseMinimumLevel:number,tier:CoopTier):number{
  if(!Number.isInteger(baseMinimumLevel)||baseMinimumLevel<1)throw new Error('invalid_expedition_minimum_level');
  return rebaseLegacyCombatLevel(baseMinimumLevel+COOP_ROGUELITE_CONFIG.tierMinimumLevelOffset[tier]);
}

export function highestEligibleCoopTier(baseMinimumLevel:number,characterLevel:number):CoopTier|undefined{
  if(!Number.isInteger(characterLevel)||characterLevel<1)throw new Error('invalid_character_level');
  for(const tier of [...PUBLISHED_COOP_TIERS].reverse())if(characterLevel>=coopRequiredLevel(baseMinimumLevel,tier))return tier;
  return undefined;
}

/** Automatic matchmaking is conservative for under-geared characters, but
 * never removes a manually selectable level-unlocked tier. The server alone
 * computes normalizedScore from the verified and frozen loadout. */
export function readinessEligibleCoopTier(baseMinimumLevel:number,characterLevel:number,normalizedScore:number):CoopTier|undefined{
 if(!Number.isFinite(normalizedScore)||normalizedScore<COOP_ROGUELITE_CONFIG.normalizedReadinessFloor)return undefined;
 const eligible=highestEligibleCoopTier(baseMinimumLevel,characterLevel);
 if(!eligible)return undefined;
 for(const tier of [...PUBLISHED_COOP_TIERS].reverse()){
  if(tier<=eligible&&normalizedScore>=COOP_ROGUELITE_CONFIG.normalizedReadinessFloor*EXPEDITION.difficultyIndex[tier])return tier;
 }
 return 1;
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
