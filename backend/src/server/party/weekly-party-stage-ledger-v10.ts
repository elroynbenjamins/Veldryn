/**
 * Party Events v10 — hidden, read-only server-ledger contract.
 *
 * This is a pure validation/projection layer, NOT a database, endpoint, receipt
 * issuer or reward grant. The integration must load each field from locked
 * server-owned rows in one consistent transaction. A checksum detects accidental
 * drift; it is NOT an authentication token or proof of source ownership.
 */
import {createHash} from 'node:crypto';
import {deriveRole} from '../coop/role-readiness';
import {partyEventCadenceAt,selectPartyEventVariation,
 type WeeklyPartyFamily,type WeeklyPartyDifficulty} from './weekly-party-events-v2';
import {partyEventFamilyDesignV8} from './weekly-party-distinct-finales-v8';
import type {FrozenPartyBossLoadout,VerifiedOrderProgress} from './weekly-party-boss-v2';
import {simulatePartyEventStoryStageV9,
 type StoryActionV9,type StoryStageV9} from './weekly-party-family-stages-v9';

export const PARTY_EVENT_STAGE_LEDGER_V10_RELEASED=false;

export interface PartyEventEnrolledMemberV10 {
 readonly accountId:string;
 readonly characterId:string;
 /** Enrollment was committed by the server, never inferred from a client. */
 readonly joinedAtMs:number;
 readonly loadout:FrozenPartyBossLoadout;
}
export interface PartyEventWeekRecordV10 {
 readonly partyId:string;
 readonly cycleIndex:number;
 readonly eventStartsAtMs:number;
 readonly eventEndsAtMs:number;
 readonly family:WeeklyPartyFamily;
 readonly variation:string;
 readonly seed:number;
 readonly difficulty:WeeklyPartyDifficulty;
 /** Immutable list of enrolled members for this event. */
 readonly roster:readonly PartyEventEnrolledMemberV10[];
}
export interface PartyEventLockedVoteV10 {
 readonly choice:string;
 readonly lockedAtMs:number;
}
export interface PartyEventStageRecordV10 {
 readonly stage:StoryStageV9;
 readonly openedAtMs:number;
 readonly stage2Vote:PartyEventLockedVoteV10|null;
 readonly stage3Vote:PartyEventLockedVoteV10|null;
 readonly verifiedOrders:readonly VerifiedOrderProgress[];
}
export interface PartyEventTrustedStageContextV10 {
 readonly week:PartyEventWeekRecordV10;
 readonly stageRecord:PartyEventStageRecordV10;
 readonly nowMs:number;
}
export type PartyEventActionIdV10=StoryActionV9['id'];
export interface PartyEventSourceEvidenceV10 {
 /** A previously committed, separately verified gameplay/outbox row. */
 readonly sourceEventId:string;
 readonly partyId:string;
 readonly accountId:string;
 readonly kind:'verified_combat'|'verified_noncombat';
 readonly occurredAtMs:number;
 readonly committedAtMs:number;
}
export interface PartyEventStageReceiptV10 {
 readonly partyId:string;
 readonly eventStartsAtMs:number;
 readonly accountId:string;
 readonly stage:StoryStageV9;
 readonly actionId:PartyEventActionIdV10;
 readonly sourceEventId:string;
 readonly requestId:string;
 readonly committedAtMs:number;
 readonly stageContextHash:string;
}

function invalid(reason:string):never{throw Error('party_event_v10_'+reason);}
const validId=(value:string):boolean=>typeof value==='string'
 &&value.length>=8&&value.length<=180&&value.trim()===value;
const validTime=(n:number):boolean=>Number.isSafeInteger(n)&&n>=0;

