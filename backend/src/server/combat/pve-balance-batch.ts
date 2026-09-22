import {buildExpeditionEncounter,type BuildExpeditionEncounterInput} from './expedition-combat-service';
import {simulateCombat} from './engine';
import {buildPveSimulationTelemetry,type PveSimulationTelemetry} from './pve-simulation-telemetry';
import type {CombatantDefinition} from './types';

export interface PveBalanceNumericSummary{
  min:number;
  p10:number;
  p50:number;
  p90:number;
  max:number;
  mean:number;
}
export interface PveBalanceAbilityMetric{total:number;meanPerRun:number;}
export interface PveBalanceEnemyCastAggregate{
  actorId:string;
  abilityId:string;
  interruptible:boolean;
  started:number;
  completed:number;
  interrupted:number;
  completionRate:number;
  interruptionRate:number;
}
export interface PveBalancePlayerAggregate{
  id:string;
  classId?:string;
  role:string;
  runs:number;
  downRate:number;
  endHpPct:PveBalanceNumericSummary;
  damage:PveBalanceNumericSummary;
  healing:PveBalanceNumericSummary;
  damageTaken:PveBalanceNumericSummary;
  interrupts:PveBalanceNumericSummary;
}
export interface PveBalanceBatchInput extends BuildExpeditionEncounterInput{
  players:CombatantDefinition[];
  iterations:number;
  seedPrefix?:string;
  maxDurationMs?:number;
}
export interface PveBalanceBatchReport{
  schemaVersion:1;
  telemetrySchemaVersion:2;
  encounterId:string;
  iterations:number;
  seedPrefix:string;
  party:Array<{id:string;classId?:string;role:string;level:number}>;
  resultCounts:{victory:number;wipe:number;timeout:number};
  winRate:number;
  durationMs:PveBalanceNumericSummary;
  victoryDurationMs?:PveBalanceNumericSummary;
  partyDowns:PveBalanceNumericSummary;
  partyEndHpPctAvg:PveBalanceNumericSummary;
  firstPartyDownRate:number;
  firstPartyDownAtMs?:PveBalanceNumericSummary;
  enemyEndHpPctAvg:PveBalanceNumericSummary;
  encounterArchetypes:string[];
  encounterMechanics:string[];
  bossPhaseReachRate:Record<string,number>;
  enemyCasts:PveBalanceEnemyCastAggregate[];
  abilities:{
    incomingDamage:Record<string,PveBalanceAbilityMetric>;
    partyDamage:Record<string,PveBalanceAbilityMetric>;
    partyHealing:Record<string,PveBalanceAbilityMetric>;
    partyShielding:Record<string,PveBalanceAbilityMetric>;
    enemyHealing:Record<string,PveBalanceAbilityMetric>;
    enemyShielding:Record<string,PveBalanceAbilityMetric>;
    downs:Record<string,PveBalanceAbilityMetric>;
  };
  statuses:{
    appliedToParty:Record<string,PveBalanceAbilityMetric>;
    appliedToEnemies:Record<string,PveBalanceAbilityMetric>;
  };
  focusTargets:{
    allEnemies:Record<string,PveBalanceAbilityMetric>;
    bossOnly:Record<string,PveBalanceAbilityMetric>;
  };
  players:PveBalancePlayerAggregate[];
}

