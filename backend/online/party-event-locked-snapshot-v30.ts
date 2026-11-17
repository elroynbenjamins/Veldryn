/**
 * Party Events v30: trusted read-only adapter for an account-locked,
 * immutable claim inspection. A single SQL RPC TRANSACTION ends before the
 * JS callback receives this value. It must never be treated as a payment
 * authorization, retained row lock or successful claim receipt.
 */
import type {GameState} from '../../apps/mobile/src/core/types';
import {partyEventRewardBundle,type PartyEventRewardBundle,
 type PartyEventCacheChoice} from '../src/server/party/weekly-party-rewards-v2';
import type {WeeklyPartyDifficulty} from '../src/server/party/weekly-party-events-v2';

export const PARTY_EVENT_LOCKED_SNAPSHOT_V30_RELEASED=false;
export const PARTY_EVENT_LOCKED_SNAPSHOT_QUERY_V30=
 'select private.inspect_party_event_claim_lock_v30($1::uuid,$2::uuid) as snapshot' as const;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const HEX=/^[a-f0-9]{64}$/;
function must(ok:unknown,reason:string):asserts ok {
 if(!ok)throw Error('party_event_v30_'+reason);
}
function obj(v:unknown):v is Record<string,unknown>{
 return !!v&&typeof v==='object'&&!Array.isArray(v);
}
const DIFFICULTIES=['standard','veteran','heroic'] as const;
function exactQuote(a:PartyEventRewardBundle,b:PartyEventRewardBundle){
 const keys=Object.keys(a.materials).sort(),other=Object.keys(b.materials).sort();
 return a.version===b.version&&a.kind===b.kind
  &&a.performanceBand===b.performanceBand
  &&a.personalPoints===b.personalPoints&&a.gold===b.gold
  &&a.combatXp===b.combatXp&&a.skillXp===b.skillXp
  &&a.companionEssence===b.companionEssence
  &&a.bondstones===b.bondstones&&a.partyRenown===b.partyRenown
  &&JSON.stringify(keys)===JSON.stringify(other)
  &&keys.every(k=>a.materials[k]===b.materials[k]);
}
export interface PrivatePartyEventLockedSnapshotV30{
 schema:'party-event-locked-snapshot-v30';
 offerId:string;partyId:string;reservationId:string;
 eventStartsAt:string;accountId:string;characterId:string;
 difficulty:WeeklyPartyDifficulty;
 rewardHash:string;reward:PartyEventRewardBundle;
 onlineRevision:number;walletGold:number;characterGold:number;
 state:GameState;
 checked:true;previewOnly:true;
 claimable:false;claimed:false;economyApplied:false;
 inboxDelivered:false;locksReleasedAtRpcEnd:true;
}
export interface VerifiedPartyEventLockedSnapshotV30{
 readonly accountId:string;
 readonly offerId:string;
 readonly partyId:string;
 readonly reservationId:string;
 readonly eventStartsAt:string;
 readonly frozenCharacterId:string;
 readonly difficulty:WeeklyPartyDifficulty;
 readonly reward:PartyEventRewardBundle;
 readonly quoteHash:string;
 readonly state:GameState;
 readonly onlineRevision:number;
 readonly walletGold:number;
 readonly characterGold:number;
 readonly previewOnly:true;
 readonly committed:false;
 readonly paid:false;
 readonly inboxDelivered:false;
 readonly locksHeld:false;
 readonly requiresRevalidationInsidePaymentTransaction:true;
}
export interface PrivatePartyEventLockedSqlV30{
 queryOne(sql:typeof PARTY_EVENT_LOCKED_SNAPSHOT_QUERY_V30,
  params:readonly [string,string]):Promise<{snapshot:unknown}|null>;
}
/** Validate every independent field even though SQL is a trusted server read. */
export function validatePrivatePartyEventLockedSnapshotV30(input:{
 trustedAccountId:string;
 offerId:string;
 snapshot:unknown;
}):VerifiedPartyEventLockedSnapshotV30{
 const {snapshot:s}=input;
 must(UUID.test(input.trustedAccountId)&&UUID.test(input.offerId),
  'trusted_identity_invalid');
 must(obj(s),'snapshot_missing');
 must(s.schema==='party-event-locked-snapshot-v30'
  &&s.checked===true&&s.previewOnly===true
  &&s.claimable===false&&s.claimed===false
  &&s.economyApplied===false&&s.inboxDelivered===false
  &&s.locksReleasedAtRpcEnd===true,
  'release_flags_invalid');
 must(s.accountId===input.trustedAccountId&&s.offerId===input.offerId
  &&typeof s.partyId==='string'&&UUID.test(s.partyId)
  &&typeof s.reservationId==='string'&&UUID.test(s.reservationId)
  &&typeof s.characterId==='string'&&UUID.test(s.characterId)
  &&typeof s.eventStartsAt==='string'
  &&Number.isFinite(Date.parse(s.eventStartsAt)),
  'provenance_identity_invalid');
 must(DIFFICULTIES.includes(s.difficulty as WeeklyPartyDifficulty),
  'difficulty_invalid');
 must(typeof s.rewardHash==='string'&&HEX.test(s.rewardHash),
  'quote_hash_invalid');
 must(obj(s.state)&&obj(s.state.character)
  &&s.state.character.id===s.characterId,
  'frozen_character_mismatch');
 const revision=s.onlineRevision,g=s.walletGold,c=s.characterGold;
 must(typeof revision==='number'&&Number.isSafeInteger(revision)
  &&revision>=0&&revision<Number.MAX_SAFE_INTEGER,
  'revision_invalid');
 must(typeof g==='number'&&Number.isSafeInteger(g)&&g>=0
  &&typeof c==='number'&&Number.isSafeInteger(c)&&c>=0
  &&s.state.character.gold===g&&c===g,
  'gold_projection_conflict');
 must(obj(s.reward)&&obj(s.reward.materials)
  &&typeof s.reward.kind==='string'
  &&typeof s.reward.personalPoints==='number'
  &&Number.isInteger(s.reward.personalPoints)
  &&typeof s.reward.performanceBand==='number'
  &&Number.isInteger(s.reward.performanceBand),
  'quote_invalid');
 const reward=s.reward as unknown as PartyEventRewardBundle;
 const kind=reward.kind;
 const choice=kind==='participation'?undefined:kind as PartyEventCacheChoice;
 let expected:PartyEventRewardBundle;
 try{
  expected=partyEventRewardBundle({
   difficulty:s.difficulty as WeeklyPartyDifficulty,
   personalPoints:reward.personalPoints,
   performanceBand:reward.performanceBand,
   choice,
  });
 }catch{throw Error('party_event_v30_quote_formula_invalid');}
 must(exactQuote(expected,reward),'quote_formula_mismatch');
 return {
  accountId:input.trustedAccountId,offerId:input.offerId,
  partyId:s.partyId as string,reservationId:s.reservationId as string,
  eventStartsAt:s.eventStartsAt as string,
  frozenCharacterId:s.characterId as string,
  difficulty:s.difficulty as WeeklyPartyDifficulty,
  reward,quoteHash:s.rewardHash as string,state:s.state as unknown as GameState,
  onlineRevision:revision as number,walletGold:g as number,
  characterGold:c as number,previewOnly:true,committed:false,paid:false,
  inboxDelivered:false,locksHeld:false,
  requiresRevalidationInsidePaymentTransaction:true,
 };
}
export async function readPrivatePartyEventLockedSnapshotV30(input:{
 gateEnabled:boolean;
 offerId:string;
 trustedAccountId:string;
 db:PrivatePartyEventLockedSqlV30;
}):Promise<VerifiedPartyEventLockedSnapshotV30>{
 must(input.gateEnabled,'inspection_gate_disabled');
 must(UUID.test(input.offerId)&&UUID.test(input.trustedAccountId),
  'trusted_identity_invalid');
 const row=await input.db.queryOne(PARTY_EVENT_LOCKED_SNAPSHOT_QUERY_V30,
  [input.offerId,input.trustedAccountId]);
 if(!row)throw Error('party_event_v30_snapshot_not_found');
 return validatePrivatePartyEventLockedSnapshotV30({
  trustedAccountId:input.trustedAccountId,
  offerId:input.offerId,snapshot:row.snapshot,
 });
}
/** No code in this module can grant currency or produce a paid receipt. */
export async function claimPartyEventFromLockedSnapshotV30():Promise<never>{
 throw Error('party_event_v30_atomic_grant_unreleased');
}
