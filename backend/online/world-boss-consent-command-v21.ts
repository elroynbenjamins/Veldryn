/**
 * World Boss V21 — HIDDEN, private Echo consent publication/withdrawal bridge.
 *
 * No app route imports this module, no server hook mounts it, and no consent
 * or player record is touched unless a future explicitly reviewed backend
 * calls it. A trusted Supabase Auth user lookup MUST derive ownerAccountId.
 * Never accept an account ID, GameState, Echo snapshot or grant revision
 * issued by a client as authority for someone else's account.
 */
import type {WorldBossPgExecutorV19} from './world-boss-private-pg-v19';

export const WORLD_BOSS_V21_CONSENT_LIVE=false as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUEST=/^[A-Za-z0-9_-]{8,128}$/;

export interface WorldBossConsentCommandV21 {
 eventId:string;
 characterId:string;
 requestId:string;
 enabled:boolean;
 expectedRevision:number;
}
export interface WorldBossConsentReceiptV21 {
 eventId:string;
 characterId:string;
 enabled:boolean;
 consentRevision:number;
 repeated:boolean;
}
export interface WorldBossConsentRepositoryV21 {
 setConsent(input:WorldBossConsentCommandV21&{ownerAccountId:string}):
  Promise<WorldBossConsentReceiptV21>;
}
export interface WorldBossConsentServiceV21 {
 /** Verify bearer token against the Auth server, not decoded client claims. */
 authenticate(token:string):Promise<string|null>;
 repository:WorldBossConsentRepositoryV21;
}
function validate(command:WorldBossConsentCommandV21):void{
 if(!command||typeof command!=='object'||Array.isArray(command)||
  Object.keys(command).some(k=>!['eventId','characterId','requestId',
   'enabled','expectedRevision'].includes(k))||
  !UUID.test(command.eventId)||!UUID.test(command.characterId)||
  !REQUEST.test(command.requestId)||typeof command.enabled!=='boolean'||
  !Number.isSafeInteger(command.expectedRevision)||command.expectedRevision<0)
  throw Error('world_boss_v21_invalid_consent_command');
}
function checkedReceipt(receipt:WorldBossConsentReceiptV21,
 command:WorldBossConsentCommandV21):WorldBossConsentReceiptV21{
 if(!receipt||receipt.eventId!==command.eventId||
  receipt.characterId!==command.characterId||
  receipt.enabled!==command.enabled||
  !Number.isSafeInteger(receipt.consentRevision)||
  receipt.consentRevision<1||typeof receipt.repeated!=='boolean')
  throw Error('world_boss_v21_invalid_private_receipt');
 return {eventId:receipt.eventId,characterId:receipt.characterId,
  enabled:receipt.enabled,consentRevision:receipt.consentRevision,
  repeated:receipt.repeated};
}
/** Authenticated private command, intentionally NOT an HTTP handler. */
export async function setAuthenticatedWorldBossConsentV21(input:{
 token:string;command:WorldBossConsentCommandV21;
},deps:WorldBossConsentServiceV21):Promise<WorldBossConsentReceiptV21>{
 if(!deps||typeof deps.authenticate!=='function'||
  typeof deps.repository?.setConsent!=='function')
  throw Error('world_boss_v21_private_service_not_configured');
 if(!input||typeof input.token!=='string'||input.token.length<8||
  input.token.length>8192)
  throw Error('world_boss_v21_auth_required');
 validate(input.command);
 const ownerAccountId=await deps.authenticate(input.token);
 if(typeof ownerAccountId!=='string'||!UUID.test(ownerAccountId))
  throw Error('world_boss_v21_unverified_owner');
 const receipt=await deps.repository.setConsent({...input.command,ownerAccountId});
 return checkedReceipt(receipt,input.command);
}
/** Parameterized DB call, available only from an unexposed private server. */
export function createWorldBossPrivateConsentPgV21(
 pg:WorldBossPgExecutorV19,
):WorldBossConsentRepositoryV21{
 if(!pg||typeof pg.query!=='function')
  throw Error('world_boss_v21_private_pg_required');
 return {
  async setConsent(input){
   validate(input);
   if(!UUID.test(input.ownerAccountId))
    throw Error('world_boss_v21_invalid_private_owner');
   const result=await pg.query<{receipt:WorldBossConsentReceiptV21}>(
    'SELECT private.world_boss_v21_set_consent($1::uuid,$2::uuid,$3::uuid,$4::boolean,$5::bigint,$6::text) AS receipt',
    [input.eventId,input.ownerAccountId,input.characterId,
     input.enabled,input.expectedRevision,input.requestId]);
   if(result.rows.length!==1)
    throw Error('world_boss_v21_missing_private_receipt');
   return checkedReceipt(result.rows[0].receipt,input);
  },
 };
}
