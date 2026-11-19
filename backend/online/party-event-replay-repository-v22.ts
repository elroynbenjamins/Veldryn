/**
 * Hidden Party Events v22 — concrete private PostgreSQL reader adapter.
 *
 * This is a server-only adapter. The database handle MUST be a privileged
 * internal PostgreSQL connection using a role allowed to EXECUTE the private
 * v21 function. This is NOT a PostgREST or HTTP endpoint and it must never be
 * used with a client/anon/authenticated connection.
 *
 * The SQL function returns all replay data in ONE stable MVCC statement.
 * The resource catalogue is derived independently from verified gameplay
 * content, not from mutable JSON in the DB or user submitted quantities.
 */
import {
  type TrustedPartyReplayRepositoryV21,
  type PrivatePartyReplayBundleV21,
} from '../src/server/party/weekly-party-boss-reader-v21';
import {auditedGreenfieldsPartySuppliesV22} from './party-event-canonical-supplies-v22';

export const PARTY_EVENT_SQL_REPLAY_READ_V22_RELEASED=false;
export const PARTY_EVENT_SQL_REPLAY_QUERY_V22=
  'select private.read_party_event_boss_replay_snapshot_v21($1::uuid) as bundle' as const;

export interface PrivatePartySqlReaderV22 {
  queryOne(
    sql:typeof PARTY_EVENT_SQL_REPLAY_QUERY_V22,
    params:readonly [string],
  ):Promise<{bundle:unknown}|null>;
}

export function createCanonicalPartyReplayRepositoryV22(
  db:PrivatePartySqlReaderV22,
):TrustedPartyReplayRepositoryV21 {
  return {
    async readReplayBundle(reservationId:string) {
      // The outer v21 replay boundary validates UUID and event gate *before*
      // calling this adapter. Keep even direct repository use fail-closed.
      if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        .test(reservationId))throw Error('party_event_v22_invalid_reservation');
      const row=await db.queryOne(PARTY_EVENT_SQL_REPLAY_QUERY_V22,[reservationId]);
      if(!row||!row.bundle||typeof row.bundle!=='object'||Array.isArray(row.bundle))
        throw Error('party_event_v22_missing_private_replay_bundle');
      // This explicit trust boundary is never allowed to receive client JSON.
      // The v21 adapter revalidates version/identity/flags and v20 executes
      // the independent canonical full-combat verification.
      return row.bundle as PrivatePartyReplayBundleV21;
    },
    async loadCanonicalResourceCatalog(_bundle:PrivatePartyReplayBundleV21) {
      return auditedGreenfieldsPartySuppliesV22();
    },
  };
}
