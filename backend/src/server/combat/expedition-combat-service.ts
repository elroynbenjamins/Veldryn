import { createHash } from 'node:crypto';
import { persistentPlayerState, simulateCombat } from './engine';
import type { CombatantDefinition, CombatResult, EncounterBossTuning, PersistentActorState } from './types';
import { EXPEDITION_ENCOUNTERS } from './content/expedition-encounters';

export interface BuildExpeditionEncounterInput {
  encounterId:string;
  enemyAttackMultiplier?:number;
  enemyHpMultiplier?:number;
  enemyDefenseMultiplier?:number;
  bossTuning?:EncounterBossTuning;
}
export interface ResolveExpeditionCombatInput extends BuildExpeditionEncounterInput {
  runId:string;
  nodeIndex:number;
  serverSeed:string;
  players:CombatantDefinition[];
  maxDurationMs?:number;
  initialPlayerState?:Record<string,PersistentActorState>;
}
export type ExpeditionCombatReplayCueType='phase'|'cast'|'interrupt'|'down'|'assist'|'victory'|'wipe'|'timeout';
export interface ExpeditionCombatReplayCue{
  atMs:number;
  type:ExpeditionCombatReplayCueType;
  actorId?:string;
  actorName?:string;
  targetId?:string;
  targetName?:string;
  abilityId?:string;
  abilityName?:string;
  durationMs?:number;
}
export interface ExpeditionCombatCommitPayload {
  success:boolean;
  resultJson:{reason:string;durationMs:number;downs:string[];playerHp:Record<string,number>;enemyHp:Record<string,number>;damage:Record<string,number>;healing:Record<string,number>;interrupts:Record<string,number>;eventDigest:string;eventCount:number;bossPhaseIds:string[];bossCastAbilityIds:string[];replayCues:ExpeditionCombatReplayCue[]};
  debugEvents?:CombatResult['events'];
  endingPlayerState:Record<string,PersistentActorState>;
}

