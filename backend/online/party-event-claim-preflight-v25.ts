/**
 * Hidden Party Events v25: service-only parameterized claim preflight adapter.
 *
 * NEVER use an anon/authenticated PostgREST client. The SQL function is
 * private, has no player-facing GRANT, and never credits any account state.
 * The trusted account/character identities must come from server auth.
 */
import type {
  TrustedPartyClaimPreflightRepositoryV25,
  PrivatePartyClaimPreflightV25,
} from '../src/server/party/weekly-party-claim-preflight-v25';

export const PARTY_EVENT_CLAIM_SQL_V25_RELEASED=false;
export const PARTY_EVENT_PREFLIGHT_SQL_V25=
  'select private.prepare_party_event_claim_preflight_v25($1::uuid,$2::uuid,$3::uuid,$4::text) as receipt' as const;

export interface PrivatePartyClaimSqlHandleV25 {
  queryOne(sql:typeof PARTY_EVENT_PREFLIGHT_SQL_V25,
    parameters:readonly [string,string,string,string]):
    Promise<{receipt:unknown}|null>;
}

export function createTrustedPartyClaimPreflightRepositoryV25(
  db:PrivatePartyClaimSqlHandleV25,
):TrustedPartyClaimPreflightRepositoryV25 {
  return {
    async prepareClaimPreflight(input){
      const row=await db.queryOne(PARTY_EVENT_PREFLIGHT_SQL_V25,[
        input.offerId,input.accountId,input.characterId,input.requestId,
      ]);
      if(!row||!row.receipt||typeof row.receipt!=='object'
        ||Array.isArray(row.receipt))
        throw new Error('party_event_v25_missing_private_preflight_receipt');
      return row.receipt as PrivatePartyClaimPreflightV25;
    },
  };
}