/** Deterministic checksum for server-persisted projections, not a signature. */
export function partyEventStageChecksumV10(value:unknown):string{
 const canonical=(v:unknown):string=>{
  if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
  if(v&&typeof v==='object')return '{'+Object.entries(v as Record<string,unknown>)
   .sort(([a],[b])=>a.localeCompare(b))
   .map(([k,item])=>JSON.stringify(k)+':'+canonical(item)).join(',')+'}';
  return JSON.stringify(v);
 };
 return createHash('sha256').update(canonical(JSON.parse(JSON.stringify(value)))).digest('hex');
}
function assertWeek(week:PartyEventWeekRecordV10,nowMs:number,openedAtMs:number):void{
 const {eventStartsAtMs:start,eventEndsAtMs:end}=week;
 if(!validId(week.partyId)||!validTime(start)||!validTime(end)
  ||!validTime(nowMs)||!validTime(openedAtMs)
  ||openedAtMs<start||openedAtMs>nowMs||nowMs>=end)
  invalid('closed_or_invalid_window');
 const cadence=partyEventCadenceAt(start);
 if(!cadence.active||cadence.cycleIndex!==week.cycleIndex
  ||cadence.eventStartsAtMs!==start||cadence.eventEndsAtMs!==end
  ||cadence.family!==week.family||!Number.isSafeInteger(week.seed)||week.seed<0
  ||selectPartyEventVariation(week.family,week.seed)!==week.variation
  ||!['standard','veteran','heroic'].includes(week.difficulty))
  invalid('week_identity_mismatch');
 const members=week.roster;
 if(members.length<2||members.length>4
  ||new Set(members.map(m=>m.accountId)).size!==members.length
  ||new Set(members.map(m=>m.characterId)).size!==members.length)
  invalid('invalid_enrollment');
 const counts={tank:0,damage:0,support:0};
 const ids=new Set<string>();
 for(const member of members){
  const l=member.loadout,actor=l.actor;
  if(!validId(member.accountId)||!validId(member.characterId)
   ||!validTime(member.joinedAtMs)||member.joinedAtMs>openedAtMs
   ||l.accountId!==member.accountId||l.characterId!==member.characterId
   ||!validId(l.loadoutId)||!Number.isSafeInteger(l.revision)||l.revision<0
   ||!validTime(l.savedAtMs)||l.savedAtMs<member.joinedAtMs||l.savedAtMs>nowMs
   ||actor.id!==member.characterId||ids.has(actor.id)
   ||actor.team!=='players'||!Number.isInteger(actor.level)
   ||actor.level<1||actor.level>100||deriveRole(l.classId)!==actor.role
   ||actor.classId!==l.classId
   ||!Number.isFinite(actor.stats.maxHp)||actor.stats.maxHp<=0
   ||!Number.isFinite(actor.stats.attackPower)||actor.stats.attackPower<0)
   invalid('invalid_frozen_loadout');
  const {snapshotHash,...payload}=l;
  if(!/^[0-9a-f]{64}$/.test(snapshotHash)
   ||snapshotHash!==partyEventStageChecksumV10(payload))
   invalid('loadout_checksum_mismatch');
  ids.add(actor.id);
  counts[actor.role as keyof typeof counts]++;
 }
 if(counts.tank>1||counts.damage>2||counts.support>1
  ||members.length===4&&(counts.tank!==1||counts.damage!==2||counts.support!==1))
  invalid('invalid_role_composition');
}
function assertStage(input:PartyEventTrustedStageContextV10):void{
 const {stageRecord:s,week,nowMs}=input;
 if(![1,2,3].includes(s.stage))invalid('invalid_stage');
 assertWeek(week,nowMs,s.openedAtMs);
 const design=partyEventFamilyDesignV8(week.family);
 const vote=(v:PartyEventLockedVoteV10|null,stage:2|3)=>{
  if(!v||!validTime(v.lockedAtMs)||v.lockedAtMs<week.eventStartsAtMs
   ||v.lockedAtMs>nowMs
   ||!(stage===2?design.stage2:design.stage3).some(option=>option.id===v.choice))
   invalid('vote_not_locked');
 };
 if(s.stage===1&&(s.stage2Vote!==null||s.stage3Vote!==null)
  ||s.stage===2&&s.stage3Vote!==null)
  invalid('future_vote_leak');
 if(s.stage>=2)vote(s.stage2Vote,2);
 if(s.stage===3){
  vote(s.stage3Vote,3);
  if(s.stage3Vote!.lockedAtMs<s.openedAtMs
   ||s.stage2Vote!.lockedAtMs>s.stage3Vote!.lockedAtMs)
   invalid('vote_order_mismatch');
 }
 if(s.stage===2&&s.stage2Vote!.lockedAtMs<s.openedAtMs)
  invalid('vote_order_mismatch');
 const orderKeys=new Set<string>();
 for(const order of s.verifiedOrders){
  const key=[order.stage,order.kind,order.preparation??'',order.itemId].join(':');
  if(orderKeys.has(key)||!validId(order.itemId)
   ||![1,2,3].includes(order.stage)
   ||!Number.isSafeInteger(order.quantity)||order.quantity<1
   ||!Number.isSafeInteger(order.donatedQuantity)
   ||order.donatedQuantity<0||order.donatedQuantity>order.quantity)
   invalid('invalid_supply_ledger');
  orderKeys.add(key);
 }
}

