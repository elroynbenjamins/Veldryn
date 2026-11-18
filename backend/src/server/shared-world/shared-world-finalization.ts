import { evaluateRegionalCrisis, type RegionalCrisisDefinition } from './regional-crises';
import { worldBossEchoWindowEndsAtMs, type WorldBossDefinition } from './world-bosses';
import { rankWorldBossCandidates, type WorldBossFinalRank, type WorldBossRankCandidate } from './world-boss-ranking';

/** In-flight scored attempts reserved before resolution may still settle for this long afterwards. */
export const WORLD_BOSS_IN_FLIGHT_GRACE_MS=10*60_000;

export interface CrisisFinalizationInput {nowMs:number;endsAtMs:number;securedAtMs?:number;definition:RegionalCrisisDefinition;creditedPoints:number;targetPoints:number;combatPoints?:number;skillingPoints?:number;}
/**
 * Mixed-focus crises must also meet their per-category share, so the final state uses the same evaluation
 * as live progress instead of a bare point comparison. A recorded securedAtMs is authoritative.
 */
export function crisisFinalState(input:CrisisFinalizationInput):'secured'|'failed'|null{
  if(input.securedAtMs!=null) return 'secured';
  const evaluation=evaluateRegionalCrisis(input.definition,{targetPoints:input.targetPoints,creditedPoints:input.creditedPoints,combatPoints:input.combatPoints??0,skillingPoints:input.skillingPoints??0});
  if(evaluation.secured) return 'secured';
  if(input.nowMs>=input.endsAtMs) return 'failed';
  return null;
}

export interface WorldBossFinalizationInput {nowMs:number;endsAtMs:number;defeatedAtMs?:number;inFlightScoredAttempts:number;inFlightEchoAttempts?:number;definition:WorldBossDefinition;rankCandidates:readonly WorldBossRankCandidate[];}
export interface WorldBossFinalizationResult {ready:boolean;reason?:string;finalRanks:WorldBossFinalRank[];}
/**
 * A defeated boss stays open for its post-defeat Echo window, so finalizing at the moment of defeat would
 * silently close Echo for late players. Finalization waits for the window and any in-flight attempts.
 */
export function finalizeWorldBossRanks(input:WorldBossFinalizationInput):WorldBossFinalizationResult{
  const resolutionAt=input.defeatedAtMs??input.endsAtMs;
  if(input.nowMs<resolutionAt) return {ready:false,reason:'boss_unresolved',finalRanks:[]};
  if(input.inFlightScoredAttempts>0&&input.nowMs<resolutionAt+WORLD_BOSS_IN_FLIGHT_GRACE_MS) return {ready:false,reason:'in_flight_attempts',finalRanks:[]};
  if(input.defeatedAtMs!=null){
    const echoEndsAt=worldBossEchoWindowEndsAtMs(input.definition,input.defeatedAtMs,input.endsAtMs);
    if(input.nowMs<echoEndsAt) return {ready:false,reason:'echo_window_open',finalRanks:[]};
    if((input.inFlightEchoAttempts??0)>0&&input.nowMs<echoEndsAt+WORLD_BOSS_IN_FLIGHT_GRACE_MS) return {ready:false,reason:'in_flight_attempts',finalRanks:[]};
  }
  return {ready:true,finalRanks:rankWorldBossCandidates(input.rankCandidates)};
}
