/**
 * V59 hidden World Boss milestone evidence bridge.
 *
 * Private read-model only. A future DB adapter MUST derive each row from
 * V27 committed War Camp donations, V26/V28 committed + replay-proven attacks,
 * and V18 authoritative global HP, scoped to the authenticated account/event.
 * No mobile counter, boss, roster, inventory or replay proof is accepted.
 * There is deliberately no insert, award, open, purchase or API route here.
 */
import {
 previewVerifiedWorldBossChestsV58,
 type VerifiedWorldBossChestEvidenceV58,
 type WorldBossChestPreviewV58,
} from './world-boss-chests-v58';
import type {WorldBossRotatingIdV50} from './world-boss-weekend-v22';

export const WORLD_BOSS_CHEST_PROOF_V59_LIVE=false as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQUEST=/^[A-Za-z0-9_-]{8,128}$/;
const BOSS_IDS:readonly string[]=['hollowroot','sunscar','frostmarch'];
type Track='fortifications'|'fieldProvisions'|'siegecraft';
export interface WorldBossCanonicalChestReadV59{
 readonly eventId:string;
 readonly accountId:string;
 readonly event:{readonly bossId:WorldBossRotatingIdV50;
  readonly initialHp:number;readonly remainingHp:number};
 readonly warCamp:{
  readonly eventId:string;
  readonly trackTiers:Readonly<Record<Track,number>>;
  readonly ownDonationReceipts:readonly {
   readonly eventId:string;readonly accountId:string;
   readonly requestId:string;readonly status:'committed'|'voided';
  }[];
 };
 readonly attacks:readonly {
  readonly eventId:string;readonly accountId:string;
  readonly ordinal:number;readonly requestId:string;
  readonly status:'reserved'|'committed'|'voided';
  /** Verified ONLY if V28 DB has a committed immutable-replay proof receipt. */
  readonly replayProof:'verified'|'pending'|'absent';
 }[];
}
function bad():never{throw Error('world_boss_v59_untrusted_private_evidence');}
function uuid(x:unknown):x is string{
 return typeof x==='string'&&UUID.test(x);
}
function hp(x:unknown):x is number{
 return Number.isSafeInteger(x)&&typeof x==='number'&&x>=0&&x<=1_000_000_000_000;
}
/** Fail closed on schema drift, cross-account rows, retries and partial replay. */
export function resolveWorldBossChestEvidenceV59(
 row:WorldBossCanonicalChestReadV59,
):VerifiedWorldBossChestEvidenceV58{
 if(!row||!uuid(row.accountId)||!uuid(row.eventId)||!row.event||
  !BOSS_IDS.includes(row.event.bossId)||!hp(row.event.initialHp)||
  row.event.initialHp===0||!hp(row.event.remainingHp)||
  row.event.remainingHp>row.event.initialHp||!row.warCamp||
  row.warCamp.eventId!==row.eventId||!row.warCamp.trackTiers||
  !Array.isArray(row.warCamp.ownDonationReceipts)||
  row.warCamp.ownDonationReceipts.length>2||
  !Array.isArray(row.attacks)||row.attacks.length>12)bad();
 const tracks:readonly Track[]=['fortifications','fieldProvisions','siegecraft'];
 if(Object.keys(row.warCamp.trackTiers).length!==3||
  tracks.some(t=>!Number.isSafeInteger(row.warCamp.trackTiers[t])||
   row.warCamp.trackTiers[t]<0||row.warCamp.trackTiers[t]>2))bad();
 const donationKeys=new Set<string>();
 let donations=0;
 for(const d of row.warCamp.ownDonationReceipts){
  if(!d||d.eventId!==row.eventId||d.accountId!==row.accountId||
   !REQUEST.test(d.requestId)||donationKeys.has(d.requestId)||
   !['committed','voided'].includes(d.status))bad();
  donationKeys.add(d.requestId);
  if(d.status==='committed')donations++;
 }
 const attempts=new Set<string>(),committedOrdinals=new Set<number>();
 let completed=0;
 for(const a of row.attacks){
  if(!a||a.eventId!==row.eventId||a.accountId!==row.accountId||
   !REQUEST.test(a.requestId)||attempts.has(a.requestId)||
   !Number.isSafeInteger(a.ordinal)||a.ordinal<1||a.ordinal>3||
   !['reserved','committed','voided'].includes(a.status)||
   !['verified','pending','absent'].includes(a.replayProof)||
   (a.status!=='committed'&&a.replayProof==='verified'))bad();
  attempts.add(a.requestId);
  if(a.status==='committed'){
   if(committedOrdinals.has(a.ordinal))bad();
   committedOrdinals.add(a.ordinal);
   if(a.replayProof==='verified')completed++;
  }
 }
 if(donations>2||completed>3)bad();
 return {
  eventId:row.eventId,accountId:row.accountId,bossId:row.event.bossId,
  preparationGoalCompleted:tracks.filter(t=>row.warCamp.trackTiers[t]>=1).length>=2,
  personalCommittedDonations:donations,
  committedAttempts:completed,
  communityDamageGoalCompleted:
   row.event.remainingHp*10<=row.event.initialHp*3,
  personalProvenAttacks:completed,
 };
}
export interface WorldBossChestProofDepsV59{
 /** Must resolve the account from a verified Supabase Auth identity. */
 authenticate(token:string):Promise<string|null>;
 /** This query must scope and verify every source row inside private DB. */
 readCanonical(eventId:string,accountId:string):
  Promise<WorldBossCanonicalChestReadV59>;
}
/**
 * Read-only view. The public selection is an eventId, NEVER a claimed boss,
 * donation count, HP percentage, owned piece, attack outcome or account ID.
 */
export async function previewAuthenticatedWorldBossChestsV59(
 input:{token:string;eventId:string},deps:WorldBossChestProofDepsV59,
):Promise<readonly WorldBossChestPreviewV58[]>{
 if(!uuid(input?.eventId)||typeof input?.token!=='string'||
  input.token.length<8||input.token.length>8192||
  !deps||typeof deps.authenticate!=='function'||
  typeof deps.readCanonical!=='function')
  throw Error('world_boss_v59_auth_required');
 const accountId=await deps.authenticate(input.token);
 if(!uuid(accountId))throw Error('world_boss_v59_auth_required');
 const canonical=await deps.readCanonical(input.eventId,accountId);
 if(canonical?.accountId!==accountId||canonical?.eventId!==input.eventId)bad();
 return previewVerifiedWorldBossChestsV58(resolveWorldBossChestEvidenceV59(canonical));
}