/** One consistent, detached read model for v9 story simulation. Never grants EP. */
export function projectLockedPartyEventStageV10(input:PartyEventTrustedStageContextV10){
 assertStage(input);
 // Detaching prevents the combat engine/consumer from mutating source rows.
 const snapshot=structuredClone(input);
 const {week,stageRecord:stage}=snapshot;
 const contextHash=partyEventStageChecksumV10({week,stageRecord:stage});
 const story=simulatePartyEventStoryStageV9({
  family:week.family,variation:week.variation,stage:stage.stage,
  difficulty:week.difficulty,seed:week.seed,
  verifiedActors:week.roster.map(m=>m.loadout.actor),
  verifiedOrders:stage.verifiedOrders,
  ...(stage.stage>=2?{stage2Choice:stage.stage2Vote!.choice}:{}),
  ...(stage.stage===3?{stage3Choice:stage.stage3Vote!.choice}:{}),
 });
 return {kind:'hidden_non_rewarding_locked_stage' as const,
  contextHash,story,eligibleForEventPoints:false as const,
  eligibleForRewardGrant:false as const};
}

const ACTION_STAGE:Readonly<Record<PartyEventActionIdV10,StoryStageV9>>={
 scout_route:1,secure_approach:2,support_expedition:2,prepare_finale:3,
};
/**
 * Calculates an idempotent receipt INSERT decision. Its caller MUST read
 * evidence from the actual server source ledger and enforce unique
 * (party,week,account,action), (party,week,source) and request IDs atomically
 * in the database; this pure function does not write, reserve or pay anything.
 */
export function planPartyEventStageReceiptV10(input:{
 readonly context:PartyEventTrustedStageContextV10;
 readonly evidence:PartyEventSourceEvidenceV10;
 readonly requestId:string;
 readonly actionId:PartyEventActionIdV10;
 readonly existingReceipts:readonly PartyEventStageReceiptV10[];
}):{status:'new'|'replay';receipt:PartyEventStageReceiptV10;eventPointsGranted:0}{
 assertStage(input.context);
 const {week,stageRecord,nowMs}=input.context;
 const e=input.evidence;
 if(ACTION_STAGE[input.actionId]!==stageRecord.stage)
  invalid('action_wrong_stage');
 if(!validId(input.requestId)||!validId(e.sourceEventId)
  ||e.partyId!==week.partyId
  ||!week.roster.some(m=>m.accountId===e.accountId
   &&m.joinedAtMs<=e.occurredAtMs)
  ||!validTime(e.occurredAtMs)||!validTime(e.committedAtMs)
  ||e.occurredAtMs<stageRecord.openedAtMs
  ||e.occurredAtMs>=week.eventEndsAtMs
  ||e.committedAtMs<e.occurredAtMs||e.committedAtMs>nowMs
  ||!['verified_combat','verified_noncombat'].includes(e.kind)
  ||(stageRecord.stage===1&&e.kind!=='verified_noncombat'))
  invalid('unverified_or_out_of_window_source');
 const existing=input.existingReceipts.filter(r=>r.partyId===week.partyId
  &&r.eventStartsAtMs===week.eventStartsAtMs);
 const sameAction=existing.find(r=>r.accountId===e.accountId
  &&r.actionId===input.actionId);
 if(sameAction){
  if(sameAction.requestId!==input.requestId
   ||sameAction.sourceEventId!==e.sourceEventId
   ||sameAction.stage!==stageRecord.stage)
   invalid('action_already_claimed');
  return {status:'replay',receipt:structuredClone(sameAction),eventPointsGranted:0};
 }
 if(existing.some(r=>r.sourceEventId===e.sourceEventId
  ||r.requestId===input.requestId))
  invalid('reused_source_or_request');
 const receipt:PartyEventStageReceiptV10={
  partyId:week.partyId,eventStartsAtMs:week.eventStartsAtMs,
  accountId:e.accountId,stage:stageRecord.stage,actionId:input.actionId,
  sourceEventId:e.sourceEventId,requestId:input.requestId,
  committedAtMs:e.committedAtMs,
  stageContextHash:partyEventStageChecksumV10({week,stageRecord}),
 };
 return {status:'new',receipt,eventPointsGranted:0};
}
