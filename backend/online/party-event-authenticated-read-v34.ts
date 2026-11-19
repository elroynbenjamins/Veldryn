/**
 * Party Events V34 — hidden authenticated READ boundary, not a mounted route.
 *
 * The supplied auth client must be a server-side Supabase Auth client whose
 * getUser(jwt) verifies the bearer with the Auth service. NEVER accept an
 * account ID, JWT claims decoded locally, user_metadata, or client JSON as
 * authorization. The DB reader must use a trusted, private SQL connection.
 *
 * No event mutations, signup, combat, donation, claim or public endpoint.
 */
import {createPrivatePartyStatusReaderV33} from './party-event-readonly-status-v33';
import type {PartyEventReadOnlyStatusV33} from './party-event-readonly-status-v33';

export const PARTY_EVENT_AUTH_READ_V34_RELEASED=false;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BEARER=/^Bearer ([A-Za-z0-9._~-]{20,4096})$/;

export interface VerifiedUserAuthV34 {
 readonly auth:{
  /** Supabase Auth getUser(token), not getSession or unverified JWT decoding. */
  getUser(jwt:string):Promise<{
   data:{user:{id:string}|null}|null;
   error:unknown;
  }>;
 };
}
export interface PartyEventTrustedStatusReaderV34 {
 readForTrustedAccount(accountId:string):Promise<PartyEventReadOnlyStatusV33|null>;
}
export type PrivatePartyEventReadV34=Readonly<{
 kind:'party-event-authenticated-read-v34';
 event:PartyEventReadOnlyStatusV33|null;
 /** Consumers must send Cache-Control: private, no-store on any future route. */
 cachePolicy:'private, no-store';
 claimsEnabled:false;
 donationsEnabled:false;
 combatEnabled:false;
}>;
function unauthorized():never{throw Error('party_event_v34_unauthorized');}

/**
 * Keep the auth verifier and SQL reader server-owned. An eventual HTTP adapter
 * may pass only its Authorization header (not a caller-provided owner UUID).
 * This factory deliberately does not export an HTTP handler.
 */
export function createPrivatePartyAuthenticatedReaderV34(
 authClient:VerifiedUserAuthV34,
 reader:PartyEventTrustedStatusReaderV34,
){
 return {
  async readWithAuthorizationHeader(header:string|null|undefined):Promise<PrivatePartyEventReadV34>{
   if(typeof header!=='string')unauthorized();
   const match=BEARER.exec(header);
   if(!match)unauthorized();
   // Supabase Auth performs remote token validation on every request.
   // No token content is returned or written to logs.
   let accountId:string;
   try{
    const result=await authClient.auth.getUser(match[1]!);
    if(result.error||!result.data?.user?.id||!UUID.test(result.data.user.id))
     unauthorized();
    accountId=result.data.user.id;
   }catch{unauthorized();}
   const event=await reader.readForTrustedAccount(accountId!);
   return {kind:'party-event-authenticated-read-v34',event,
    cachePolicy:'private, no-store',claimsEnabled:false,
    donationsEnabled:false,combatEnabled:false};
  },
 };
}

/** Compile-time contract: the v33 reader is the only backend read dependency. */
export type PartyEventCanonicalStatusReaderV34=
 ReturnType<typeof createPrivatePartyStatusReaderV33>;
