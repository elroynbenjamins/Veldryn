/**
 * Party Events V95 — HIDDEN nonpaying combat-result review envelope.
 *
 * For QA/reconciliation only. Not a V87 battle certificate, not an
 * independently persisted ownership check, and NEVER a grant/claim input.
 * The next version must independently replay and certify the frozen battle
 * before V69/V70 settlement can be considered.
 */
import type {CombatInput,CombatResult,CombatEvent} from '../combat/types';
import {enemyV2SnapshotDigest} from '../combat/v2/enemy-engine-authority';
import {
 PARTY_EVENT_EQ2_TRAIT_V92_MAX_MS,
 PARTY_EVENT_EQ2_TRAIT_V92_RELEASED,
 PARTY_EVENT_EQ2_TRAIT_V92_VERSION,
 type FrozenPartyEventV92Witness,
} from './weekly-party-event-eq2-traits-v92';
import type {VerifiedV2EquipmentEffectSource} from
 '../combat/v2/equipment-trait-engine-authority';

export const PARTY_EVENT_RESULT_AUDIT_V95_RELEASED=false;
export const PARTY_EVENT_RESULT_AUDIT_V95_VERSION='party-event-result-audit-v95' as const;

export interface PartyEventCombatReviewV95 {
 readonly version:typeof PARTY_EVENT_RESULT_AUDIT_V95_VERSION;
 readonly status:'nonpaying_qa_review';
 readonly independentlyCertified:false;
 readonly claimable:false;
 readonly rewardGranted:false;
 readonly encounterId:string;
 readonly eventId:string;
 readonly partyId:string;
 readonly family:FrozenPartyEventV92Witness['family'];
 readonly difficulty:FrozenPartyEventV92Witness['difficulty'];
 readonly tier:number;
 readonly reason:CombatResult['reason'];
 readonly durationMs:number;
 readonly combatDigest:string;
 readonly resultDigest:string;
 readonly reviewDigest:string;
 readonly contributions:readonly {
  readonly accountId:string;
  readonly characterId:string;
  readonly actorId:string;
  readonly damageDone:number;
  readonly healingDone:number;
  readonly shieldsCreated:number;
  readonly damageTaken:number;
  readonly interrupts:number;
 }[];
}

const fail=(why:string):never=>{throw Error('party_event_v95_'+why);};
const finiteNonNegative=(v:unknown):v is number=>
 typeof v==='number'&&Number.isFinite(v)&&v>=0;

/** Chunk combat events so long fights cannot exceed the shared 1024-array
 * canonical hash limit. Nulls encode absent fields explicitly. */
function eventDigest(event:CombatEvent):{
 atMs:number;type:string;actorId:string|null;targetId:string|null;
 abilityId:string|null;interruptedAbilityId:string|null;
 amount:number|null;absorbed:number|null;critical:boolean|null;
 detail:string|null;statusKind:string|null;statusTag:string|null;
 expiresAtMs:number|null;resource:string|null;resourceBefore:number|null;
 resourceAfter:number|null;gemStates:unknown;
}{
 return {
  atMs:event.atMs,type:event.type,
  actorId:event.actorId??null,targetId:event.targetId??null,
  abilityId:event.abilityId??null,
  interruptedAbilityId:event.interruptedAbilityId??null,
  amount:event.amount??null,absorbed:event.absorbed??null,
  critical:event.critical??null,detail:event.detail??null,
  statusKind:event.statusKind??null,statusTag:event.statusTag??null,
  expiresAtMs:event.expiresAtMs??null,resource:event.resource??null,
  resourceBefore:event.resourceBefore??null,
  resourceAfter:event.resourceAfter??null,
  gemStates:event.gemStates??null,
 };
}

/** A deterministic, *non-authoritative* rendering of combat metrics.
 * Its digest must never substitute for an independently signed V87 result. */
