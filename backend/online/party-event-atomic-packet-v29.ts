/**
 * Party Events v29: prepare the future two-record paid receipt + native Inbox
 * packet entirely in memory, from a v27-verified offer and v28 canonical
 * GameState preview. This is NEVER an entitlement or a database claim.
 *
 * A later SQL writer must re-verify frozen identity, reward model, online
 * revision, and every destination INSIDE the ordinary party-account lock.
 * This packet is an audit proposal; its state SHA is not an authorization.
 */
import type {GameState,SkillId} from '../../apps/mobile/src/core/types';
import type {PartyEventRewardBundle}
  from '../src/server/party/weekly-party-rewards-v2';
import type {VerifiedPartyEventEvidenceV27}
  from '../src/server/party/weekly-party-settlement-evidence-v27';
import {projectPartyEventSaveV28}
  from './party-event-save-projection-v28';

export const PARTY_EVENT_ATOMIC_PACKET_V29_RELEASED=false;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUEST_ID=/^[a-zA-Z0-9_-]{8,128}$/;
const HASH=/^[0-9a-f]{64}$/;
function check(value:unknown,reason:string):asserts value {
 if(!value)throw new Error('party_event_v29_'+reason);
}
function canonical(value:unknown):string {
 if(value===null||typeof value!=='object')return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 return '{'+Object.keys(value).sort().map(key=>
   JSON.stringify(key)+':'+canonical((value as Record<string,unknown>)[key])).join(',')+'}';
}
async function stateDigest(value:GameState):Promise<string> {
 // JSON round-trip reproduces what PostgreSQL's jsonb online snapshot will
 // store; removes optional undefined properties before sorting/hash.
 const normalized=JSON.parse(JSON.stringify(value)) as unknown;
 const bytes=new TextEncoder().encode(canonical(normalized));
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
}

export interface FuturePaidReceiptDraftV29 {
 readonly id:string;
 readonly inboxId:string;
 readonly offerId:string;
 readonly accountId:string;
 readonly characterId:string;
 readonly reservationId:string;
 readonly eventStartsAt:string;
 readonly requestId:string;
 readonly rewardModel:'party-event-rewards-v2';
 readonly rewardKind:PartyEventRewardBundle['kind'];
 readonly rewardHash:string;
 readonly rewardJson:PartyEventRewardBundle;
 readonly sourceRevision:number;
 readonly settledRevision:number;
 readonly goldDelta:number;
 readonly combatXpDelta:number;
 readonly professionXpDelta:number;
 readonly professionSkillId:SkillId|null;
 readonly companionEssenceDelta:number;
 readonly bondstonesDelta:number;
 readonly partyRenownDelta:number;
 readonly gemDustDelta:number;
 readonly stateAfterHash:string;
}
export interface FutureInboxDraftV29 {
 readonly id:string;
 readonly receiptId:string;
 readonly offerId:string;
 readonly accountId:string;
 readonly characterId:string;
 readonly eventStartsAt:string;
 readonly title:'Party Event Rewards';
 readonly rewardJson:PartyEventRewardBundle;
 readonly rewardHash:string;
}
export interface PrivatePartyEventAtomicPacketV29 {
 readonly proposedState:GameState;
 readonly futureReceipt:FuturePaidReceiptDraftV29;
 readonly futureInbox:FutureInboxDraftV29;
 readonly previewOnly:true;
 readonly committed:false;
 readonly rewardsGranted:false;
 readonly inboxDelivered:false;
 readonly requestRecorded:false;
 readonly releaseEnabled:false;
 readonly conditionsStillRequired:readonly [
   'serialized_immutable_proof_revalidation',
   'atomic_online_save_wallet_and_skill_projection',
   'same_transaction_receipt_and_inbox_insert',
   'commit_time_idempotency_and_rollback_tests',
 ];
}

