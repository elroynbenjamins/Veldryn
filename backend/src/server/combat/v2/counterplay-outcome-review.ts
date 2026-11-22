/**
 * Hidden, non-release Combat 2.0 outcome audit.
 *
 * Compares actual deterministic combat output from two server-compiled,
 * exact-copy equipment pipelines. Skill IDs, cast event labels and order
 * are not balance metrics: changing a variant identifier alone MUST NOT
 * count as an improvement. Final authoritative Combat Power is not approved;
 * this report does not assign CP, claim equal CP, or approve a live rollout.
 */
import type {CombatResult,CombatStats} from '../types';
import type {UnifiedEquipmentEncounterResultV2} from './unified-equipment-encounter';

export interface CounterplayOutcomeMetricsV2 {
  readonly victory:boolean;
  readonly surviving:boolean;
  readonly playerHp:number;
  readonly playerShield:number;
  readonly playerDamageDone:number;
  readonly playerDamageTaken:number;
  readonly playerHealingDone:number;
  readonly playerInterrupts:number;
  readonly bossHp:number;
  readonly bossDamageDone:number;
  readonly debuffsCleansed:number;
  readonly dotsCleansed:number;
  readonly bossCastsInterrupted:number;
}
export interface EquipmentMatchedCounterplayReportV2{
  /** QA/report-only, not a production CP rating. */
  readonly scope:'EQUIPMENT_MATCHED_SYNTHETIC_NOT_EQUAL_CP';
  readonly bossId:string;
  readonly actorId:string;
  readonly seed:string;
  readonly metricsGeneric:CounterplayOutcomeMetricsV2;
  readonly metricsTactical:CounterplayOutcomeMetricsV2;
  readonly changedActualOutcomes:boolean;
  readonly deltaPlayerHp:number;
  readonly deltaBossHp:number;
  readonly deltaDamageDone:number;
  readonly deltaDamageTaken:number;
  readonly deltaHealingDone:number;
  readonly deltaInterrupts:number;
  readonly deltaDebuffsCleansed:number;
  readonly deltaDotsCleansed:number;
}
const same=(left:unknown,right:unknown)=>JSON.stringify(left)===JSON.stringify(right);
const ensure=(condition:unknown,reason:string):void=>{
 if(!condition)throw Error('combat_v2_counterplay_report_'+reason);
};
const finite=(value:number,name:string):number=>{
 ensure(Number.isFinite(value),name+'_nonfinite');return Math.round(value*1e4)/1e4;
};
function snapshot(result:CombatResult,actorId:string,bossId:string):CounterplayOutcomeMetricsV2 {
 const actor=result.players.find(p=>p.definition.id===actorId);
 const boss=result.enemies.find(e=>e.definition.id===bossId);
 ensure(actor&&boss,'participant_missing');
 const events=result.events;
 return {
  victory:result.victory,
  surviving:actor!.alive,
  playerHp:finite(actor!.hp,'hp'),
  playerShield:finite(actor!.shield,'shield'),
  playerDamageDone:finite(actor!.damageDone,'player_damage'),
  playerDamageTaken:finite(actor!.damageTaken,'player_taken'),
  playerHealingDone:finite(actor!.healingDone,'player_healing'),
  playerInterrupts:finite(actor!.interrupts,'interrupts'),
  bossHp:finite(boss!.hp,'boss_hp'),
  bossDamageDone:finite(boss!.damageDone,'boss_damage'),
  debuffsCleansed:events.filter(e=>e.type==='status_remove'&&e.actorId===actorId&&
    e.statusKind==='debuff').length,
  dotsCleansed:events.filter(e=>e.type==='status_remove'&&e.actorId===actorId&&
    e.statusKind==='dot').length,
  bossCastsInterrupted:events.filter(e=>e.type==='interrupt'&&e.actorId===actorId&&
    e.targetId===bossId).length,
 };
}
/**
 * Accepts already compiled, source-matched solo outcomes ONLY.
 * The receipt digest is from the private exact-copy verification port, never
 * a public client payload. This checks equality, not authentic database reads.
 */
