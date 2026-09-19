import {LIVE_DUNGEON_POLICY,rewardEligibility,type LiveDungeonRole} from './live-dungeon-policy';
import {classifyAfk,classifyPresence} from './reconnect-afk';
export interface LiveDungeonMemberRuntime {accountId:string;characterId:string;role:LiveDungeonRole;lastHeartbeatMs:number;lastMeaningfulInputMs:number;safetyAiSeconds:number;combatParticipation:number;mechanicParticipation:number;routeVotesCast:number;wasReady:boolean;leftRun:boolean;}
export interface RuntimeEvaluation {accountId:string;presence:string;afk:string;rewardEligible:boolean;participationScore:number;}
export function evaluateRuntimeMembers(input:{nowMs:number;runDurationSeconds:number;completedRun:boolean;members:readonly LiveDungeonMemberRuntime[]}):RuntimeEvaluation[]{
 return input.members.map(m=>{
  const presence=classifyPresence({nowMs:input.nowMs,lastHeartbeatMs:m.lastHeartbeatMs,leftRun:m.leftRun});
  const afk=classifyAfk({secondsSinceMeaningfulInput:Math.max(0,(input.nowMs-m.lastMeaningfulInputMs)/1000),inCombat:true});
  const reward=rewardEligibility({wasReady:m.wasReady,combatParticipation:m.combatParticipation,mechanicParticipation:m.mechanicParticipation,routeVotesCast:m.routeVotesCast,safetyAiSeconds:m.safetyAiSeconds,runDurationSeconds:input.runDurationSeconds,leftRun:m.leftRun,completedRun:input.completedRun});
  return {accountId:m.accountId,presence,afk,rewardEligible:reward.eligible,participationScore:reward.participationScore};
 });
}
export function shouldExpireQueueTicket(input:{nowMs:number;queuedAtMs:number}):boolean{return input.nowMs-input.queuedAtMs>=LIVE_DUNGEON_POLICY.queueTicketTtlSeconds*1000;}
export function nextReadyReplacementCycle(current:number):number{return Math.min(LIVE_DUNGEON_POLICY.maxReadyReplacementCycles,current+1);}