export function reviewPartyEventCombatResultV95(input:{
 readonly witness:FrozenPartyEventV92Witness;
 readonly combat:CombatInput;
 readonly sources:readonly VerifiedV2EquipmentEffectSource[];
 readonly result:CombatResult;
},qaEnabled=false):PartyEventCombatReviewV95{
 if(!qaEnabled||PARTY_EVENT_RESULT_AUDIT_V95_RELEASED||
   PARTY_EVENT_EQ2_TRAIT_V92_RELEASED||
   process.env.NODE_ENV==='production')fail('unreleased');
 const {witness:w,combat,sources,result}=input;
 if(!w||w.ruleset!==PARTY_EVENT_EQ2_TRAIT_V92_VERSION||
  w.mode!=='new-run-only'||!Array.isArray(w.roster)||
  w.roster.length<2||w.roster.length>4||
  !combat||combat.seed!==w.seed||
  combat.maxDurationMs!==PARTY_EVENT_EQ2_TRAIT_V92_MAX_MS||
  !Array.isArray(combat.players)||combat.players.length!==w.roster.length||
  !Array.isArray(combat.enemies)||combat.enemies.length!==1||
  !Array.isArray(sources)||sources.length!==w.roster.length||
  !w.roster.every((row,i)=>row.actorId===combat.players[i].id&&
   row.accountId===sources[i].accountId&&
   row.characterId===sources[i].characterId&&
   row.receiptRevision===sources[i].revision&&
   row.equipmentReceiptDigest===sources[i].equipmentReceiptDigest&&
   row.actorId===sources[i].actorId))
  fail('source_witness_mismatch');
 if(!result||!['victory','wipe','timeout'].includes(result.reason)||
  result.victory!==(result.reason==='victory')||
  !Number.isSafeInteger(result.durationMs)||result.durationMs<0||
  result.durationMs>PARTY_EVENT_EQ2_TRAIT_V92_MAX_MS||
  !Array.isArray(result.players)||result.players.length!==w.roster.length||
  !Array.isArray(result.enemies)||result.enemies.length!==1||
  !Array.isArray(result.events)||result.events.length===0||
  !result.players.every((p,i)=>p.definition?.id===w.roster[i].actorId)||
  result.enemies[0]?.definition?.id!==combat.enemies[0].id||
  !result.events.every(e=>Number.isSafeInteger(e.atMs)&&e.atMs>=0&&
   e.atMs<=result.durationMs&&
   (e.amount===undefined||finiteNonNegative(e.amount))&&
   (e.absorbed===undefined||finiteNonNegative(e.absorbed))))
  fail('invalid_result_or_timeline');

 const contributions=result.players.map((player,i)=>{
  const metrics=[
   player.damageDone,player.healingDone,player.damageTaken,player.interrupts,
  ];
  if(!metrics.every(finiteNonNegative)||!Number.isSafeInteger(player.interrupts))
   fail('invalid_contribution');
  const actorId=w.roster[i].actorId;
  const shieldsCreated=result.events.filter(e=>e.type==='shield'&&
   e.actorId===actorId).reduce((sum,e)=>sum+(e.amount??0),0);
  if(!finiteNonNegative(shieldsCreated))fail('invalid_shield_metric');
  return {
   accountId:w.roster[i].accountId,
   characterId:w.roster[i].characterId,
   actorId,
   damageDone:player.damageDone,
   healingDone:player.healingDone,
   shieldsCreated,
   damageTaken:player.damageTaken,
   interrupts:player.interrupts,
  };
 });
 // No outcome here is evidence of an authoritative victory. The separate
 // V87 receipt store must verify this independently using locked SQL sources.
 const chunks:string[]=[];
 for(let at=0;at<result.events.length;at+=256)
  chunks.push(enemyV2SnapshotDigest(result.events.slice(at,at+256).map(eventDigest)));
 const combatDigest=enemyV2SnapshotDigest(combat);
 const resultDigest=enemyV2SnapshotDigest({
  reason:result.reason,victory:result.victory,durationMs:result.durationMs,
  players:result.players.map(p=>({
   id:p.definition.id,hp:p.hp,shield:p.shield,alive:p.alive,downed:p.downed,
   phases:p.triggeredPhases,damageDone:p.damageDone,healingDone:p.healingDone,
   damageTaken:p.damageTaken,interrupts:p.interrupts,
  })),
  enemies:result.enemies.map(e=>({
   id:e.definition.id,hp:e.hp,shield:e.shield,alive:e.alive,
   downed:e.downed,phases:e.triggeredPhases,
  })),
  eventChunks:chunks,
 });
 const reviewBase={
  version:PARTY_EVENT_RESULT_AUDIT_V95_VERSION,
  status:'nonpaying_qa_review' as const,
  independentlyCertified:false as const,
  claimable:false as const,rewardGranted:false as const,
  encounterId:w.encounterId,eventId:w.eventId,partyId:w.partyId,
  family:w.family,difficulty:w.difficulty,tier:w.tier,
  reason:result.reason,durationMs:result.durationMs,
  combatDigest,resultDigest,contributions,
 };
 const reviewDigest=enemyV2SnapshotDigest({reviewBase,witness:w,sources});
 return {...reviewBase,reviewDigest};
}
