/**
 * V89: HIDDEN Party Event chest concurrency coordinator.
 *
 * PostgreSQL 17 SERIALIZABLE can reject one competing account claim with
 * 40001 even after waiting on V70's account fence. A 40P01 deadlock can also
 * occur when two approved backends share a database.
 *
 * Retry the ENTIRE V69 -> V70 claim call, never a single grant leg. V69 reads
 * any committed frozen receipt before it rolls, so a lost-ACK replay returns
 * the same reward; a rolled-back first attempt never paid. The same private
 * entropy and authenticated immutable request are reused on every attempt.
 *
 * Bounded at three attempts including the first. Non-transaction errors
 * fail immediately; do not catch and reclassify missing proofs, inventory
 * full, bad credentials, EQ2 holds, lock-timeout or unique violations.
 *
 * Not mounted; QA mode only; release flag OFF.
 */
import type {
 ChestOpenRequestV69,ChestOpenResultV69,
} from '../loot/chest-reward-settlement-v69';

export const PARTY_EVENT_CLAIM_RETRY_V89_RELEASED=false;
export const PARTY_EVENT_CLAIM_RETRY_V89_VERSION='party-event-claim-retry-v89' as const;
export const PARTY_EVENT_CLAIM_MAX_ATTEMPTS_V89=3 as const;

type ChestOpenerV89=(request:ChestOpenRequestV69)=>
 Promise<ChestOpenResultV69>;

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const PARTY_SOURCE=/^party-event:\d{13}:[0-9a-f-]{36}:(?:participation|preparation|finale)$/;

function validateRequest(request:ChestOpenRequestV69):void{
 if(!request||typeof request.authenticatedAccountId!=='string'||
  !UUID.test(request.authenticatedAccountId)||
  typeof request.sourceKey!=='string'||!PARTY_SOURCE.test(request.sourceKey)||
  request.sourceKey.split(':'+request.authenticatedAccountId+':').length!==2)
  throw Error('party_event_v89_invalid_authenticated_source');
}

function retryableTransactionError(error:unknown):boolean{
 // Never use error.message/HTTP status; only PostgreSQL SQLSTATE codes
 // from the trusted DB driver. Do not retry server-side game policy errors.
 return !!error&&typeof error==='object'&&
  'code' in error&&
  (error.code==='40001'||error.code==='40P01');
}

export function createPartyEventClaimRetryV89(
 open:ChestOpenerV89,qaEnabled=false,
):ChestOpenerV89{
 if(!qaEnabled||PARTY_EVENT_CLAIM_RETRY_V89_RELEASED||
  process.env.NODE_ENV==='production')
  throw Error('party_event_v89_unreleased');
 if(typeof open!=='function')
  throw Error('party_event_v89_missing_private_settler');
 return async request=>{
  if(process.env.NODE_ENV==='production')
   throw Error('party_event_v89_unreleased');
  // Capture the authenticated identity once; readonly TypeScript fields do
  // not prevent the original caller from mutating a JS object during await.
  const frozenRequest:ChestOpenRequestV69=Object.freeze({
   authenticatedAccountId:request?.authenticatedAccountId,
   sourceKey:request?.sourceKey,
  });
  validateRequest(frozenRequest);
  for(let attempt=1;attempt<=PARTY_EVENT_CLAIM_MAX_ATTEMPTS_V89;attempt++){
   if(process.env.NODE_ENV==='production')
    throw Error('party_event_v89_unreleased');
   try{
    return await open(frozenRequest);
   }catch(error){
    if(attempt===PARTY_EVENT_CLAIM_MAX_ATTEMPTS_V89||
     !retryableTransactionError(error))throw error;
    // Intentionally no asynchronous delay, timer or event subscription:
    // V70's database fence and transaction isolation remain the authority.
    // The next pass creates a fresh DB transaction / connection.
   }
  }
  throw Error('party_event_v89_retry_exhausted');
 };
}
