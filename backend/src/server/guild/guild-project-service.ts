import type { SocialContributionEvent } from '../liveops/contribution';
import type { GuildContributionTargetSnapshot, GuildProjectContributionResult } from './guild-project-contribution-router';
import {
  creditGuildProjectContribution,
  deriveGuildWeeklyProjectBalance,
  evaluateGuildProject,
  isContributionCategoryEligible,
  memberEligibleForGuildProjectCompletionReward,
  type GuildProjectDefinition,
  type GuildProjectMemberProgress,
  type GuildProjectMembershipSnapshot,
  type GuildWeeklyProjectBalance,
} from './guild-projects';

export interface GuildProjectInstanceRecord {
  id:string;
  guildId:string;
  guildNameSnapshot?:string;
  definition:GuildProjectDefinition;
  balance:GuildWeeklyProjectBalance;
  status:'active'|'completed'|'expired'|'cancelled';
  startsAtMs:number;
  endsAtMs?:number;
  completionPoints:number;
  combatPoints:number;
  skillingPoints:number;
  completedAtMs?:number;
  cycleKey?:string;
}

export interface GuildProjectContributionState {
  instance:GuildProjectInstanceRecord;
  memberProgress:GuildProjectMemberProgress[];
  accountProgress?:GuildProjectMemberProgress;
  pointsCreditedToday:number;
}

export interface GuildProjectRepository {
  /** Must lock the instance + account progress or otherwise serialize the same project/account mutation. */
  loadContributionStateForUpdate(projectInstanceId:string,accountId:string,dateKey:string):Promise<GuildProjectContributionState|undefined>;
  getCycleBinding(cycleKey:string,accountId:string):Promise<{guildId:string}|undefined>;
  bindCycle(cycleKey:string,accountId:string,guildId:string,pointsAtBind:number):Promise<{guildId:string}>;
  hasContributionReceipt(projectInstanceId:string,accountId:string,sourceEventId:string):Promise<boolean>;
  applyContribution(input:{
    projectInstanceId:string; accountId:string; sourceEventId:string; dateKey:string; category:'combat'|'skilling';
    rawPoints:number; creditedPoints:number; completionCreditedPoints:number; occurredAtMs:number; activityKind:string; contentId:string; units:number;
  }):Promise<void>;
  markCompleted(projectInstanceId:string,completedAtMs:number,evaluationSnapshot:unknown):Promise<void>;
  loadMembershipSnapshot(projectInstanceId:string,accountId:string,completedAtMs:number):Promise<GuildProjectMembershipSnapshot|undefined>;
  hasRewardClaim(projectInstanceId:string,accountId:string,rewardKey:string):Promise<boolean>;
  recordRewardClaim(projectInstanceId:string,accountId:string,rewardKey:string):Promise<void>;
}

