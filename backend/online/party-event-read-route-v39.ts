/**
 * Party Events V39 — release-disabled, unmounted GET-only transport adapter.
 *
 * The future HTTP server passes a method and raw Authorization header only;
 * there is no client-controlled account/party/week selector or public RPC.
 * V34 verifies Supabase Auth remotely, and V33 scopes a single private SQL
 * snapshot to that verified account. Never put a service key in a client.
 */
import {
 createPrivatePartyAuthenticatedReaderV34,
 type VerifiedUserAuthV34,
 type PartyEventTrustedStatusReaderV34,
} from './party-event-authenticated-read-v34';
import type {PartyEventReadOnlyStatusV33} from './party-event-readonly-status-v33';

export const PARTY_EVENT_READ_ROUTE_V39_MOUNTED=false;
type ReadResponseBodyV39=
 |{readonly schema:'party-event-status-http-v39';readonly event:PartyEventReadOnlyStatusV33|null;
   readonly claimsEnabled:false;readonly donationsEnabled:false;readonly combatEnabled:false}
 |{readonly schema:'party-event-status-http-v39';readonly error:'unauthorized'|'method_not_allowed'|'unavailable'};
export interface PrivatePartyReadHttpResponseV39{
 readonly status:200|401|405|503;
 readonly headers:Readonly<{
  'Cache-Control':'private, no-store';
  'Content-Type':'application/json; charset=utf-8';
  Vary:'Authorization';
  'X-Content-Type-Options':'nosniff';
  Allow?:'GET';
 }>;
 readonly body:ReadResponseBodyV39;
}
const BASE_HEADERS={
 'Cache-Control':'private, no-store',
 'Content-Type':'application/json; charset=utf-8',
 Vary:'Authorization',
 'X-Content-Type-Options':'nosniff',
} as const;
const error=(status:401|405|503,reason:'unauthorized'|'method_not_allowed'|'unavailable'):PrivatePartyReadHttpResponseV39=>({
 status,headers:status===405?{...BASE_HEADERS,Allow:'GET'}:BASE_HEADERS,
 body:{schema:'party-event-status-http-v39',error:reason},
});

/**
 * This is only a pure server-side transport boundary: it does not start an
 * HTTP server, mount a route, install SQL or enable writes.
 */
export function createPrivatePartyEventReadHttpAdapterV39(
 auth:VerifiedUserAuthV34, reader:PartyEventTrustedStatusReaderV34,
){
 const verified=createPrivatePartyAuthenticatedReaderV34(auth,reader);
 return {
  async handle(request:Readonly<{method:string;authorization?:string|null}>):Promise<PrivatePartyReadHttpResponseV39>{
   if(request.method!=='GET')return error(405,'method_not_allowed');
   try{
    const result=await verified.readWithAuthorizationHeader(request.authorization);
    return {status:200,headers:BASE_HEADERS,body:{
     schema:'party-event-status-http-v39',event:result.event,
     claimsEnabled:false,donationsEnabled:false,combatEnabled:false,
    }};
   }catch(e){
    // Do not echo JWTs, private SQL, Supabase errors, account IDs or receipt IDs.
    if(e instanceof Error&&e.message==='party_event_v34_unauthorized')
     return error(401,'unauthorized');
    return error(503,'unavailable');
   }
  },
 };
}
