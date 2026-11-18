/**
 * Hidden Party Events v21 — the only intended SQL -> combat replay adapter.
 *
 * The repository implementation MUST call the service-only
 * private.read_party_event_boss_replay_snapshot_v21(reservation UUID)
 * ONCE, without any client-supplied record JSON. The separate catalog reader
 * must build an audited, level-accessible canonical resource list from
 * trusted server content, never the mobile request.
 *
 * This is an in-memory, non-granting proof boundary. It is NOT a public RPC,
 * worker loop, reward settlement or economic credit.
 */
import {
  replayAndVerifyPartyEventBossV20,
  type PartyBossReplayInputV20,type PartyBossReplayProofV20,
} from './weekly-party-boss-replay-v20';
import type {VerifiedSupplyItem} from './weekly-party-events-v2';

export const PARTY_EVENT_BOSS_READER_V21_RELEASED=false;
export const PARTY_EVENT_REPLAY_SNAPSHOT_V21='private-party-event-replay-snapshot-v21';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX=/^[a-f0-9]{64}$/;
type DatabaseReplayPayloadV21=Omit<PartyBossReplayInputV20,'auditedCatalog'|'serverNowMs'>;

export interface PrivatePartyReplayBundleV21 {
  version:string;
  sourceDigest:string;
  serverNowMs:number;
  auditedCatalogIncluded:false;
  combatReplayed:false;
  rewardGrantAllowed:false;
  payload:DatabaseReplayPayloadV21;
}
export interface TrustedPartyReplayRepositoryV21 {
  /** One service-role-only SQL statement with a single PostgreSQL MVCC snapshot.
   * No JSON payloads, session-supplied timestamps or player IDs accepted. */
  readReplayBundle(reservationId:string):Promise<PrivatePartyReplayBundleV21>;
  /** Authoritatively audit items, unlocks, tiers and gather times.
   * In particular no herb material is approved until its gather source is known. */
  loadCanonicalResourceCatalog(bundle:PrivatePartyReplayBundleV21):Promise<readonly VerifiedSupplyItem[]>;
}
export interface PrivatePartyReplayResultV21 {
  readonly kind:'private_non_rewarding_replay';
  readonly sourceDigest:string;
  readonly proof:PartyBossReplayProofV20;
  readonly rewardsGranted:false;
}

function assert(value:unknown,reason:string):asserts value {
  if(!value)throw new Error('party_event_v21_'+reason);
}
function object(value:unknown):value is Record<string,unknown> {
  return value!==null&&typeof value==='object'&&!Array.isArray(value);
}
/**
 * This function does NOT accept a candidate object from the caller: its only
 * identity parameter is a previously issued reservation UUID. No public route
 * invokes it, and the full Party Events feature gate is still off.
 */
export async function replayPrivatePartyEventBossV21(input:{
  gateEnabled:boolean;
  reservationId:string;
  repository:TrustedPartyReplayRepositoryV21;
}):Promise<PrivatePartyReplayResultV21> {
  assert(input.gateEnabled,'release_gate_disabled');
  assert(UUID.test(input.reservationId),'invalid_reservation');
  const bundle=await input.repository.readReplayBundle(input.reservationId);
  assert(object(bundle)
    &&bundle.version===PARTY_EVENT_REPLAY_SNAPSHOT_V21
    &&HEX.test(bundle.sourceDigest)
    &&Number.isSafeInteger(bundle.serverNowMs)&&bundle.serverNowMs>0
    &&bundle.auditedCatalogIncluded===false
    &&bundle.combatReplayed===false
    &&bundle.rewardGrantAllowed===false
    &&object(bundle.payload),'invalid_sql_replay_bundle');
  const p=bundle.payload;
  assert(object(p.week)&&Array.isArray(p.roster)
    &&Array.isArray(p.loadouts)&&Array.isArray(p.orders)
    &&Array.isArray(p.seals)&&Array.isArray(p.votes)
    &&Array.isArray(p.transitions)&&object(p.finale)
    &&object(p.reservation)&&object(p.candidate)
    &&p.reservation.id===input.reservationId
    &&p.candidate.reservation_id===input.reservationId,
    'reservation_bundle_mismatch');

  // Explicitly external to SQL snapshot: SQL v16 only knows item IDs and
  // category, not verified tier, gather rate or level-accessible source.
  const catalog=await input.repository.loadCanonicalResourceCatalog(bundle);
  assert(Array.isArray(catalog)&&catalog.length>0,'canonical_resource_catalog_missing');
  const proof=replayAndVerifyPartyEventBossV20({
    ...p,serverNowMs:bundle.serverNowMs,auditedCatalog:catalog,
  });
  assert(proof.reservationId===input.reservationId
    &&proof.combatReplayed===true
    &&proof.rewardGrantAllowed===false,'replay_proof_invalid');
  return Object.freeze({
    kind:'private_non_rewarding_replay' as const,
    sourceDigest:bundle.sourceDigest,proof,rewardsGranted:false as const,
  });
}
