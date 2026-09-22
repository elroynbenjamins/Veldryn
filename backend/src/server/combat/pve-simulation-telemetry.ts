import type {CombatResult,TargetRule} from './types';

export interface PveSimulationPlayerMetric{
  id:string;
  classId?:string;
  role:'tank'|'damage'|'support'|'enemy';
  endHpPct:number;
  damage:number;
  healing:number;
  damageTaken:number;
  interrupts:number;
  downed:boolean;
}
export interface PveSimulationCastMetric{abilityId:string;started:number;completed:number;interrupted:number;}
export interface PveSimulationEnemyCastMetric{actorId:string;abilityId:string;interruptible:boolean;started:number;completed:number;interrupted:number;}
export interface PveSimulationPhaseMetric{phaseId:string;atMs:number;}
export interface PveSimulationTelemetry{
  schemaVersion:2;
  encounterId:string;
  reason:'victory'|'wipe'|'timeout';
  victory:boolean;
  durationMs:number;
  partyDowns:number;
  partySurvivors:number;
  partyEndHpPctAvg:number;
  firstPartyDownAtMs?:number;
  enemyEndHpPctAvg:number;
  encounterArchetypes:string[];
  encounterMechanics:string[];
  bossId?:string;
  bossEndHpPct?:number;
  bossCasts:PveSimulationCastMetric[];
  enemyCasts:PveSimulationEnemyCastMetric[];
  bossPhases:PveSimulationPhaseMetric[];
  incomingDamageByAbility:Record<string,number>;
  partyDamageByAbility:Record<string,number>;
  partyHealingByAbility:Record<string,number>;
  partyShieldingByAbility:Record<string,number>;
  enemyHealingByAbility:Record<string,number>;
  enemyShieldingByAbility:Record<string,number>;
  barrierAbsorbedByParty:number;
  statusApplicationsToParty:Record<string,number>;
  enemyStatusApplicationsToEnemies:Record<string,number>;
  bossFocusTargets:Record<string,number>;
  enemyFocusTargets:Record<string,number>;
  downsByAbility:Record<string,number>;
  players:PveSimulationPlayerMetric[];
}

const rounded=(value:number,digits=4)=>Number(value.toFixed(digits));
function add(record:Record<string,number>,key:string,value:number){
  if(!key)return;
  record[key]=rounded((record[key]??0)+value,2);
}
function directTarget(rule:TargetRule|undefined){
  return rule!==undefined&&!['all_enemies','all_allies','self'].includes(rule);
}

/**
 * Compact deterministic PvE output intended for balance batches and regression
 * comparisons. It intentionally excludes RNG state, raw combat events and
 * private stat blocks.
 */
