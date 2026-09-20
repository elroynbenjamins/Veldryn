import {activeCompanionProvingGroundChallenges,rolloverCompanionProvingGroundState} from './proving-grounds';
import {companionTrialResetInfo,rolloverCompanionTrialSeason} from './trial-season';
import {rolloverCompanionAssignmentStatuses} from './assignments';
import {availableCompanionCodexMilestones,companionCodexDefinitions,companionCodexEntryV2,companionCodexSummary,sanitizeCompanionShowcase} from './codex';
import type {CompanionAssignment,CompanionCodexProfileState,CompanionProvingGroundState,CompanionTrialProgress,OwnedCompanionSnapshot} from './domain';

export interface CompanionTrialPublicProjection{
  seasonKey:string;title:string;serverNow:string;startsAt:string;endsAt:string;timezone:'UTC';remainingMs:number;notice:string;
  currentFloor:number;checkpointFloor:number;currentSeasonHighestFloor:number;lifetimeHighestFloor:number;activeRunId?:string;teamPower?:number;
}
export function projectCompanionTrial(progress:CompanionTrialProgress|undefined,serverNowMs:number,teamPower?:number):{progress:CompanionTrialProgress;projection:CompanionTrialPublicProjection;expiredRunId?:string}{
  const rolled=rolloverCompanionTrialSeason(progress,serverNowMs),info=companionTrialResetInfo(serverNowMs),season=rolled.progress.season;
  return {progress:rolled.progress,expiredRunId:rolled.expiredRunId,projection:{seasonKey:season.seasonKey,title:info.title,serverNow:info.serverNow,startsAt:info.startsAt,endsAt:info.endsAt,timezone:'UTC',remainingMs:info.remainingMs,notice:info.notice,currentFloor:season.currentFloor,checkpointFloor:season.checkpointFloor,currentSeasonHighestFloor:season.currentSeasonHighestFloor,lifetimeHighestFloor:rolled.progress.lifetime.lifetimeHighestFloor,activeRunId:season.activeRun?.runId,teamPower}};
}

export interface CompanionAssignmentPublicProjection{assignmentId:string;missionId:string;companionIds:string[];startedAt:string;endsAt:string;status:CompanionAssignment['status'];performanceGrade?:CompanionAssignment['performanceGrade'];}
export function projectCompanionAssignments(assignments:readonly CompanionAssignment[],serverNowMs:number):CompanionAssignmentPublicProjection[]{return rolloverCompanionAssignmentStatuses(assignments,serverNowMs).map(a=>({assignmentId:a.assignmentId,missionId:a.missionId,companionIds:[...a.companionIds],startedAt:a.startedAt,endsAt:a.endsAt,status:a.status,performanceGrade:a.performanceGrade}));}

export function projectCompanionProvingGrounds(state:CompanionProvingGroundState|undefined,serverNowMs:number){const rolled=rolloverCompanionProvingGroundState(state,serverNowMs),active=activeCompanionProvingGroundChallenges(serverNowMs);return {state:rolled.state,projection:{weekKey:rolled.state.weekKey,serverNow:new Date(serverNowMs).toISOString(),challengeIds:active.definitions.map(x=>x.id),progress:{...rolled.state.progress},completedIds:[...rolled.state.completedIds],claimedIds:[...rolled.state.claimedIds]}};}
export function projectCompanionCodex(owned:Record<string,OwnedCompanionSnapshot>,profile:CompanionCodexProfileState){const clean=sanitizeCompanionShowcase(profile,owned);return {profile:clean,summary:companionCodexSummary(owned),entries:companionCodexDefinitions().map(id=>companionCodexEntryV2(owned[id],id,clean)),milestones:availableCompanionCodexMilestones(owned,clean).map(x=>({id:x.definition.id,name:x.definition.name,description:x.definition.description,reward:{companionEssence:x.definition.reward.companionEssence??0,rewardIds:[...(x.definition.reward.rewardIds??[])],showcaseSlots:x.definition.reward.showcaseSlots},complete:x.complete,claimed:x.claimed})),favoriteCompanionId:clean.favoriteCompanionId,showcaseCompanionIds:[...clean.showcaseCompanionIds],showcaseSlotsUnlocked:clean.showcaseSlotsUnlocked??1};}
