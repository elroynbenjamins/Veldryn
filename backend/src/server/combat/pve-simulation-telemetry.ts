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
export interface PveSimulationPhaseMetric{phaseId:string;atMs:number;}
export interface PveSimulationTelemetry{
  schemaVersion:1;
  encounterId:string;
  reason:'victory'|'wipe'|'timeout';
  victory:boolean;
  durationMs:number;
  partyDowns:number;
  partySurvivors:number;
  partyEndHpPctAvg:number;
  bossId?:string;
  bossEndHpPct?:number;
  bossCasts:PveSimulationCastMetric[];
  bossPhases:PveSimulationPhaseMetric[];
  incomingDamageByAbility:Record<string,number>;
  barrierAbsorbedByParty:number;
  statusApplicationsToParty:Record<string,number>;
  bossFocusTargets:Record<string,number>;
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
  const casts=new Map<string,PveSimulationCastMetric>(),bossPhases:PveSimulationPhaseMetric[]=[];
  const incomingDamageByAbility:Record<string,number>={},statusApplicationsToParty:Record<string,number>={},bossFocusTargets:Record<string,number>={},downsByAbility:Record<string,number>={};
  let barrierAbsorbedByParty=0,partyDowns=0;

  const castRow=(abilityId:string)=>{
    const existing=casts.get(abilityId);
    if(existing)return existing;
    const created:PveSimulationCastMetric={abilityId,started:0,completed:0,interrupted:0};
    casts.set(abilityId,created);return created;
  };

  for(const event of result.events){
    if(event.type==='phase'&&event.actorId&&bossIds.has(event.actorId)&&event.abilityId)bossPhases.push({phaseId:event.abilityId,atMs:event.atMs});
    if(event.type==='cast_start'&&event.actorId&&bossIds.has(event.actorId)&&event.abilityId){
      castRow(event.abilityId).started++;
      const definition=bosses.find(row=>row.definition.id===event.actorId)?.definition,ability=definition?.abilities.find(item=>item.id===event.abilityId);
      if(event.targetId&&playerIds.has(event.targetId)&&directTarget(ability?.target))add(bossFocusTargets,event.targetId,1);
    }
    if(event.type==='cast_complete'&&event.actorId&&bossIds.has(event.actorId)&&event.abilityId)castRow(event.abilityId).completed++;
    if(event.type==='interrupt'&&event.targetId&&bossIds.has(event.targetId)&&event.interruptedAbilityId)castRow(event.interruptedAbilityId).interrupted++;

    if((event.type==='damage'||event.type==='dot_tick')&&event.actorId&&enemyIds.has(event.actorId)&&event.targetId&&playerIds.has(event.targetId)){
      add(incomingDamageByAbility,event.abilityId??'UNKNOWN',Math.max(0,event.amount??0));
      barrierAbsorbedByParty+=Math.max(0,event.absorbed??0);
    }
    if(event.type==='status_apply'&&event.actorId&&enemyIds.has(event.actorId)&&event.targetId&&playerIds.has(event.targetId)){
      const key=`${event.statusKind??'status'}:${event.statusTag??event.abilityId??'unknown'}`;
      add(statusApplicationsToParty,key,1);
    }
    if(event.type==='down'&&event.targetId&&playerIds.has(event.targetId)){
      partyDowns++;
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

  return{
    schemaVersion:1,
    encounterId,
    reason:result.reason,
    victory:result.victory,
    durationMs:result.durationMs,
    partyDowns,
    partySurvivors:result.players.filter(player=>player.alive).length,
    partyEndHpPctAvg:rounded(avg),
    ...(boss?{bossId:boss.definition.id,bossEndHpPct:rounded(boss.hp/Math.max(1,boss.definition.stats.maxHp))}:{}),
    bossCasts:[...casts.values()].sort((a,b)=>a.abilityId.localeCompare(b.abilityId)),
    bossPhases:bossPhases.sort((a,b)=>a.atMs-b.atMs||a.phaseId.localeCompare(b.phaseId)),
    incomingDamageByAbility:Object.fromEntries(Object.entries(incomingDamageByAbility).sort(([a],[b])=>a.localeCompare(b))),
    barrierAbsorbedByParty:rounded(barrierAbsorbedByParty,2),
    statusApplicationsToParty:Object.fromEntries(Object.entries(statusApplicationsToParty).sort(([a],[b])=>a.localeCompare(b))),
    bossFocusTargets:Object.fromEntries(Object.entries(bossFocusTargets).sort(([a],[b])=>a.localeCompare(b))),
    downsByAbility:Object.fromEntries(Object.entries(downsByAbility).sort(([a],[b])=>a.localeCompare(b))),
    players,
  };
}
