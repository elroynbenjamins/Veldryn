/**
 * Hidden Party Events v25. The caller must provide an internal PostgreSQL
 * service connection. DO NOT expose these RPCs through public HTTP.
 * Identity must come from verified session, not client-supplied account ID.
 */
import type {
  TrustedPrivateClaimIntentsRepositoryV25,
  PrivateClaimIntentReceiptV25,PrivateClaimIntentInboxV25,
} from '../src/server/party/weekly-party-claim-intents-v25';
import type {PartyEventRewardBundle} from '../src/server/party/weekly-party-rewards-v2';

export const PARTY_EVENT_CLAIM_SQL_V25_RELEASED=false;
export const PARTY_EVENT_CLAIM_QUOTE_SQL_V25=
 'select private.party_event_reward_quote_v25($1::uuid,$2::uuid) as result' as const;
export const PARTY_EVENT_PREPARE_INTENT_SQL_V25=
 'select private.prepare_party_event_claim_intent_v25($1::uuid,$2::uuid,$3::text) as result' as const;
export const PARTY_EVENT_CLAIM_INBOX_SQL_V25=
 'select private.party_event_claim_intents_inbox_v25($1::uuid) as result' as const;
type QueryV25=typeof PARTY_EVENT_CLAIM_QUOTE_SQL_V25
 |typeof PARTY_EVENT_PREPARE_INTENT_SQL_V25|typeof PARTY_EVENT_CLAIM_INBOX_SQL_V25;
export interface TrustedPartyClaimSqlHandleV25 {
 queryOne(sql:QueryV25,params:readonly string[]):Promise<{result:unknown}|null>;
}
function onlyObject<T>(row:{result:unknown}|null):T {
  if(!row||row.result===null||typeof row.result!=='object'
    ||Array.isArray(row.result))throw Error('party_event_v25_private_result_missing');
  return row.result as T;
}
export function createPrivatePartyClaimRepositoryV25(
 db:TrustedPartyClaimSqlHandleV25
):TrustedPrivateClaimIntentsRepositoryV25{
 return {
  async quoteOffer(offerId,trustedAccountId){
   return onlyObject<PartyEventRewardBundle>(
    await db.queryOne(PARTY_EVENT_CLAIM_QUOTE_SQL_V25,
     [offerId,trustedAccountId]));
  },
  async reserveIntent(offerId,trustedAccountId,requestId){
   return onlyObject<PrivateClaimIntentReceiptV25>(
    await db.queryOne(PARTY_EVENT_PREPARE_INTENT_SQL_V25,
     [offerId,trustedAccountId,requestId]));
  },
  async readInbox(trustedAccountId){
   return onlyObject<PrivateClaimIntentInboxV25>(
    await db.queryOne(PARTY_EVENT_CLAIM_INBOX_SQL_V25,[trustedAccountId]));
  },
 };
}
