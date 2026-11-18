/**
 * Hidden Party Events v23 — trusted server-only replay -> durable attestation.
 *
 * The caller provides ONLY an issued reservation UUID. The actual combat
 * result must come from v21's privately read, single-MVCC source bundle,
 * audited v22 gameplay items and v20 independent deterministic simulation.
 * A committed attestation is not an economy grant or a claimable reward.
 */
import {
  replayPrivatePartyEventBossV21,
  type TrustedPartyReplayRepositoryV21,
} from './weekly-party-boss-reader-v21';

export const PARTY_EVENT_BOSS_ATTESTATION_V23_RELEASED=false;
export const PARTY_EVENT_BOSS_RESOURCE_AUDIT_V23=
  'greenfields-verified-gathering-v22' as const;

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const HEX=/^[a-f0-9]{64}$/;

export interface PrivatePartyReplayAttestationV23 {
  reservationId:string;
  requestId:string;
  sourceDigest:string;
  candidateHash:string;
  replayHash:string;
  loadoutHash:string;
  tiersCleared:number;
  rewardBand:number;
  resourceAudit:typeof PARTY_EVENT_BOSS_RESOURCE_AUDIT_V23;
}
export interface PrivatePartyReplayAttestationWriteResultV23 {
  replayed:boolean;
  reservationId:string;
  replayHash:string;
  workerReplayAttested:true;
  /** Postgres verifies source digest/identities, but not the combat engine. */
  combatIndependentlyVerifiedBySql:false;
  rewardsGranted:false;
  entitlementsCreated:false;
}
export interface TrustedPartyReplayAttestationRepositoryV23
  extends TrustedPartyReplayRepositoryV21 {
  /** Service-only v23 SQL RPC. Never call this with player-submitted JSON. */
  attestReplayProof(
    proof:PrivatePartyReplayAttestationV23
  ):Promise<PrivatePartyReplayAttestationWriteResultV23>;
}

export interface PrivatePartyAttestationOutcomeV23 {
  kind:'trusted_worker_replay_attested_no_reward';
  reservationId:string;
  sourceDigest:string;
  replayHash:string;
  tiersCleared:number;
  rewardBand:number;
  replayed:boolean;
  rewardsGranted:false;
  entitlementsCreated:false;
}
function assert(ok:unknown,code:string):asserts ok {
  if(!ok)throw new Error('party_event_v23_'+code);
}
/**
 * This call is only valid inside a privileged private worker. No cron/route
 * is wired and the gate remains off until explicit release approval.
 */
export async function attestPrivatePartyBossReplayV23(input:{
  gateEnabled:boolean;
  reservationId:string;
  repository:TrustedPartyReplayAttestationRepositoryV23;
}):Promise<PrivatePartyAttestationOutcomeV23>{
  assert(input.gateEnabled,'release_gate_disabled');
  assert(UUID.test(input.reservationId),'invalid_reservation');
  const verified=await replayPrivatePartyEventBossV21({
    gateEnabled:input.gateEnabled,reservationId:input.reservationId,
    repository:input.repository,
  });
  const proof=verified.proof;
  assert(proof.kind==='server_replayed_combat_not_reward_grant'
    &&proof.combatReplayed===true&&proof.rewardGrantAllowed===false
    &&HEX.test(verified.sourceDigest)&&HEX.test(proof.candidateHash)
    &&HEX.test(proof.replayHash)&&HEX.test(proof.frozenLoadoutHash)
    &&Number.isInteger(proof.tiersCleared)
    &&proof.tiersCleared>=0&&proof.tiersCleared<=12
    &&Number.isInteger(proof.rewardBand)
    &&proof.rewardBand>=1&&proof.rewardBand<=6,
    'invalid_independent_replay_proof');

  // Deterministic request key ensures the same reservation always retries
  // the same private attestation. Caller never supplies a mutable request ID.
  const requestId='party-event-v23-replay:'+input.reservationId.toLowerCase();
  const recorded=await input.repository.attestReplayProof({
    reservationId:input.reservationId,requestId,
    sourceDigest:verified.sourceDigest,candidateHash:proof.candidateHash,
    replayHash:proof.replayHash,loadoutHash:proof.frozenLoadoutHash,
    tiersCleared:proof.tiersCleared,rewardBand:proof.rewardBand,
    resourceAudit:PARTY_EVENT_BOSS_RESOURCE_AUDIT_V23,
  });
  assert(recorded.reservationId===input.reservationId
    &&recorded.replayHash===proof.replayHash
    &&typeof recorded.replayed==='boolean'
    &&recorded.workerReplayAttested===true
    &&recorded.combatIndependentlyVerifiedBySql===false
    &&recorded.rewardsGranted===false
    &&recorded.entitlementsCreated===false,'attestation_write_inconsistent');
  return Object.freeze({
    kind:'trusted_worker_replay_attested_no_reward' as const,
    reservationId:input.reservationId,sourceDigest:verified.sourceDigest,
    replayHash:proof.replayHash,tiersCleared:proof.tiersCleared,
    rewardBand:proof.rewardBand,replayed:recorded.replayed,
    rewardsGranted:false as const,entitlementsCreated:false as const,
  });
}
