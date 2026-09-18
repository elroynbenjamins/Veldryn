import { EXPEDITION, FAILURE_REWARD, ExpeditionTier } from './constants';

export type RewardState = {
  cleared: boolean;
  routeProgress: number;
  reachedFinalBoss: boolean;
  finalBossHpFraction?: number;
};

export function failureRewardFraction(state: RewardState): number {
  if (state.cleared) return FAILURE_REWARD.clear;
  if (state.reachedFinalBoss && (state.finalBossHpFraction ?? 1) <= 0.25) return FAILURE_REWARD.bossLow;
  if (state.reachedFinalBoss) return FAILURE_REWARD.finalBoss;
  if (state.routeProgress >= 0.50) return FAILURE_REWARD.half;
  if (state.routeProgress >= 0.25) return FAILURE_REWARD.quarter;
  return FAILURE_REWARD.early;
}

export function baseMarks(mapBaseMarks: number, tier: ExpeditionTier, objectiveMultiplier = 1): number {
  return Math.round(mapBaseMarks * EXPEDITION.marksMultiplier[tier] * objectiveMultiplier);
}

export const V48_DUNGEON_REWARD_TUNING={
  firstClearMultiplier:1.25,
  cleanClearMultiplier:1.10,
  maxCombinedClearMultiplier:1.35,
  nearBossFailureFraction:0.50,
} as const;

export interface ClearBonusOptions{firstClear?:boolean;cleanClear?:boolean}
export function clearRewardMultiplier(input:ClearBonusOptions={}){
  let multiplier=1;
  if(input.firstClear)multiplier*=V48_DUNGEON_REWARD_TUNING.firstClearMultiplier;
  if(input.cleanClear)multiplier*=V48_DUNGEON_REWARD_TUNING.cleanClearMultiplier;
  return Math.min(V48_DUNGEON_REWARD_TUNING.maxCombinedClearMultiplier,multiplier);
}

export function marksForRun(
  mapBaseMarks: number,
  tier: ExpeditionTier,
  state: RewardState,
  objectiveMultiplier = 1,
  enhancedEligible = true,
  clearBonus:ClearBonusOptions={},
): number {
  const full = baseMarks(mapBaseMarks, tier, objectiveMultiplier);
  const frac = failureRewardFraction(state);
  const mastery=state.cleared?clearRewardMultiplier(clearBonus):1;
  const preCap = Math.round(full * frac * mastery);
  return enhancedEligible ? preCap : Math.round(preCap * EXPEDITION.postCapMarksCoefficient);
}

export function enhancedRewardEligible(dailyUsed: number, weeklyUsed: number): boolean {
  return dailyUsed < EXPEDITION.enhancedDaily && weeklyUsed < EXPEDITION.enhancedWeekly;
}

export function echoOwnerFullRewardEligible(dailyUsed: number, weeklyUsed: number): boolean {
  return dailyUsed < EXPEDITION.echoOwnerDaily && weeklyUsed < EXPEDITION.echoOwnerWeekly;
}
