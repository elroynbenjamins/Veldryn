import type { RegionalCrisisDefinition } from './regional-crises';
import type { WorldBossDefinition } from './world-bosses';
import { rankWorldBossCandidates, type WorldBossFinalRank, type WorldBossRankCandidate } from './world-boss-ranking';

export interface CrisisFinalizationInput {nowMs:number;endsAtMs:number;securedAtMs?:number;definition:RegionalCrisisDefinition;creditedPoints:number;targetPoints:number;}
export function crisisFinalState(input:CrisisFinalizationInput):'secured'|'failed'|null{
  if(input.securedAtMs!=null||input.creditedPoints>=input.targetPoints) return 'secured';
  if(input.nowMs>=input.endsAtMs) return 'failed';
  return null;
}

export interface WorldBossFinalizationInput {nowMs:number;endsAtMs:number;defeatedAtMs?:number;inFlightScoredAttempts:number;definition:WorldBossDefinition;rankCandidates:readonly WorldBossRankCandidate[];}
export interface WorldBossFinalizationResult {ready:boolean;reason?:string;finalRanks:WorldBossFinalRank[];}
export function finalizeWorldBossRanks(input:WorldBossFinalizationInput):WorldBossFinalizationResult{
  const resolutionAt=input.defeatedAtMs??input.endsAtMs;
  const scoredGraceEnds=resolutionAt+10*60_000;
  if(input.nowMs<resolutionAt) return {ready:false,reason:'boss_unresolved',finalRanks:[]};
  if(input.inFlightScoredAttempts>0&&input.nowMs<scoredGraceEnds) return {ready:false,reason:'in_flight_attempts',finalRanks:[]};
  return {ready:true,finalRanks:rankWorldBossCandidates(input.rankCandidates)};
}
