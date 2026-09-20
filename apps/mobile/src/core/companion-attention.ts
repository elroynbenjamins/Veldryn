import type {GameState} from './types';
import {combatCompanionUiModel} from './combat-companions';
import {companionEconomy,companionView} from './companion-runtime';

export interface CompanionAttentionSummary{
 total:number;
 hasAttention:boolean;
 expeditionClaims:number;
 bondRewards:number;
 ascensions:number;
 sanctuaryClaims:number;
 codexClaims:number;
 monthlyTrialClaims:number;
 recentUnlocks:number;
}

function affordable(state:GameState,cost:{gold:number;companionEssence:number;bondstones?:number;materialId?:string;materialQuantity?:number}){
 const economy=companionEconomy(state);
 return economy.gold>=cost.gold
  &&economy.companionEssence>=cost.companionEssence
  &&economy.bondstones>=(cost.bondstones??0)
  &&(!cost.materialId||(economy.materials[cost.materialId]??0)>=(cost.materialQuantity??0));
}

/** Player-facing companion attention only. This never mutates or grants rewards. */
export function companionAttentionSummary(state:GameState,now:number):CompanionAttentionSummary{
 const view=companionView(state,now),claims=new Set(state.account.companionBondRewardClaims??[]);
 const expeditionClaims=view.assignments.filter(row=>row.status==='completed').length;
 let bondRewards=0,ascensions=0,recentUnlocks=0;
 for(const id of state.account.unlockedCombatCompanionIds??[]){
  const progress=state.account.combatCompanionProgress?.[id],model=combatCompanionUiModel(state,id);
  if(!progress||!model)continue;
  for(const level of [2,4,6,8] as const)if(progress.bondLevel>=level&&!claims.has(id+':'+level))bondRewards++;
  if(model.nextAscensionCost&&affordable(state,model.nextAscensionCost))ascensions++;
  if(progress.obtainedAtMs!==undefined&&now-progress.obtainedAtMs>=0&&now-progress.obtainedAtMs<5*60_000)recentUnlocks++;
 }
 const sanctuary=state.account.companionSanctuary;
 const sanctuaryClaims=(sanctuary?.trainingGroundLevel&&sanctuary.lastTrainingClaimAtMs!==undefined&&now-sanctuary.lastTrainingClaimAtMs>=86_400_000?1:0)
  +(sanctuary?.essenceBasinLevel&&sanctuary.lastEssenceClaimAtMs!==undefined&&now-sanctuary.lastEssenceClaimAtMs>=7*86_400_000?1:0);
 const codexClaims=view.codex.milestones.filter(row=>row.complete&&!row.claimed).length;
 const monthlyCompletion=view.trial.progress.season.monthlyChallengeCompletion??{};
 const monthlyClaims=new Set(view.trial.progress.season.monthlyChallengeClaims??[]);
 const monthlyTrialClaims=Object.entries(monthlyCompletion).filter(([id,complete])=>complete&&!monthlyClaims.has(id)).length;
 const total=expeditionClaims+bondRewards+ascensions+sanctuaryClaims+codexClaims+monthlyTrialClaims+recentUnlocks;
 return {total,hasAttention:total>0,expeditionClaims,bondRewards,ascensions,sanctuaryClaims,codexClaims,monthlyTrialClaims,recentUnlocks};
}

export function companionAttentionLabels(summary:CompanionAttentionSummary){
 return [
  summary.expeditionClaims?summary.expeditionClaims+' expedition'+(summary.expeditionClaims===1?'':'s')+' ready':undefined,
  summary.bondRewards?summary.bondRewards+' Bond reward'+(summary.bondRewards===1?'':'s'):undefined,
  summary.ascensions?summary.ascensions+' Ascension'+(summary.ascensions===1?'':'s')+' ready':undefined,
  summary.sanctuaryClaims?summary.sanctuaryClaims+' Sanctuary claim'+(summary.sanctuaryClaims===1?'':'s'):undefined,
  summary.codexClaims?summary.codexClaims+' Codex reward'+(summary.codexClaims===1?'':'s'):undefined,
  summary.monthlyTrialClaims?summary.monthlyTrialClaims+' Trial reward'+(summary.monthlyTrialClaims===1?'':'s'):undefined,
  summary.recentUnlocks?summary.recentUnlocks+' new companion'+(summary.recentUnlocks===1?'':'s'):undefined,
 ].filter((value):value is string=>!!value);
}
