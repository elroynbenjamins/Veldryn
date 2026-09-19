import type { SocialContributionEvent } from '../liveops/contribution';
import type { RegionalCrisisTargetSnapshot } from './shared-world-routing';
import { evaluateRegionalCrisis, scoreRegionalCrisisContribution, type RegionalCrisisDefinition, type RegionalCrisisProgress, type RegionalCrisisState } from './regional-crises';

export interface RegionalCrisisInstanceSnapshot {
  instanceId:string;
  definition:RegionalCrisisDefinition;
  state:RegionalCrisisState;
  startsAtMs:number;
  endsAtMs:number;
  targetPoints:number;
  creditedPoints:number;
  combatPoints:number;
  skillingPoints:number;
}

export interface RegionalCrisisStore {
  getInstance(instanceId:string):Promise<RegionalCrisisInstanceSnapshot>;
  getAccountDailyPoints(instanceId:string,accountId:string,dateKey:string):Promise<number>;
  recordContribution(input:{instanceId:string;sourceEventId:string;accountId:string;dateKey:string;occurredAtMs:number;rawPoints:number;creditedPoints:number;category:'combat'|'skilling';contentId:string;activityKind:string;partyIdAtSettlement?:string;partyNameAtSettlement?:string;guildIdAtSettlement?:string;guildNameAtSettlement?:string}):Promise<{duplicate:boolean;creditedPoints:number;progress:RegionalCrisisProgress}>;
}

export async function recordRegionalCrisisContribution(store:RegionalCrisisStore,instanceId:string,event:SocialContributionEvent,snapshot?:RegionalCrisisTargetSnapshot):Promise<{crisisInstanceId:string;creditedPoints:number;globalCreditedPoints:number;secured:boolean}>{
  const instance=await store.getInstance(instanceId);
  if(instance.state!=='active'&&instance.state!=='secured') return {crisisInstanceId:instanceId,creditedPoints:0,globalCreditedPoints:0,secured:false};
  if(event.occurredAtMs<instance.startsAtMs||event.occurredAtMs>=instance.endsAtMs) return {crisisInstanceId:instanceId,creditedPoints:0,globalCreditedPoints:0,secured:false};
  const today=await store.getAccountDailyPoints(instanceId,event.accountId,event.dateKey);
  const score=scoreRegionalCrisisContribution(event,instance.definition,today);
  if(!score.eligible||score.creditedPoints<=0) return {crisisInstanceId:instanceId,creditedPoints:0,globalCreditedPoints:0,secured:false};
  const recorded=await store.recordContribution({instanceId,sourceEventId:event.sourceEventId,accountId:event.accountId,dateKey:event.dateKey,occurredAtMs:event.occurredAtMs,rawPoints:score.rawPoints,creditedPoints:score.creditedPoints,category:score.category,contentId:event.contentId,activityKind:event.activityKind,partyIdAtSettlement:snapshot?.partyIdAtSettlement,partyNameAtSettlement:snapshot?.partyNameAtSettlement,guildIdAtSettlement:snapshot?.guildIdAtSettlement,guildNameAtSettlement:snapshot?.guildNameAtSettlement});
  const evaluation=evaluateRegionalCrisis(instance.definition,recorded.progress);
  return {crisisInstanceId:instanceId,creditedPoints:recorded.duplicate?0:recorded.creditedPoints,globalCreditedPoints:recorded.progress.creditedPoints,secured:evaluation.secured};
}
