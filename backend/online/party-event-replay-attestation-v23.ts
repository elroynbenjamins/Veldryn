/**
 * Hidden Party Events v23 — privileged PostgreSQL attestation write adapter.
 *
 * Only a server-internal connection may call this private SQL routine.
 * It CANNOT be exposed through game/mobile HTTP or accept client proof JSON.
 */
import {
  createCanonicalPartyReplayRepositoryV22,
  type PrivatePartySqlReaderV22,
} from './party-event-replay-repository-v22';
import {
  type TrustedPartyReplayAttestationRepositoryV23,
  type PrivatePartyReplayAttestationV23,
  type PrivatePartyReplayAttestationWriteResultV23,
} from '../src/server/party/weekly-party-boss-attestation-v23';

export const PARTY_EVENT_REPLAY_ATTESTATION_SQL_V23_RELEASED=false;
export const PARTY_EVENT_ATTEST_SQL_V23=
  'select private.attest_party_event_boss_replay_v23($1::uuid,$2::text,$3::text,$4::text,$5::text,$6::text,$7::integer,$8::integer,$9::text) as attestation' as const;

export interface PrivatePartyAttestationSqlWriterV23 {
  queryOne(
    sql:typeof PARTY_EVENT_ATTEST_SQL_V23,
    params:readonly [string,string,string,string,string,string,number,number,string],
  ):Promise<{attestation:unknown}|null>;
}

export function createTrustedPartyReplayAttestationRepositoryV23(
  reader:PrivatePartySqlReaderV22,
  writer:PrivatePartyAttestationSqlWriterV23,
):TrustedPartyReplayAttestationRepositoryV23 {
  const canonical=createCanonicalPartyReplayRepositoryV22(reader);
  return {
    ...canonical,
    async attestReplayProof(proof:PrivatePartyReplayAttestationV23){
      // All values are produced by the v20/v21 server replay, not by caller.
      const row=await writer.queryOne(PARTY_EVENT_ATTEST_SQL_V23,[
        proof.reservationId,proof.requestId,proof.sourceDigest,
        proof.candidateHash,proof.replayHash,proof.loadoutHash,
        proof.tiersCleared,proof.rewardBand,proof.resourceAudit,
      ]);
      if(!row||!row.attestation||typeof row.attestation!=='object'
        ||Array.isArray(row.attestation))
        throw new Error('party_event_v23_missing_database_attestation');
      return row.attestation as PrivatePartyReplayAttestationWriteResultV23;
    },
  };
}
