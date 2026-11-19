/**
 * Event chest hidden server-only deterministic roll derivation.
 *
 * Never expose the secret or invoke from a mobile / unauthenticated route.
 * The authoritative private claim transaction MUST persist the first
 * immutable resolution/gear instance so key rotation or storage retry cannot
 * reroll a previously settled chest.
 */
import {createHmac} from 'node:crypto';

export const EVENT_CHEST_SERVER_ROLL_V1_RELEASED=false;
export const EVENT_CHEST_SERVER_ROLL_V1_MODULUS=10000 as const;
export type EventChestDomainV1='party_event_v51'|'world_boss_v58';
export interface EventChestRollPairV1{
 readonly hitRoll:number;
 readonly pieceRoll:number;
 readonly derivation:'hmac_sha256_domain_separated_v1';
}
const WORD_RANGE=0x100000000;
const MAX_UNBIASED=Math.floor(WORD_RANGE/EVENT_CHEST_SERVER_ROLL_V1_MODULUS)*
 EVENT_CHEST_SERVER_ROLL_V1_MODULUS;
const SAFE_KEY=/^[a-z0-9:_-]{20,220}$/;
function boundedDraw(
 secret:Uint8Array,domain:EventChestDomainV1,key:string,label:'hit'|'piece',
):number{
 // Independent domain and label prevent identical rolls across source types.
 // Reject the tiny modulo-bias tail instead of weakening long-run rarity.
 for(let counter=0;counter<32;counter++){
  const digest=createHmac('sha256',Buffer.from(secret))
   .update('veldryn:event-chest:v1\0')
   .update(domain).update('\0')
   .update(key).update('\0')
   .update(label).update('\0')
   .update(String(counter)).digest();
  const word=digest.readUInt32BE(0);
  if(word<MAX_UNBIASED)return word%EVENT_CHEST_SERVER_ROLL_V1_MODULUS;
 }
 throw Error('event_chest_v1_entropy_unavailable');
}
/**
 * Source key must already identify one account + one event + one chest kind.
 * Only a DB-authenticated server should call this after authoritative proof.
 */
export function deriveServerChestRollsV1(input:{
 readonly secret:Uint8Array;
 readonly domain:EventChestDomainV1;
 readonly committedChestKey:string;
}):EventChestRollPairV1{
 if(!(input?.secret instanceof Uint8Array)||
  input.secret.byteLength<32||input.secret.byteLength>512||
  (input.domain!=='party_event_v51'&&input.domain!=='world_boss_v58')||
  typeof input.committedChestKey!=='string'||
  !SAFE_KEY.test(input.committedChestKey)||
  !input.committedChestKey.startsWith(
    input.domain==='party_event_v51'?'party-event:':'world-boss:'))
  throw Error('event_chest_v1_invalid_server_roller_contract');
 return {
  hitRoll:boundedDraw(input.secret,input.domain,input.committedChestKey,'hit'),
  pieceRoll:boundedDraw(input.secret,input.domain,input.committedChestKey,'piece'),
  derivation:'hmac_sha256_domain_separated_v1',
 };
}