export function reviewEquipmentMatchedCounterplayV2(input:{
 readonly baseline:UnifiedEquipmentEncounterResultV2;
 readonly tactic:UnifiedEquipmentEncounterResultV2;
 readonly baselineEquipmentReceiptDigest:string;
 readonly tacticalEquipmentReceiptDigest:string;
 readonly seed:string;
 readonly bossId:string;
 readonly actorId:string;
}):EquipmentMatchedCounterplayReportV2{
 const {baseline,tactic,seed,bossId,actorId}=input;
 ensure(typeof seed==='string'&&seed.length>3&&
  typeof actorId==='string'&&actorId.length>0&&
  typeof bossId==='string'&&bossId.length>0,'scope_invalid');
 ensure(/^[0-9a-f]{64}$/.test(input.baselineEquipmentReceiptDigest)&&
  input.baselineEquipmentReceiptDigest===input.tacticalEquipmentReceiptDigest,
  'equipment_copy_digest_mismatch');
 ensure(baseline.combat.players.length===1&&tactic.combat.players.length===1&&
  baseline.combat.enemies.length===1&&tactic.combat.enemies.length===1,
  'solo_only');
 const a=baseline.combat.players[0],b=tactic.combat.players[0],
  enemyA=baseline.combat.enemies[0],enemyB=tactic.combat.enemies[0];
 ensure(a.definition.id===actorId&&b.definition.id===actorId&&
  enemyA.definition.id===bossId&&enemyB.definition.id===bossId,
  'actor_or_boss_changed');
 ensure(a.definition.combatV2?.version===2&&b.definition.combatV2?.version===2,
  'skills_v2_required');
 ensure(a.definition.classId===b.definition.classId&&
  a.definition.role===b.definition.role&&
  a.definition.level===b.definition.level&&
  a.definition.combatV2?.resource===b.definition.combatV2?.resource&&
  a.definition.combatV2?.specializationId===b.definition.combatV2?.specializationId,
  'class_specialization_changed');
 const identicalStats=(x:CombatStats,y:CombatStats)=>same(x,y);
 ensure(identicalStats(a.definition.stats,b.definition.stats)&&
  identicalStats(enemyA.definition.stats,enemyB.definition.stats),
  'effective_stats_changed');
 ensure(same(enemyA.definition.abilities,enemyB.definition.abilities)&&
  same(enemyA.definition.phases,enemyB.definition.phases)&&
  same(baseline.enemyMechanicLabels,tactic.enemyMechanicLabels),
  'boss_mechanic_changed');
 ensure(baseline.equipmentEvidence.length===1&&tactic.equipmentEvidence.length===1&&
  same(baseline.equipmentEvidence,tactic.equipmentEvidence),
  'equipped_compiler_evidence_changed');
 const metricsGeneric=snapshot(baseline.combat,actorId,bossId);
 const metricsTactical=snapshot(tactic.combat,actorId,bossId);
 return {
  scope:'EQUIPMENT_MATCHED_SYNTHETIC_NOT_EQUAL_CP',seed,actorId,bossId,
  metricsGeneric,metricsTactical,
  changedActualOutcomes:!same(metricsGeneric,metricsTactical),
  deltaPlayerHp:finite(metricsTactical.playerHp-metricsGeneric.playerHp,'delta_hp'),
  deltaBossHp:finite(metricsTactical.bossHp-metricsGeneric.bossHp,'delta_boss_hp'),
  deltaDamageDone:finite(metricsTactical.playerDamageDone-metricsGeneric.playerDamageDone,'delta_damage'),
  deltaDamageTaken:finite(metricsTactical.playerDamageTaken-metricsGeneric.playerDamageTaken,'delta_taken'),
  deltaHealingDone:finite(metricsTactical.playerHealingDone-metricsGeneric.playerHealingDone,'delta_healing'),
  deltaInterrupts:metricsTactical.bossCastsInterrupted-metricsGeneric.bossCastsInterrupted,
  deltaDebuffsCleansed:metricsTactical.debuffsCleansed-metricsGeneric.debuffsCleansed,
  deltaDotsCleansed:metricsTactical.dotsCleansed-metricsGeneric.dotsCleansed,
 };
}