export async function recordGuildProjectContribution(
  repo:GuildProjectRepository,
  projectInstanceId:string,
  event:SocialContributionEvent,
  snapshot:GuildContributionTargetSnapshot,
):Promise<GuildProjectContributionResult>{
  if(!snapshot.guildIdAtSettlement)return {projectInstanceId,creditedPoints:0,completionCreditedPoints:0,completed:false};
  if(await repo.hasContributionReceipt(projectInstanceId,event.accountId,event.sourceEventId)){
    const existing=await repo.loadContributionStateForUpdate(projectInstanceId,event.accountId,event.dateKey);
    return {projectInstanceId,creditedPoints:0,completionCreditedPoints:0,completed:existing?.instance.status==='completed'};
  }
  const state=await repo.loadContributionStateForUpdate(projectInstanceId,event.accountId,event.dateKey);
  if(!state || state.instance.status!=='active')return {projectInstanceId,creditedPoints:0,completionCreditedPoints:0,completed:false};
  if(state.instance.guildId!==snapshot.guildIdAtSettlement)return {projectInstanceId,creditedPoints:0,completionCreditedPoints:0,completed:false};
  if(state.instance.definition.kind!=='weekly_campaign' && state.instance.definition.kind!=='event')return {projectInstanceId,creditedPoints:0,completionCreditedPoints:0,completed:false};
  const cycleKey=(state.instance as GuildProjectInstanceRecord & {cycleKey?:string}).cycleKey;
  if(state.instance.definition.kind==='weekly_campaign' && cycleKey){
    const binding=await repo.getCycleBinding(cycleKey,event.accountId);
    if(binding && binding.guildId!==state.instance.guildId)return {projectInstanceId,creditedPoints:0,completionCreditedPoints:0,completed:false};
  }
  if(!isContributionCategoryEligible(state.instance.definition.focus,event.profile.category))return {projectInstanceId,creditedPoints:0,completionCreditedPoints:0,completed:false};
  const credit=creditGuildProjectContribution({
    profile:event.profile,
    units:event.units,
    pointsCreditedToday:state.pointsCreditedToday,
    completionPointsByAccount:state.accountProgress?.completionPoints??0,
    balance:state.instance.balance,
  });
  const projectedRaw=(state.accountProgress?.rawPoints??0)+credit.dailyCreditedPoints;
  if(state.instance.definition.kind==='weekly_campaign' && cycleKey && projectedRaw>=state.instance.balance.meaningfulContributorThreshold){
    const binding=await repo.bindCycle(cycleKey,event.accountId,state.instance.guildId,projectedRaw);
    if(binding.guildId!==state.instance.guildId)return {projectInstanceId,creditedPoints:0,completionCreditedPoints:0,completed:false};
  }
  await repo.applyContribution({
    projectInstanceId,accountId:event.accountId,sourceEventId:event.sourceEventId,dateKey:event.dateKey,
    category:event.profile.category,rawPoints:credit.rawPoints,creditedPoints:credit.dailyCreditedPoints,
    completionCreditedPoints:credit.completionCreditedPoints,occurredAtMs:event.occurredAtMs,activityKind:event.activityKind,contentId:event.contentId,units:event.units,
  });
  const updatedRows=state.memberProgress.map((row)=>row.accountId===event.accountId?{
    ...row,
    rawPoints:row.rawPoints+credit.dailyCreditedPoints,
    completionPoints:row.completionPoints+credit.completionCreditedPoints,
    combatPoints:row.combatPoints+(event.profile.category==='combat'?credit.completionCreditedPoints:0),
    skillingPoints:row.skillingPoints+(event.profile.category==='skilling'?credit.completionCreditedPoints:0),
  }:row);
  if(!state.memberProgress.some((row)=>row.accountId===event.accountId))updatedRows.push({
    accountId:event.accountId,rawPoints:credit.dailyCreditedPoints,completionPoints:credit.completionCreditedPoints,
    combatPoints:event.profile.category==='combat'?credit.completionCreditedPoints:0,
    skillingPoints:event.profile.category==='skilling'?credit.completionCreditedPoints:0,
  });
  const evaluation=evaluateGuildProject(state.instance.definition,state.instance.balance,updatedRows);
  if(evaluation.complete){
    await repo.markCompleted(projectInstanceId,event.occurredAtMs,evaluation);
  }
  return {projectInstanceId,creditedPoints:credit.dailyCreditedPoints,completionCreditedPoints:credit.completionCreditedPoints,completed:evaluation.complete};
}

export async function claimGuildProjectCompletionReward(
  repo:GuildProjectRepository,
  input:{project:GuildProjectInstanceRecord;accountId:string;progress:GuildProjectMemberProgress|undefined;rewardKey:string;nowMs:number},
):Promise<'claimed'|'already_claimed'|'not_eligible'>{
  if(input.project.status!=='completed' || !input.project.completedAtMs)return 'not_eligible';
  if(await repo.hasRewardClaim(input.project.id,input.accountId,input.rewardKey))return 'already_claimed';
  const membership=await repo.loadMembershipSnapshot(input.project.id,input.accountId,input.project.completedAtMs);
  if(!membership || !memberEligibleForGuildProjectCompletionReward(input.project.balance,input.progress,membership))return 'not_eligible';
  await repo.recordRewardClaim(input.project.id,input.accountId,input.rewardKey);
  return 'claimed';
}

export function createWeeklyGuildProjectInstanceReference(input:{id:string;guildId:string;guildName?:string;definition:GuildProjectDefinition;activeMemberSnapshot:number;startsAtMs:number;endsAtMs:number}):GuildProjectInstanceRecord{
  return {
    id:input.id,guildId:input.guildId,guildNameSnapshot:input.guildName,definition:input.definition,
    balance:deriveGuildWeeklyProjectBalance(input.activeMemberSnapshot),status:'active',startsAtMs:input.startsAtMs,endsAtMs:input.endsAtMs,
    completionPoints:0,combatPoints:0,skillingPoints:0,
  };
}
