/**
 * Hidden Party Events v24: parameterized private SQL reward offer adapter.
 *
 * Private server connection only. No mobile, REST or direct player SQL calls.
 * An authenticated server action must resolve the user's account identity
 * before passing trustedAccountId to choice/read methods.
 */
import type {
  TrustedPartyRewardOfferRepositoryV24,
  PrivatePartyPreparedOffersV24,PrivatePartyLockedChoiceV24,
  PrivatePartyRewardInboxV24,
} from '../src/server/party/weekly-party-reward-offers-v24';
import type {PartyEventCacheChoice} from '../src/server/party/weekly-party-rewards-v2';

export const PARTY_EVENT_REWARD_SQL_ADAPTER_V24_RELEASED=false;
export const PARTY_EVENT_PREPARE_OFFERS_SQL_V24=
  'select private.prepare_party_event_reward_offers_v24($1::uuid,$2::text) as result' as const;
export const PARTY_EVENT_LOCK_CHOICE_SQL_V24=
  'select private.lock_party_event_reward_choice_v24($1::uuid,$2::uuid,$3::text,$4::text) as result' as const;
export const PARTY_EVENT_INBOX_PREVIEW_SQL_V24=
  'select private.party_event_reward_inbox_preview_v24($1::uuid) as result' as const;
type PrivateSqlV24=typeof PARTY_EVENT_PREPARE_OFFERS_SQL_V24
  |typeof PARTY_EVENT_LOCK_CHOICE_SQL_V24
  |typeof PARTY_EVENT_INBOX_PREVIEW_SQL_V24;
export interface PrivatePartyRewardSqlHandleV24 {
  queryOne(sql:PrivateSqlV24,params:readonly (string|number)[]):
    Promise<{result:unknown}|null>;
}
function result<T>(row:{result:unknown}|null):T {
  if(!row||row.result===null||typeof row.result!=='object'
    ||Array.isArray(row.result))
    throw new Error('party_event_v24_missing_private_sql_result');
  return row.result as T;
}
export function createTrustedPartyRewardRepositoryV24(
  db:PrivatePartyRewardSqlHandleV24,
):TrustedPartyRewardOfferRepositoryV24 {
  return {
    async prepareOffers(reservationId:string,requestId:string){
      return result<PrivatePartyPreparedOffersV24>(
        await db.queryOne(PARTY_EVENT_PREPARE_OFFERS_SQL_V24,
          [reservationId,requestId]));
    },
    async lockChoice(offerId:string,trustedAccountId:string,
      choice:PartyEventCacheChoice,requestId:string){
      return result<PrivatePartyLockedChoiceV24>(
        await db.queryOne(PARTY_EVENT_LOCK_CHOICE_SQL_V24,
          [offerId,trustedAccountId,choice,requestId]));
    },
    async readInboxPreview(trustedAccountId:string){
      return result<PrivatePartyRewardInboxV24>(
        await db.queryOne(PARTY_EVENT_INBOX_PREVIEW_SQL_V24,
          [trustedAccountId]));
    },
  };
}
