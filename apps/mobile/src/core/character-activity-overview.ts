import {accountCharacters,projectCharacter} from './account-roster';
import {activityQueueCapacity,activityQueueHandoffStatus,activityQueueLabel,normalizeActivityQueue,queuedActivityReadiness} from './activity-queue';
import type {ActiveActivity,CharacterState,GameState} from './types';

export type CharacterQueueState='none'|'armed'|'waiting'|'ready'|'blocked'|'paused';

export interface CharacterActivityOverviewRow{
  character:CharacterState;
  current:boolean;
  activity:ActiveActivity|null;
  queueCount:number;
  queueCapacity:number;
  queueState:CharacterQueueState;
  queueStateLabel:string;
  nextLabel?:string;
  nextReady:boolean;
  nextBlocker?:string;
  pausedReason?:string;
  handoffSourceLabel?:string;
  safetyEnabled:boolean;
}

function queueStateLabel(state:CharacterQueueState){
  if(state==='armed')return 'AUTO HANDOFF';
  if(state==='waiting')return 'WAITING FOR STOP';
  if(state==='ready')return 'READY';
  if(state==='blocked')return 'BLOCKED';
  if(state==='paused')return 'PAUSED';
  return 'QUEUE EMPTY';
}

export function characterActivityOverview(state:GameState,characterId:string):CharacterActivityOverviewRow{
  const projected=projectCharacter(state,characterId),character=projected.character!;
  const capacity=activityQueueCapacity(projected),queue=normalizeActivityQueue(character.activityQueue,capacity),next=queue[0];
  const readiness=queuedActivityReadiness(projected,next),handoff=activityQueueHandoffStatus(projected),pausedReason=character.activityQueuePausedReason?.trim()||undefined;
  let queueState:CharacterQueueState='none';
  if(queue.length){
    if(pausedReason)queueState='paused';
    else if(projected.activity&&handoff.armed)queueState='armed';
    else if(projected.activity)queueState='waiting';
    else queueState=readiness.ready?'ready':'blocked';
  }
  return {
    character,
    current:character.id===state.character?.id,
    activity:projected.activity,
    queueCount:queue.length,
    queueCapacity:capacity,
    queueState,
    queueStateLabel:queueStateLabel(queueState),
    ...(next?{nextLabel:activityQueueLabel(next)}:{}),
    nextReady:readiness.ready,
    ...(readiness.blocker?{nextBlocker:readiness.blocker}:{}),
    ...(pausedReason?{pausedReason}:{}),
    ...(handoff.sourceLabel?{handoffSourceLabel:handoff.sourceLabel}:{}),
    safetyEnabled:handoff.safetyEnabled,
  };
}

export function accountActivityOverview(state:GameState){
  return accountCharacters(state)
    .map(entry=>characterActivityOverview(state,entry.character.id))
    .sort((a,b)=>Number(b.current)-Number(a.current)||Number(Boolean(b.activity))-Number(Boolean(a.activity))||Number(b.queueCount>0)-Number(a.queueCount>0));
}