export function buildPveSimulationTelemetry(result:CombatResult,encounterId:string):PveSimulationTelemetry{
  const playerIds=new Set(result.players.map(player=>player.definition.id));
  const enemyIds=new Set(result.enemies.map(enemy=>enemy.definition.id));
  const bosses=result.enemies.filter(enemy=>enemy.definition.boss),boss=bosses[0],bossIds=new Set(bosses.map(row=>row.definition.id));
  const enemyById=new Map(result.enemies.map(enemy=>[enemy.definition.id,enemy.definition]));
  const casts=new Map<string,PveSimulationCastMetric>(),enemyCasts=new Map<string,PveSimulationEnemyCastMetric>(),bossPhases:PveSimulationPhaseMetric[]=[];
  const incomingDamageByAbility:Record<string,number>={},partyDamageByAbility:Record<string,number>={},partyHealingByAbility:Record<string,number>={},partyShieldingByAbility:Record<string,number>={},enemyHealingByAbility:Record<string,number>={},enemyShieldingByAbility:Record<string,number>={},statusApplicationsToParty:Record<string,number>={},enemyStatusApplicationsToEnemies:Record<string,number>={},bossFocusTargets:Record<string,number>={},enemyFocusTargets:Record<string,number>={},downsByAbility:Record<string,number>={};
  let barrierAbsorbedByParty=0,partyDowns=0,firstPartyDownAtMs:number|undefined;

  const castRow=(abilityId:string)=>{
    const existing=casts.get(abilityId);
    if(existing)return existing;
    const created:PveSimulationCastMetric={abilityId,started:0,completed:0,interrupted:0};
    casts.set(abilityId,created);return created;
  };

  const enemyCastRow=(actorId:string,abilityId:string)=>{
    const key=`${actorId}:${abilityId}`,existing=enemyCasts.get(key);
    if(existing)return existing;
    const definition=enemyById.get(actorId),ability=definition?.abilities.find(item=>item.id===abilityId);
    const created:PveSimulationEnemyCastMetric={actorId,abilityId,interruptible:Boolean(ability?.interruptible),started:0,completed:0,interrupted:0};
    enemyCasts.set(key,created);return created;
  };

  for(const event of result.events){
    if(event.type==='phase'&&event.actorId&&bossIds.has(event.actorId)&&event.abilityId)bossPhases.push({phaseId:event.abilityId,atMs:event.atMs});
    if(event.type==='cast_start'&&event.actorId&&enemyIds.has(event.actorId)&&event.abilityId){
      const definition=enemyById.get(event.actorId),ability=definition?.abilities.find(item=>item.id===event.abilityId);
      enemyCastRow(event.actorId,event.abilityId).started++;
      if(event.targetId&&playerIds.has(event.targetId)&&directTarget(ability?.target)){
        add(enemyFocusTargets,event.targetId,1);
        if(bossIds.has(event.actorId))add(bossFocusTargets,event.targetId,1);
      }
      if(bossIds.has(event.actorId))castRow(event.abilityId).started++;
    }
    if(event.type==='cast_complete'&&event.actorId&&enemyIds.has(event.actorId)&&event.abilityId){
      enemyCastRow(event.actorId,event.abilityId).completed++;
      if(bossIds.has(event.actorId))castRow(event.abilityId).completed++;
    }
    if(event.type==='interrupt'&&event.targetId&&enemyIds.has(event.targetId)&&event.interruptedAbilityId){
      enemyCastRow(event.targetId,event.interruptedAbilityId).interrupted++;
      if(bossIds.has(event.targetId))castRow(event.interruptedAbilityId).interrupted++;
    }

    if((event.type==='damage'||event.type==='dot_tick')&&event.actorId&&enemyIds.has(event.actorId)&&event.targetId&&playerIds.has(event.targetId)){
      add(incomingDamageByAbility,event.abilityId??'UNKNOWN',Math.max(0,event.amount??0));
      barrierAbsorbedByParty+=Math.max(0,event.absorbed??0);
    }
    if((event.type==='damage'||event.type==='dot_tick')&&event.actorId&&playerIds.has(event.actorId)&&event.targetId&&enemyIds.has(event.targetId))add(partyDamageByAbility,event.abilityId??'UNKNOWN',Math.max(0,event.amount??0));
    if((event.type==='heal'||event.type==='hot_tick')&&event.actorId&&playerIds.has(event.actorId)&&event.targetId&&playerIds.has(event.targetId))add(partyHealingByAbility,event.abilityId??'UNKNOWN',Math.max(0,event.amount??0));
    if(event.type==='shield'&&event.actorId&&playerIds.has(event.actorId)&&event.targetId&&playerIds.has(event.targetId))add(partyShieldingByAbility,event.abilityId??'UNKNOWN',Math.max(0,event.amount??0));
    if((event.type==='heal'||event.type==='hot_tick')&&event.actorId&&enemyIds.has(event.actorId)&&event.targetId&&enemyIds.has(event.targetId))add(enemyHealingByAbility,event.abilityId??'UNKNOWN',Math.max(0,event.amount??0));
    if(event.type==='shield'&&event.actorId&&enemyIds.has(event.actorId)&&event.targetId&&enemyIds.has(event.targetId))add(enemyShieldingByAbility,event.abilityId??'UNKNOWN',Math.max(0,event.amount??0));
    if(event.type==='status_apply'&&event.actorId&&enemyIds.has(event.actorId)&&event.targetId&&playerIds.has(event.targetId)){
      const key=`${event.statusKind??'status'}:${event.statusTag??event.abilityId??'unknown'}`;
      add(statusApplicationsToParty,key,1);
    }
    if(event.type==='status_apply'&&event.actorId&&enemyIds.has(event.actorId)&&event.targetId&&enemyIds.has(event.targetId)){
      const key=`${event.statusKind??'status'}:${event.statusTag??event.abilityId??'unknown'}`;
      add(enemyStatusApplicationsToEnemies,key,1);
    }
    if(event.type==='down'&&event.targetId&&playerIds.has(event.targetId)){
      partyDowns++;
      if(firstPartyDownAtMs===undefined)firstPartyDownAtMs=event.atMs;
      add(downsByAbility,event.abilityId??'UNKNOWN',1);
    }
  }

  const players:PveSimulationPlayerMetric[]=result.players.map(player=>({
    id:player.definition.id,
    ...(player.definition.classId?{classId:player.definition.classId}:{}),
    role:player.definition.role,
    endHpPct:rounded(player.hp/Math.max(1,player.definition.stats.maxHp)),
    damage:rounded(player.damageDone,2),
    healing:rounded(player.healingDone,2),
    damageTaken:rounded(player.damageTaken,2),
    interrupts:player.interrupts,
    downed:player.downed,
  }));
  const avg=players.length?players.reduce((sum,row)=>sum+row.endHpPct,0)/players.length:0;
  const enemyHpAvg=result.enemies.length?result.enemies.reduce((sum,row)=>sum+row.hp/Math.max(1,row.definition.stats.maxHp),0)/result.enemies.length:0;
  const encounterArchetypes=[...new Set(result.enemies.flatMap(enemy=>(enemy.definition.tags??[]).filter(tag=>tag.startsWith('pve:archetype:')).map(tag=>tag.slice('pve:archetype:'.length))))].sort();
  const encounterMechanics=[...new Set(result.enemies.flatMap(enemy=>(enemy.definition.tags??[]).filter(tag=>tag.startsWith('pve:mechanic:')).map(tag=>tag.slice('pve:mechanic:'.length))))].sort();
  const sortedRecord=(record:Record<string,number>)=>Object.fromEntries(Object.entries(record).sort(([a],[b])=>a.localeCompare(b)));

  return{
    schemaVersion:2,
    encounterId,
    reason:result.reason,
    victory:result.victory,
    durationMs:result.durationMs,
    partyDowns,
    partySurvivors:result.players.filter(player=>player.alive).length,
    partyEndHpPctAvg:rounded(avg),
    ...(firstPartyDownAtMs!==undefined?{firstPartyDownAtMs}:{}),
    enemyEndHpPctAvg:rounded(enemyHpAvg),
    encounterArchetypes,
    encounterMechanics,
    ...(boss?{bossId:boss.definition.id,bossEndHpPct:rounded(boss.hp/Math.max(1,boss.definition.stats.maxHp))}:{}),
    bossCasts:[...casts.values()].sort((a,b)=>a.abilityId.localeCompare(b.abilityId)),
    enemyCasts:[...enemyCasts.values()].sort((a,b)=>a.actorId.localeCompare(b.actorId)||a.abilityId.localeCompare(b.abilityId)),
    bossPhases:bossPhases.sort((a,b)=>a.atMs-b.atMs||a.phaseId.localeCompare(b.phaseId)),
    incomingDamageByAbility:sortedRecord(incomingDamageByAbility),
    partyDamageByAbility:sortedRecord(partyDamageByAbility),
    partyHealingByAbility:sortedRecord(partyHealingByAbility),
    partyShieldingByAbility:sortedRecord(partyShieldingByAbility),
    enemyHealingByAbility:sortedRecord(enemyHealingByAbility),
    enemyShieldingByAbility:sortedRecord(enemyShieldingByAbility),
    barrierAbsorbedByParty:rounded(barrierAbsorbedByParty,2),
    statusApplicationsToParty:sortedRecord(statusApplicationsToParty),
    enemyStatusApplicationsToEnemies:sortedRecord(enemyStatusApplicationsToEnemies),
    bossFocusTargets:sortedRecord(bossFocusTargets),
    enemyFocusTargets:sortedRecord(enemyFocusTargets),
    downsByAbility:sortedRecord(downsByAbility),
    players,
  };
}
