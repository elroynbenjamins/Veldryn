import { createHash } from 'node:crypto';
import { simulateCombat } from './engine';
import type { CombatantDefinition, CombatResult } from './types';
import { ASTERFALL_ENCOUNTERS } from './content/asterfall-encounters';

export interface ResolveExpeditionCombatInput {
  runId:string;
  nodeIndex:number;
  encounterId:string;
  serverSeed:string;
  players:CombatantDefinition[];
  maxDurationMs?:number;
}
export interface ExpeditionCombatCommitPayload {
  success:boolean;
  resultJson:{reason:string;durationMs:number;downs:string[];playerHp:Record<string,number>;enemyHp:Record<string,number>;damage:Record<string,number>;healing:Record<string,number>;interrupts:Record<string,number>;eventDigest:string;eventCount:number};
  debugEvents?:CombatResult['events'];
}

export function resolveExpeditionCombat(input:ResolveExpeditionCombatInput, includeDebugTrace=false):ExpeditionCombatCommitPayload {
  const factory=ASTERFALL_ENCOUNTERS[input.encounterId]; if(!factory) throw new Error(`unknown_encounter:${input.encounterId}`);
  const result=simulateCombat({seed:`${input.serverSeed}:${input.runId}:${input.nodeIndex}:${input.encounterId}`,players:input.players,enemies:factory(),maxDurationMs:input.maxDurationMs??180000});
  const eventDigest=createHash('sha256').update(JSON.stringify(result.events)).digest().toString('hex');
  const rec=(xs:CombatResult['players'],pick:(x:CombatResult['players'][number])=>number)=>Object.fromEntries(xs.map(x=>[x.definition.id,Number(pick(x).toFixed(2))]));
  return {success:result.victory,resultJson:{reason:result.reason,durationMs:result.durationMs,downs:result.players.filter(p=>p.downed).map(p=>p.definition.id),playerHp:rec(result.players,x=>x.hp),enemyHp:rec(result.enemies,x=>x.hp),damage:rec(result.players,x=>x.damageDone),healing:rec(result.players,x=>x.healingDone),interrupts:rec(result.players,x=>x.interrupts),eventDigest,eventCount:result.events.length},...(includeDebugTrace?{debugEvents:result.events}:{})};
}
