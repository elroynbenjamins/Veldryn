/**
 * Hidden Party Events v25 — only a private, server-owned, parameterized
 * SQL interface. This adapter cannot award gold, XP, materials or any
 * account currency and cannot be exposed to the mobile app.
 */
import type {
  TrustedPartyRewardClaimQuoteRepositoryV25,
  PartyRewardClaimQuoteV25,PartyRewardQuoteInboxV25,
} from '../src/server/party/weekly-party-reward-claim-v25';

export const PARTY_EVENT_CLAIM_SQL_V25_RELEASED=false;
export const PARTY_EVENT_PREPARE_CLAIM_QUOTE_SQL_V25=
  'select private.prepare_party_event_claim_quote_v25($1::uuid,$2::uuid,$3::uuid,$4::text) as result' as const;
export const PARTY_EVENT_CLAIM_QUOTE_INBOX_SQL_V25=
  'select private.party_event_claim_quote_inbox_v25($1::uuid) as result' as const;
type PrivateClaimQuoteSqlV25=
  typeof PARTY_EVENT_PREPARE_CLAIM_QUOTE_SQL_V25
  |typeof PARTY_EVENT_CLAIM_QUOTE_INBOX_SQL_V25;
export interface PrivatePartyClaimQuoteSqlHandleV25 {
  queryOne(sql:PrivateClaimQuoteSqlV25,params:readonly string[]):
    Promise<{result:unknown}|null>;
}
function valid<T>(row:{result:unknown}|null):T {
  if(!row||!row.result||typeof row.result!=='object'
    ||Array.isArray(row.result))
    throw new Error('party_event_v25_missing_private_claim_quote');
  return row.result as T;
}
export function createTrustedPartyClaimQuoteRepositoryV25(
  db:PrivatePartyClaimQuoteSqlHandleV25,
):TrustedPartyRewardClaimQuoteRepositoryV25{
  return {
    async prepareClaimQuote(offerId,accountId,characterId,requestId){
      return valid<PartyRewardClaimQuoteV25>(await db.queryOne(
        PARTY_EVENT_PREPARE_CLAIM_QUOTE_SQL_V25,
        [offerId,accountId,characterId,requestId],
      ));
    },
    async readClaimQuoteInbox(accountId){
      return valid<PartyRewardQuoteInboxV25>(await db.queryOne(
        PARTY_EVENT_CLAIM_QUOTE_INBOX_SQL_V25,[accountId],
      ));
    },
  };
}
