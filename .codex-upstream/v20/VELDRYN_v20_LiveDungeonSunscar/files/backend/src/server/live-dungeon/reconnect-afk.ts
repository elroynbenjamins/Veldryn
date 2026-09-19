import {LIVE_DUNGEON_POLICY, type LiveMemberPresence} from './live-dungeon-policy';

export function classifyPresence(input:{nowMs:number;lastHeartbeatMs:number;leftRun?:boolean}):LiveMemberPresence{
  if(input.leftRun) return 'dropped';
  const age=Math.max(0,(input.nowMs-input.lastHeartbeatMs)/1000);
  if(age<15) return 'connected';
  if(age<LIVE_DUNGEON_POLICY.disconnectGraceSeconds) return 'grace';
  if(age<LIVE_DUNGEON_POLICY.safetyAiUntilSeconds) return 'safety_ai';
  return 'dropped';
}

export function classifyAfk(input:{secondsSinceMeaningfulInput:number;inCombat:boolean}):'active'|'warning'|'safety_ai'{
  if(!input.inCombat) return 'active';
  const seconds=Math.max(0,input.secondsSinceMeaningfulInput);
  if(seconds<LIVE_DUNGEON_POLICY.afkWarningSeconds) return 'active';
  if(seconds<LIVE_DUNGEON_POLICY.afkSafetyAiSeconds) return 'warning';
  return 'safety_ai';
}

export function safetyAiRules(){return {
  canBasicAttack:true,
  canUseBasicDefensive:true,
  canSpendConsumables:false,
  canUseUltimate:false,
  canCastVote:false,
  outputMultiplier:0.70,
  note:'Safety AI only protects the other three players during a mobile disconnect. It is intentionally worse than active play and cannot create route votes or consume player items.'
} as const;}