const rounded=(value:number,digits=4)=>Number(value.toFixed(digits));
function numericSummary(values:number[]):PveBalanceNumericSummary{
  if(!values.length)return{min:0,p10:0,p50:0,p90:0,max:0,mean:0};
  const sorted=[...values].sort((a,b)=>a-b),at=(p:number)=>sorted[Math.max(0,Math.min(sorted.length-1,Math.round((sorted.length-1)*p)))];
  return{min:rounded(sorted[0]),p10:rounded(at(.10)),p50:rounded(at(.50)),p90:rounded(at(.90)),max:rounded(sorted[sorted.length-1]),mean:rounded(values.reduce((sum,value)=>sum+value,0)/values.length)};
}
function addRecord(target:Record<string,number>,source:Record<string,number>){
  for(const [key,value] of Object.entries(source))target[key]=(target[key]??0)+value;
}
function abilityMetrics(record:Record<string,number>,iterations:number):Record<string,PveBalanceAbilityMetric>{
  return Object.fromEntries(Object.entries(record).sort(([a],[b])=>a.localeCompare(b)).map(([key,total])=>[key,{total:rounded(total,2),meanPerRun:rounded(total/iterations,2)}]));
}
function rate(value:number,total:number){return total>0?rounded(value/total):0;}

export function runPveBalanceBatch(input:PveBalanceBatchInput):PveBalanceBatchReport{
  if(!Number.isInteger(input.iterations)||input.iterations<1||input.iterations>100_000)throw new Error('invalid_balance_iterations');
  if(!input.players.length)throw new Error('balance_party_required');
  const seedPrefix=input.seedPrefix?.trim()||'VELDRYN_PVE_BATCH_V1',telemetry:PveSimulationTelemetry[]=[];
  for(let index=0;index<input.iterations;index++){
    const enemies=buildExpeditionEncounter(input);
    const result=simulateCombat({
      seed:`${seedPrefix}:${input.encounterId}:${index}`,
      players:structuredClone(input.players),
      enemies,
      maxDurationMs:input.maxDurationMs??180_000,
    });
    telemetry.push(buildPveSimulationTelemetry(result,input.encounterId));
  }

  const counts={victory:0,wipe:0,timeout:0},duration:number[]=[],victoryDuration:number[]=[],partyDowns:number[]=[],partyHp:number[]=[],firstDown:number[]=[],enemyHp:number[]=[];
  const archetypes=new Set<string>(),mechanics=new Set<string>(),phaseCounts:Record<string,number>={};
  const incoming:Record<string,number>={},partyDamage:Record<string,number>={},partyHealing:Record<string,number>={},partyShielding:Record<string,number>={},enemyHealing:Record<string,number>={},enemyShielding:Record<string,number>={},downs:Record<string,number>={},partyStatuses:Record<string,number>={},enemyStatuses:Record<string,number>={},enemyFocus:Record<string,number>={},bossFocus:Record<string,number>={};
  const casts=new Map<string,PveBalanceEnemyCastAggregate>();
  const playerRows=new Map<string,{id:string;classId?:string;role:string;endHp:number[];damage:number[];healing:number[];damageTaken:number[];interrupts:number[];downs:number}>();

  for(const row of telemetry){
    counts[row.reason]++;duration.push(row.durationMs);if(row.victory)victoryDuration.push(row.durationMs);partyDowns.push(row.partyDowns);partyHp.push(row.partyEndHpPctAvg);enemyHp.push(row.enemyEndHpPctAvg);if(row.firstPartyDownAtMs!==undefined)firstDown.push(row.firstPartyDownAtMs);
    row.encounterArchetypes.forEach(value=>archetypes.add(value));row.encounterMechanics.forEach(value=>mechanics.add(value));row.bossPhases.forEach(phase=>{phaseCounts[phase.phaseId]=(phaseCounts[phase.phaseId]??0)+1;});
    addRecord(incoming,row.incomingDamageByAbility);addRecord(partyDamage,row.partyDamageByAbility);addRecord(partyHealing,row.partyHealingByAbility);addRecord(partyShielding,row.partyShieldingByAbility);addRecord(enemyHealing,row.enemyHealingByAbility);addRecord(enemyShielding,row.enemyShieldingByAbility);addRecord(downs,row.downsByAbility);addRecord(partyStatuses,row.statusApplicationsToParty);addRecord(enemyStatuses,row.enemyStatusApplicationsToEnemies);addRecord(enemyFocus,row.enemyFocusTargets);addRecord(bossFocus,row.bossFocusTargets);
    for(const cast of row.enemyCasts){
      const key=`${cast.actorId}:${cast.abilityId}`,existing=casts.get(key);
      if(existing){existing.started+=cast.started;existing.completed+=cast.completed;existing.interrupted+=cast.interrupted;continue;}
      casts.set(key,{...cast,completionRate:0,interruptionRate:0});
    }
    for(const player of row.players){
      let aggregate=playerRows.get(player.id);
      if(!aggregate){aggregate={id:player.id,...(player.classId?{classId:player.classId}:{}),role:player.role,endHp:[],damage:[],healing:[],damageTaken:[],interrupts:[],downs:0};playerRows.set(player.id,aggregate);}
      aggregate.endHp.push(player.endHpPct);aggregate.damage.push(player.damage);aggregate.healing.push(player.healing);aggregate.damageTaken.push(player.damageTaken);aggregate.interrupts.push(player.interrupts);aggregate.downs+=player.downed?1:0;
    }
  }

  const enemyCasts=[...casts.values()].map(cast=>({...cast,completionRate:rate(cast.completed,cast.started),interruptionRate:rate(cast.interrupted,cast.started)})).sort((a,b)=>a.actorId.localeCompare(b.actorId)||a.abilityId.localeCompare(b.abilityId));
  const players=[...playerRows.values()].map(player=>({id:player.id,...(player.classId?{classId:player.classId}:{}),role:player.role,runs:player.endHp.length,downRate:rate(player.downs,player.endHp.length),endHpPct:numericSummary(player.endHp),damage:numericSummary(player.damage),healing:numericSummary(player.healing),damageTaken:numericSummary(player.damageTaken),interrupts:numericSummary(player.interrupts)})).sort((a,b)=>a.id.localeCompare(b.id));

  return{
    schemaVersion:1,
    telemetrySchemaVersion:2,
    encounterId:input.encounterId,
    iterations:input.iterations,
    seedPrefix,
    party:input.players.map(player=>({id:player.id,...(player.classId?{classId:player.classId}:{}),role:player.role,level:player.level})),
    resultCounts:counts,
    winRate:rate(counts.victory,input.iterations),
    durationMs:numericSummary(duration),
    ...(victoryDuration.length?{victoryDurationMs:numericSummary(victoryDuration)}:{}),
    partyDowns:numericSummary(partyDowns),
    partyEndHpPctAvg:numericSummary(partyHp),
    firstPartyDownRate:rate(firstDown.length,input.iterations),
    ...(firstDown.length?{firstPartyDownAtMs:numericSummary(firstDown)}:{}),
    enemyEndHpPctAvg:numericSummary(enemyHp),
    encounterArchetypes:[...archetypes].sort(),
    encounterMechanics:[...mechanics].sort(),
    bossPhaseReachRate:Object.fromEntries(Object.entries(phaseCounts).sort(([a],[b])=>a.localeCompare(b)).map(([key,count])=>[key,rate(count,input.iterations)])),
    enemyCasts,
    abilities:{incomingDamage:abilityMetrics(incoming,input.iterations),partyDamage:abilityMetrics(partyDamage,input.iterations),partyHealing:abilityMetrics(partyHealing,input.iterations),partyShielding:abilityMetrics(partyShielding,input.iterations),enemyHealing:abilityMetrics(enemyHealing,input.iterations),enemyShielding:abilityMetrics(enemyShielding,input.iterations),downs:abilityMetrics(downs,input.iterations)},
    statuses:{appliedToParty:abilityMetrics(partyStatuses,input.iterations),appliedToEnemies:abilityMetrics(enemyStatuses,input.iterations)},
    focusTargets:{allEnemies:abilityMetrics(enemyFocus,input.iterations),bossOnly:abilityMetrics(bossFocus,input.iterations)},
    players,
  };
}
