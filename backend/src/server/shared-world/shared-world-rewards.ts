import type { RegionalCrisisDefinition, RegionalCrisisState } from './regional-crises';
import { eligibleForWorldBossVictoryReward, type WorldBossDefinition, type WorldBossState } from './world-bosses';
import { worldBossPrestigeTier } from './world-boss-ranking';

export interface CrisisRewardEligibilityInput {
  state:RegionalCrisisState;
  /**
   * 'finalized' does not say whether the region was secured. Pass the recorded outcome so a crisis that
   * failed and was then finalized never grants the server success reward.
   */
  outcome?:'secured'|'failed';
  totalPersonalPoints:number;
  claimedRewardKeys:readonly string[];
  definition:RegionalCrisisDefinition;
}
export interface RewardGrantIntent {rewardKey:string;bundleId:string;reason:string;}

export function crisisSucceeded(state:RegionalCrisisState,outcome?:'secured'|'failed'):boolean{
  return state==='secured'||(state==='finalized'&&outcome==='secured');
}

export function crisisRewardIntents(input:CrisisRewardEligibilityInput):RewardGrantIntent[]{
  const grants:RewardGrantIntent[]=[];
  const claimed=new Set(input.claimedRewardKeys);
  const eligible=input.totalPersonalPoints>=input.definition.personalRewardEligibilityPoints;
  if(eligible && !claimed.has('participation')) grants.push({rewardKey:'participation',bundleId:input.definition.participationRewardBundleId,reason:'regional_crisis_participation'});
  for(const threshold of input.definition.personalMilestones){
    const key=`personal_${threshold}`;
    if(input.totalPersonalPoints>=threshold&&!claimed.has(key)) grants.push({rewardKey:key,bundleId:`regional_crisis_personal_${threshold}_v1`,reason:'regional_crisis_personal_milestone'});
  }
  if(crisisSucceeded(input.state,input.outcome)&&eligible&&!claimed.has('success')) grants.push({rewardKey:'success',bundleId:input.definition.successRewardBundleId,reason:'regional_crisis_server_success'});
  return grants;
}

export interface WorldBossRewardEligibilityInput {
  state:WorldBossState;
  /** 'finalized' covers both defeated and expired bosses; pass the defeat time so only real victories pay out. */
  defeatedAtMs?:number;
  validAttempts:number;
  echoAttempts:number;
  scoredRaidImpact:number;
  finalRank?:number;
  qualifyingPopulation?:number;
  claimedRewardKeys:readonly string[];
  definition:WorldBossDefinition;
}

export function worldBossWasDefeated(state:WorldBossState,defeatedAtMs?:number):boolean{
  return state==='defeated'||(state==='finalized'&&defeatedAtMs!=null);
}

/**
 * Echo attempts earn participation only: they deal no shared HP damage and carry no scored victory or
 * prestige credit, matching the in-game Echo copy.
 */
export function worldBossRewardIntents(input:WorldBossRewardEligibilityInput):RewardGrantIntent[]{
  const grants:RewardGrantIntent[]=[]; const claimed=new Set(input.claimedRewardKeys);
  const scoredParticipant=eligibleForWorldBossVictoryReward(input.validAttempts,input.definition);
  const participated=scoredParticipant||input.echoAttempts>0;
  if(participated&&!claimed.has('participation')) grants.push({rewardKey:'participation',bundleId:input.definition.participationRewardBundleId,reason:'world_boss_participation'});
  for(const threshold of input.definition.personalImpactMilestones){
    const key=`impact_${threshold}`;
    if(input.scoredRaidImpact>=threshold&&!claimed.has(key)) grants.push({rewardKey:key,bundleId:`world_boss_impact_${threshold}_v1`,reason:'world_boss_impact_milestone'});
  }
  if(scoredParticipant&&worldBossWasDefeated(input.state,input.defeatedAtMs)&&!claimed.has('victory')) grants.push({rewardKey:'victory',bundleId:input.definition.victoryRewardBundleId,reason:'world_boss_server_victory'});
  if(input.validAttempts>0&&input.finalRank&&input.definition.prestigeRewardBundleId&&!claimed.has('prestige')){
    const tier=worldBossPrestigeTier(input.finalRank,Math.max(1,input.qualifyingPopulation??input.finalRank));
    if(tier&&tier!=='qualified') grants.push({rewardKey:'prestige',bundleId:input.definition.prestigeRewardBundleId,reason:'world_boss_prestige_rank'});
  }
  return grants;
}
