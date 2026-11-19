/**
 * Party Events V40 — current-week read guard for the unmounted V39 route.
 *
 * The V33 SQL intentionally reads the newest account-scoped enrollment.
 * It is not by itself a CURRENT event selector: old active rows can remain.
 * This guard constrains that view to the seven-day adventure and Day 8
 * read-only results window. It cannot start events or grant claims.
 */
import {
 parsePartyEventReadOnlyStatusV33,
 type PartyEventReadOnlyStatusV33,
} from './party-event-readonly-status-v33';
import type {PartyEventTrustedStatusReaderV34} from './party-event-authenticated-read-v34';

export const PARTY_EVENT_CURRENT_READ_V40_RELEASED=false;
export const PARTY_EVENT_DAY8_READ_WINDOW_MS_V40=86_400_000;
const HOUR_MS=3_600_000;
const CLOCK_PAST_TOLERANCE_MS=120_000;
const CLOCK_FUTURE_TOLERANCE_MS=30_000;

/** Never trust a client clock, client event week or caller-supplied identity. */
export function checkPartyEventCurrentStatusV40(
 raw:unknown, trustedServerNowMs:number,
):PartyEventReadOnlyStatusV33|null{
 if(!Number.isSafeInteger(trustedServerNowMs)||trustedServerNowMs<=0)
  throw Error('party_event_v40_untrusted_server_clock');
 const status=parsePartyEventReadOnlyStatusV33(raw);
 const databaseNow=Date.parse(status.serverTime);
 if(!Number.isFinite(databaseNow)||
  trustedServerNowMs-databaseNow>CLOCK_PAST_TOLERANCE_MS||
  databaseNow-trustedServerNowMs>CLOCK_FUTURE_TOLERANCE_MS)
  throw Error('party_event_v40_stale_database_status');
 const begins=Date.parse(status.eventStartsAt);
 const ends=Date.parse(status.eventEndsAt);
 // Do not expose historical or future enrollment as today's adventure.
 // A past event's final claim is a separate Inbox concern.
 if(trustedServerNowMs<begins||trustedServerNowMs>=ends+PARTY_EVENT_DAY8_READ_WINDOW_MS_V40)
  return null;
 if(trustedServerNowMs<ends){
  if(status.status!=='active')
   throw Error('party_event_v40_premature_event_closure');
 }else{
  if(status.status==='active')
   throw Error('party_event_v40_unclosed_expired_event');
  if(status.status==='settled'&&trustedServerNowMs<ends+HOUR_MS)
   throw Error('party_event_v40_settlement_before_day8');
 }
 return status;
}

/** This server-only adapter remains read-only and does not add any SQL calls. */
export function createPartyEventCurrentStatusReaderV40(
 reader:PartyEventTrustedStatusReaderV34,
 trustedServerNowMs:()=>number=()=>Date.now(),
):PartyEventTrustedStatusReaderV34{
 return {
  async readForTrustedAccount(trustedAccountId:string){
   const event=await reader.readForTrustedAccount(trustedAccountId);
   return event===null?null:checkPartyEventCurrentStatusV40(event,trustedServerNowMs());
  },
 };
}
