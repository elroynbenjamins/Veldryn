import { applyWorldBossDamage, canStartScoredBossAttempt, computeWorldBossImpact, type WorldBossCombatResult, type WorldBossDefinition, type WorldBossImpactResult, type WorldBossState } from './world-bosses';

export interface WorldBossInstanceSnapshot {
  instanceId:string;
  definition:WorldBossDefinition;
  state:WorldBossState;
  maxHp:number;
  remainingHp:number;
  startsAtMs:number;
  endsAtMs:number;
  defeatedAtMs?:number;
}

export interface WorldBossAttemptReservation {
  encounterId:string;
  instanceId:string;
  accountId:string;
  characterId:string;
  dateKey:string;
  echoOnly:boolean;
  phaseId:string;
  expiresAtMs:number;
}

export interface WorldBossAttemptSettlement {
  reservation:WorldBossAttemptReservation;
  combatResult:WorldBossCombatResult;
  impact:WorldBossImpactResult;
  appliedGlobalDamage:number;
  bossRemainingHp:number;
  bossDefeated:boolean;
  countsForPersonalProgress:boolean;
}

export interface WorldBossStore {
  getInstance(instanceId:string):Promise<WorldBossInstanceSnapshot>;
  countScoredAttempts(instanceId:string,accountId:string,dateKey:string):Promise<number>;
  getLifetimeAttemptCounts(instanceId:string,accountId:string):Promise<{validAttempts:number;echoAttempts:number}>;
  hasOpenAttempt(instanceId:string,accountId:string):Promise<boolean>;
  reserveAttempt(input:{instanceId:string;accountId:string;characterId:string;dateKey:string;echoOnly:boolean;phaseId:string;expiresAtMs:number;sourceRequestId:string;partyIdAtStart?:string;partyNameAtStart?:string;guildIdAtStart?:string;guildNameAtStart?:string}):Promise<WorldBossAttemptReservation>;
  loadAttempt(encounterId:string):Promise<WorldBossAttemptReservation>;
  applyDamageAtomically(input:{encounterId:string;instanceId:string;accountId:string;requestedDamage:number;impact:WorldBossImpactResult;echoOnly:boolean;combatResult:WorldBossCombatResult}):Promise<{appliedDamage:number;remainingHp:number;defeated:boolean;duplicate:boolean}>;
}

export interface WorldBossCombatAuthorizer {
  verifyEligibleCharacter(input:{accountId:string;characterId:string;definition:WorldBossDefinition}):Promise<void>;
}

export function utcDateKey(nowMs:number):string{return new Date(nowMs).toISOString().slice(0,10);}

function resolvePhaseId(instance:WorldBossInstanceSnapshot):string{
  const fraction=instance.maxHp<=0?0:Math.max(0,Math.min(1,instance.remainingHp/instance.maxHp));
  for(let i=instance.definition.phases.length-1;i>=0;i--){ const p=instance.definition.phases[i]; if(fraction<=p.startsAtHpFraction) return p.id; }
  return instance.definition.phases[0].id;
}

export async function startWorldBossAttempt(deps:{store:WorldBossStore;authorizer:WorldBossCombatAuthorizer},input:{instanceId:string;accountId:string;characterId:string;sourceRequestId:string;nowMs:number;partyIdAtStart?:string;partyNameAtStart?:string;guildIdAtStart?:string;guildNameAtStart?:string}):Promise<WorldBossAttemptReservation>{
  const instance=await deps.store.getInstance(input.instanceId);
  if(input.nowMs<instance.startsAtMs) throw new Error('world_boss_not_started');
  const dateKey=utcDateKey(input.nowMs);
  const attemptsToday=await deps.store.countScoredAttempts(instance.instanceId,input.accountId,dateKey);
  const lifetime=await deps.store.getLifetimeAttemptCounts(instance.instanceId,input.accountId);
  const availability=canStartScoredBossAttempt({state:instance.state,attemptsToday,validAttemptsTotal:lifetime.validAttempts,echoAttemptsTotal:lifetime.echoAttempts,definition:instance.definition,nowMs:input.nowMs,endsAtMs:instance.endsAtMs,defeatedAtMs:instance.defeatedAtMs});
  if(!availability.allowed) throw new Error(availability.reason??'world_boss_not_available');
  if(await deps.store.hasOpenAttempt(instance.instanceId,input.accountId)) throw new Error('world_boss_attempt_already_open');
  await deps.authorizer.verifyEligibleCharacter({accountId:input.accountId,characterId:input.characterId,definition:instance.definition});
  return deps.store.reserveAttempt({instanceId:instance.instanceId,accountId:input.accountId,characterId:input.characterId,dateKey,echoOnly:availability.echoOnly,phaseId:resolvePhaseId(instance),expiresAtMs:input.nowMs+(instance.definition.attemptDurationSeconds+120)*1000,sourceRequestId:input.sourceRequestId,partyIdAtStart:input.partyIdAtStart,partyNameAtStart:input.partyNameAtStart,guildIdAtStart:input.guildIdAtStart,guildNameAtStart:input.guildNameAtStart});
}

export async function settleWorldBossAttempt(deps:{store:WorldBossStore},input:{encounterId:string;accountId:string;combatResult:WorldBossCombatResult}):Promise<WorldBossAttemptSettlement>{
  const reservation=await deps.store.loadAttempt(input.encounterId);
  if(reservation.accountId!==input.accountId) throw new Error('world_boss_attempt_owner_mismatch');
  if(input.combatResult.encounterId!==reservation.encounterId||input.combatResult.accountId!==reservation.accountId||input.combatResult.characterId!==reservation.characterId) throw new Error('world_boss_combat_receipt_mismatch');
  const instance=await deps.store.getInstance(reservation.instanceId);
  const impact=computeWorldBossImpact(instance.definition,input.combatResult);
  const damage=reservation.echoOnly?0:impact.globalDamage;
  const applied=await deps.store.applyDamageAtomically({encounterId:reservation.encounterId,instanceId:reservation.instanceId,accountId:reservation.accountId,requestedDamage:damage,impact,echoOnly:reservation.echoOnly,combatResult:input.combatResult});
  return {reservation,combatResult:input.combatResult,impact,appliedGlobalDamage:applied.appliedDamage,bossRemainingHp:applied.remainingHp,bossDefeated:applied.defeated,countsForPersonalProgress:!reservation.echoOnly};
}

export function simulateAtomicWorldBossDamage(remainingHp:number,damage:number){return applyWorldBossDamage(remainingHp,damage);}
