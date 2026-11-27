/** V95A source reconciliation on the existing V58/V59 reward branch.
 * Never promote a local V91–V94 rehearsal into a committed V28 proof.
 * Only independent, persisted canonical settlement evidence can be compared.
 * This module is a nonpaying compatibility review, not a reward authority. */
import {resolveWorldBossChestEvidenceV59,type WorldBossCanonicalChestReadV59} from './world-boss-chest-proof-v59';
import {previewVerifiedWorldBossChestsV58} from './world-boss-chests-v58';
export const WORLD_BOSS_V95_REWARD_HANDOFF_LIVE=false as const;
const hash=(x:unknown):x is string=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export interface WorldBossV95SettledAttemptReview{
 readonly eventId:string;readonly accountId:string;readonly requestId:string;
 readonly ordinal:number;readonly bossId:WorldBossCanonicalChestReadV59['event']['bossId'];
 readonly engineVersion:'canonical-combat-v2';
 readonly settlementStatus:'committed';
 readonly bindingDigest:string;readonly replayDigest:string;
 readonly settlementReceiptDigest:string;
 readonly localHpDamage:number;readonly committedGlobalHpDamage:number;
}
export function reviewWorldBossRewardHandoffV95(
 canonical:WorldBossCanonicalChestReadV59,
 receipts:readonly WorldBossV95SettledAttemptReview[],
 verifyPersisted:(receipt:WorldBossV95SettledAttemptReview)=>boolean,
){
 const evidence=resolveWorldBossChestEvidenceV59(canonical);
 if(!Array.isArray(receipts)||receipts.length>3||typeof verifyPersisted!=='function')
  throw Error('world_boss_v95_invalid_receipts');
 const verified=canonical.attacks.filter(a=>a.status==='committed'&&a.replayProof==='verified');
 if(receipts.length!==verified.length)throw Error('world_boss_v95_missing_settlement');
 const rows:readonly WorldBossV95SettledAttemptReview[]=receipts;
 const requests=new Set<string>(),replays=new Set<string>(),settlements=new Set<string>();
 for(const row of rows){
  if(!row||row.eventId!==canonical.eventId||row.accountId!==canonical.accountId||
   row.bossId!==canonical.event.bossId||row.engineVersion!=='canonical-combat-v2'||
   row.settlementStatus!=='committed'||!hash(row.bindingDigest)||!hash(row.replayDigest)||
   !hash(row.settlementReceiptDigest)||requests.has(row.requestId)||replays.has(row.replayDigest)||
   settlements.has(row.settlementReceiptDigest)||
   !Number.isFinite(row.localHpDamage)||row.localHpDamage<0||row.localHpDamage>1e12||
   !Number.isSafeInteger(row.committedGlobalHpDamage)||row.committedGlobalHpDamage<0||
   row.committedGlobalHpDamage>row.localHpDamage||
   !verified.some(a=>a.requestId===row.requestId&&a.ordinal===row.ordinal))
   throw Error('world_boss_v95_settlement_mismatch');
  // Caller must independently reload the immutable V28-compatible receipt
  // and canonical V2 replay proof on the same pinned private DB connection.
  // A positive callback is not itself an authentication or payout.
  const snapshot=JSON.stringify(row);
  if(verifyPersisted(row)!==true||JSON.stringify(row)!==snapshot)
   throw Error('world_boss_v95_unverified_settlement');
  requests.add(row.requestId);replays.add(row.replayDigest);settlements.add(row.settlementReceiptDigest);
 }
 const previews=previewVerifiedWorldBossChestsV58(evidence);
 return {previews,verifiedAttempts:verified.length,
  sigilPolicy:'reuse_v28_ledger_only' as const,impactEnabled:false as const,
  rewardAuthorized:false as const,claimEnabled:false as const,
  globalHpCredited:0 as const,releaseReady:false as const};
}