export function buildExpeditionEncounter(input:BuildExpeditionEncounterInput):CombatantDefinition[] {
  const factory=EXPEDITION_ENCOUNTERS[input.encounterId]; if(!factory) throw new Error(`unknown_encounter:${input.encounterId}`);
  const tuning=input.bossTuning,removed=new Set(tuning?.removeAbilityIds??[]);
  return factory().map(enemy=>{
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
}

function publicReplayCues(result:CombatResult):ExpeditionCombatReplayCue[]{
  const definitions=[...result.players,...result.enemies].map(state=>state.definition);
  const byId=new Map(definitions.map(definition=>[definition.id,definition]));
  const abilityNames=new Map<string,string>(),castDurations=new Map<string,number>(),companionAbilities=new Set<string>(),bossIds=new Set(result.enemies.filter(enemy=>enemy.definition.boss).map(enemy=>enemy.definition.id));
  for(const definition of definitions){
    for(const ability of definition.abilities){
      abilityNames.set(ability.id,ability.name);
      castDurations.set(ability.id,ability.castTimeMs);
      if(ability.tags?.includes('combat_companion')||ability.id.includes(':assist'))companionAbilities.add(ability.id);
    }
    for(const phase of definition.phases??[])abilityNames.set(phase.id,phase.name?.trim()||phase.id.replace(/_/g,' '));
  }
  const cues:ExpeditionCombatReplayCue[]=[],assistSeen=new Set<string>();
  const names=(id:string|undefined)=>id?byId.get(id)?.name:undefined;
  const push=(cue:ExpeditionCombatReplayCue)=>cues.push(cue);
  for(const event of result.events){
    if(event.type==='phase'&&event.actorId&&bossIds.has(event.actorId)){
      push({atMs:event.atMs,type:'phase',actorId:event.actorId,actorName:names(event.actorId),abilityId:event.abilityId,abilityName:event.abilityId?abilityNames.get(event.abilityId):undefined});
      continue;
    }
    if(event.type==='cast_start'&&event.actorId&&bossIds.has(event.actorId)){
      const duration=event.abilityId?castDurations.get(event.abilityId):undefined;
      push({atMs:event.atMs,type:'cast',actorId:event.actorId,actorName:names(event.actorId),targetId:event.targetId,targetName:names(event.targetId),abilityId:event.abilityId,abilityName:event.abilityId?abilityNames.get(event.abilityId):undefined,...(duration!==undefined?{durationMs:duration}:{})});
      continue;
    }
    if(event.actorId&&event.abilityId&&companionAbilities.has(event.abilityId)&&['damage','heal','shield','interrupt'].includes(event.type)){
      const key=`${event.atMs}:${event.actorId}:${event.abilityId}`;
      if(!assistSeen.has(key)){
        assistSeen.add(key);
        push({atMs:event.atMs,type:'assist',actorId:event.actorId,actorName:names(event.actorId),targetId:event.targetId,targetName:names(event.targetId),abilityId:event.abilityId,abilityName:abilityNames.get(event.abilityId)});
      }
      continue;
    }
    if(event.type==='interrupt'&&event.actorId){
      push({atMs:event.atMs,type:'interrupt',actorId:event.actorId,actorName:names(event.actorId),targetId:event.targetId,targetName:names(event.targetId),abilityId:event.abilityId,abilityName:event.abilityId?abilityNames.get(event.abilityId):undefined});
      continue;
    }
    if(event.type==='down'&&event.targetId&&result.players.some(player=>player.definition.id===event.targetId)){
      push({atMs:event.atMs,type:'down',actorId:event.actorId,actorName:names(event.actorId),targetId:event.targetId,targetName:names(event.targetId)});
      continue;
    }
    if(event.type==='combat_end'){
      push({atMs:event.atMs,type:result.reason});
    }
  }
  if(cues.length<=48)return cues;
  const terminal=cues[cues.length-1],source=cues.slice(0,-1),sampled:ExpeditionCombatReplayCue[]=[];
  for(let i=0;i<47;i++)sampled.push(source[Math.min(source.length-1,Math.floor(i*source.length/47))]);
  return [...sampled,terminal];
}

export function resolveExpeditionCombat(input:ResolveExpeditionCombatInput, includeDebugTrace=false):ExpeditionCombatCommitPayload {
  const enemies=buildExpeditionEncounter(input);
  const result=simulateCombat({seed:`${input.serverSeed}:${input.runId}:${input.nodeIndex}:${input.encounterId}`,players:input.players,enemies,initialPlayerState:input.initialPlayerState,maxDurationMs:input.maxDurationMs??180000});
  const eventDigest=createHash('sha256').update(JSON.stringify(result.events)).digest().toString('hex');
  const rec=(xs:CombatResult['players'],pick:(x:CombatResult['players'][number])=>number)=>Object.fromEntries(xs.map(x=>[x.definition.id,Number(pick(x).toFixed(2))]));
  const bossIds=new Set(result.enemies.filter(enemy=>enemy.definition.boss).map(enemy=>enemy.definition.id));
  const unique=(values:Array<string|undefined>)=>[...new Set(values.filter((value):value is string=>Boolean(value)))];
  const bossPhaseIds=unique(result.events.filter(event=>event.type==='phase'&&event.actorId&&bossIds.has(event.actorId)).map(event=>event.abilityId));
  const bossCastAbilityIds=unique(result.events.filter(event=>event.type==='cast_start'&&event.actorId&&bossIds.has(event.actorId)).map(event=>event.abilityId));
  return {success:result.victory,resultJson:{reason:result.reason,durationMs:result.durationMs,downs:result.players.filter(p=>p.downed).map(p=>p.definition.id),playerHp:rec(result.players,x=>x.hp),enemyHp:rec(result.enemies,x=>x.hp),damage:rec(result.players,x=>x.damageDone),healing:rec(result.players,x=>x.healingDone),interrupts:rec(result.players,x=>x.interrupts),eventDigest,eventCount:result.events.length,bossPhaseIds,bossCastAbilityIds,replayCues:publicReplayCues(result)},endingPlayerState:persistentPlayerState(result),...(includeDebugTrace?{debugEvents:result.events}:{})};
}
