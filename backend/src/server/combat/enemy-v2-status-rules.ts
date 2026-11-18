import type {ActivePeriodicEffect,ActiveTimedModifier} from './types';

/**
 * Experimental Enemy 2.0 status policies shared with the Classes V2 engine.
 * Only a server-issued, snapshot-bound authority in the SECOND simulator
 * parameter enables these rules. CombatInput JSON never selects the ruleset.
 * Existing legacy/Q-mode statuses and shields remain unchanged.
 */
export const ENEMY_V2_MAX_DOT_STACKS_PER_SOURCE = 3;
export const ENEMY_V2_MAX_SHIELD_RATIO = .10;

export interface EnemyV2StatusApplication<T> {
  entries:T[];
  refreshed:boolean;
  activeStacks:number;
}

export function applyEnemyV2Periodic(
  existing:readonly ActivePeriodicEffect[], next:ActivePeriodicEffect,
):EnemyV2StatusApplication<ActivePeriodicEffect> {
  const cappedDot=next.kind==='dot'&&(next.tag==='bleed'||next.tag==='poison');
  const cappedHot=next.kind==='hot'&&next.tag==='regeneration';
  if(!cappedDot&&!cappedHot)
    return {entries:[...existing,next],refreshed:false,activeStacks:1};
  const matches=existing.map((entry,index)=>({entry,index}))
    .filter(({entry})=>entry.sourceId===next.sourceId&&entry.tag===next.tag&&entry.kind===next.kind);
  const cap=cappedHot?1:ENEMY_V2_MAX_DOT_STACKS_PER_SOURCE;
  if(matches.length<cap) return {
    entries:[...existing,next],refreshed:false,activeStacks:matches.length+1,
  };
  // Refresh earliest expiry; keep insertion position for deterministic replay.
  const oldest=matches.reduce((first,candidate)=>
    candidate.entry.expiresAt<first.entry.expiresAt||
    (candidate.entry.expiresAt===first.entry.expiresAt&&candidate.index<first.index)?candidate:first);
  const entries=[...existing];
  entries[oldest.index]=next;
  return {entries,refreshed:true,activeStacks:cap};
}

export function applyEnemyV2Modifier(
  existing:readonly ActiveTimedModifier[],next:ActiveTimedModifier,
):EnemyV2StatusApplication<ActiveTimedModifier> {
  // Reapplying a timed effect from the same source refreshes it rather than
  // granting infinite multiplicative buffs/debuffs. Different sources stack.
  const index=existing.findIndex(entry=>
    entry.sourceId===next.sourceId&&entry.tag===next.tag&&entry.kind===next.kind);
  if(index<0)return {entries:[...existing,next],refreshed:false,activeStacks:1};
  const entries=[...existing];
  entries[index]=next;
  return {entries,refreshed:true,activeStacks:1};
}

export function enemyV2AllowedShieldAmount(maxHp:number,currentShield:number,requested:number):number {
  if(!Number.isFinite(maxHp)||maxHp<=0||!Number.isFinite(currentShield)||!Number.isFinite(requested))return 0;
  const cap=Math.max(0,maxHp)*ENEMY_V2_MAX_SHIELD_RATIO;
  return Math.max(0,Math.min(requested,cap-Math.max(0,currentShield)));
}
