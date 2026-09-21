import { createHash } from 'node:crypto';
import { persistentPlayerState, simulateCombat } from './engine';
import type { CombatantDefinition, CombatResult, EncounterBossTuning, PersistentActorState } from './types';
import { EXPEDITION_ENCOUNTERS } from './content/expedition-encounters';

export interface ResolveExpeditionCombatInput {
  runId:string;
  nodeIndex:number;
  encounterId:string;
  serverSeed:string;
  players:CombatantDefinition[];
  maxDurationMs?:number;
  initialPlayerState?:Record<string,PersistentActorState>;
  enemyAttackMultiplier?:number;
  enemyHpMultiplier?:number;
  enemyDefenseMultiplier?:number;
  bossTuning?:EncounterBossTuning;
}
export interface ExpeditionCombatCommitPayload {
  success:boolean;
  resultJson:{reason:string;durationMs:number;downs:string[];playerHp:Record<string,number>;enemyHp:Record<string,number>;damage:Record<string,number>;healing:Record<string,number>;interrupts:Record<string,number>;eventDigest:string;eventCount:number};
  debugEvents?:CombatResult['events'];
  endingPlayerState:Record<string,PersistentActorState>;
}

export function resolveExpeditionCombat(input:ResolveExpeditionCombatInput, includeDebugTrace=false):ExpeditionCombatCommitPayload {
  const factory=EXPEDITION_ENCOUNTERS[input.encounterId]; if(!factory) throw new Error(`unknown_encounter:${input.encounterId}`);
  const tuning=input.bossTuning,removed=new Set(tuning?.removeAbilityIds??[]);
  const enemies=factory().map(enemy=>{
    const base={...enemy,stats:{...enemy.stats,maxHp:enemy.stats.maxHp*(input.enemyHpMultiplier??1),attackPower:enemy.stats.attackPower*(input.enemyAttackMultiplier??1),defense:enemy.stats.defense*(input.enemyDefenseMultiplier??1)}};
    if(!base.boss||!tuning)return base;
    const abilities=base.abilities.filter(ability=>!removed.has(ability.id)).map(ability=>{
      const damageMultiplier=tuning.abilityDamageMultipliers?.[ability.id]??1,cooldownMultiplier=tuning.abilityCooldownMultipliers?.[ability.id]??1;
      return {...ability,cooldownMs:Math.max(500,Math.round(ability.cooldownMs*cooldownMultiplier)),effects:ability.effects.map(effect=>(effect.kind==='damage'||effect.kind==='dot')&&effect.coeff!==undefined?{...effect,coeff:effect.coeff*damageMultiplier}:effect)};
    });
    for(const added of tuning.addAbilities??[])if(!abilities.some(ability=>ability.id===added.id))abilities.push(structuredClone(added));
    const phases=[...(base.phases??[])];for(const added of tuning.addPhases??[])if(!phases.some(phase=>phase.id===added.id))phases.push(structuredClone(added));
    return {...base,abilities,phases};
  });
  const result=simulateCombat({seed:`${input.serverSeed}:${input.runId}:${input.nodeIndex}:${input.encounterId}`,players:input.players,enemies,initialPlayerState:input.initialPlayerState,maxDurationMs:input.maxDurationMs??180000});
  const eventDigest=createHash('sha256').update(JSON.stringify(result.events)).digest().toString('hex');
  const rec=(xs:CombatResult['players'],pick:(x:CombatResult['players'][number])=>number)=>Object.fromEntries(xs.map(x=>[x.definition.id,Number(pick(x).toFixed(2))]));
  return {success:result.victory,resultJson:{reason:result.reason,durationMs:result.durationMs,downs:result.players.filter(p=>p.downed).map(p=>p.definition.id),playerHp:rec(result.players,x=>x.hp),enemyHp:rec(result.enemies,x=>x.hp),damage:rec(result.players,x=>x.damageDone),healing:rec(result.players,x=>x.healingDone),interrupts:rec(result.players,x=>x.interrupts),eventDigest,eventCount:result.events.length},endingPlayerState:persistentPlayerState(result),...(includeDebugTrace?{debugEvents:result.events}:{})};
}
