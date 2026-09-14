import {LIVE_DUNGEON_POLICY} from './live-dungeon-policy';
export type ReadyResponse='pending'|'ready'|'declined'|'timed_out';
export interface ReadyMember {accountId:string;response:ReadyResponse;respondedAtMs?:number;}
export interface ReadyResolution {state:'waiting'|'launch'|'replace'|'cancel';notReadyAccountIds:string[];readyAccountIds:string[];}

export function resolveReadyCheck(input:{members:readonly ReadyMember[];nowMs:number;deadlineMs:number;replacementCycle:number}):ReadyResolution{
  const ready=input.members.filter(x=>x.response==='ready').map(x=>x.accountId);
  const declined=input.members.filter(x=>x.response==='declined').map(x=>x.accountId);
  const expired=input.nowMs>=input.deadlineMs;
  if(!expired&&!declined.length&&ready.length<input.members.length) return {state:'waiting',notReadyAccountIds:[],readyAccountIds:ready};
  const notReady=input.members.filter(x=>x.response!=='ready').map(x=>x.accountId);
  if(!notReady.length) return {state:'launch',notReadyAccountIds:[],readyAccountIds:ready};
  if(input.replacementCycle>=LIVE_DUNGEON_POLICY.maxReadyReplacementCycles) return {state:'cancel',notReadyAccountIds:notReady,readyAccountIds:ready};
  return {state:'replace',notReadyAccountIds:notReady,readyAccountIds:ready};
}

export function readyDeadline(startedAtMs:number):number{return startedAtMs+LIVE_DUNGEON_POLICY.readyCheckSeconds*1000;}