export async function planPrivatePartyEventAtomicPacketV29(input:{
 trustedAccountId:string;
 requestId:string;
 /** Both UUIDs must originate from the trusted server, never HTTP payload. */
 receiptId:string;
 inboxId:string;
 evidence:VerifiedPartyEventEvidenceV27;
 lockedState:GameState;
 lockedOnlineRevision:number;
 lockedWalletGold:number;
 lockedCharacterGold:number;
 professionSkillTarget?:SkillId;
}):Promise<PrivatePartyEventAtomicPacketV29>{
 const {evidence:e}=input;
 check(UUID.test(input.trustedAccountId)
   &&UUID.test(input.receiptId)&&UUID.test(input.inboxId)
   &&input.receiptId!==input.inboxId,'invalid_identity');
 check(REQUEST_ID.test(input.requestId),'invalid_request_id');
 check(e&&UUID.test(e.offerId)&&UUID.test(e.partyId)
   &&UUID.test(e.reservationId)&&UUID.test(e.frozenCharacterId),
   'invalid_evidence_identity');
 check(e.trustedAccountId===input.trustedAccountId
   &&typeof e.eventStartsAt==='string'
   &&Number.isFinite(Date.parse(e.eventStartsAt)),
   'event_account_mismatch');
 check(typeof e.quoteHash==='string'&&HASH.test(e.quoteHash),
   'quote_hash_invalid');
 check(Number.isSafeInteger(input.lockedOnlineRevision)
   &&input.lockedOnlineRevision>=0
   &&input.lockedOnlineRevision<Number.MAX_SAFE_INTEGER,
   'revision_unavailable');
 // v28 independently verifies the quote model and ALL state destinations.
 const preview=projectPartyEventSaveV28({
  evidence:e,state:input.lockedState,
  trustedAccountId:input.trustedAccountId,
  expectedOnlineRevision:input.lockedOnlineRevision,
  lockedWalletGold:input.lockedWalletGold,
  lockedCharacterProjectionGold:input.lockedCharacterGold,
  ...(input.professionSkillTarget
     ?{professionSkillTarget:input.professionSkillTarget}:{}),
 });
 const r=e.reward;
 check(r.version==='party-event-rewards-v2','model_invalid');
 const id=input.receiptId,inboxId=input.inboxId;
 const receipt:FuturePaidReceiptDraftV29={
  id,inboxId,offerId:e.offerId,accountId:input.trustedAccountId,
  characterId:e.frozenCharacterId,reservationId:e.reservationId,
  eventStartsAt:e.eventStartsAt,requestId:input.requestId,
  rewardModel:'party-event-rewards-v2',rewardKind:r.kind,
  rewardHash:e.quoteHash,rewardJson:r,
  sourceRevision:input.lockedOnlineRevision,
  settledRevision:input.lockedOnlineRevision+1,
  goldDelta:r.gold,
  combatXpDelta:preview.grantedCombatSkillXp,
  professionXpDelta:preview.grantedProfessionXp,
  professionSkillId:preview.professionSkillTarget,
  companionEssenceDelta:r.companionEssence,
  bondstonesDelta:r.bondstones,
  partyRenownDelta:r.partyRenown,
  gemDustDelta:r.materials.GEM_DUST??0,
  stateAfterHash:await stateDigest(preview.state),
 };
 const inbox:FutureInboxDraftV29={
  id:inboxId,receiptId:id,offerId:e.offerId,
  accountId:input.trustedAccountId,characterId:e.frozenCharacterId,
  eventStartsAt:e.eventStartsAt,title:'Party Event Rewards',
  rewardJson:r,rewardHash:e.quoteHash,
 };
 return {
  proposedState:preview.state,futureReceipt:receipt,futureInbox:inbox,
  previewOnly:true,committed:false,rewardsGranted:false,
  inboxDelivered:false,requestRecorded:false,releaseEnabled:false,
  conditionsStillRequired:[
   'serialized_immutable_proof_revalidation',
   'atomic_online_save_wallet_and_skill_projection',
   'same_transaction_receipt_and_inbox_insert',
   'commit_time_idempotency_and_rollback_tests',
  ],
 };
}

/** There is deliberately no SQL INSERT/COMMIT adapter or public claim path. */
export async function commitPrivatePartyEventAtomicPacketV29():Promise<never>{
 throw new Error('party_event_v29_atomic_commit_not_released');
}
