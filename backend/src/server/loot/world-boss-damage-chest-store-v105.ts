/** Private, nonpaying V105 damage chest accrual. Must execute on one
 * transaction; no committed V2 producer or approved policy writer here.
 * Threshold and entropy version are read from immutable server policy. */
import type {ChestSqlV70} from './chest-postgres-store-v70';
import {assertWorldBossChestWriteOpenV73,readCanonicalWorldBossChestV73} from './world-boss-chest-pg-source-v73';
import {readWorldBossAttemptVerifierV104} from './world-boss-chest-source-v104';
import {reviewWorldBossDamageChestsV97,type DamageChestPolicyV97,type DamageChestRollV97} from '../combat/world-boss-damage-chest-review-v97';
import type {WorldBossV95SettledAttemptReview} from '../combat/world-boss-v95-reward-handoff-review';
import {gatheringSnapshotDigestV100} from '../combat/world-boss-gathering-snapshot-v100';
export const WORLD_BOSS_DAMAGE_STORE_V105_LIVE=false as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
type Row=Record<string,unknown>;
const number=(v:unknown)=>{const n=typeof v==='string'&&/^\d+$/.test(v)?Number(v):v;if(typeof n!=='number'||!Number.isSafeInteger(n)||n<0||n>1e12)throw Error('world_boss_v105_invalid_integer');return n;};
export async function accrueWorldBossDamageChestsV105(tx:ChestSqlV70,input:{
 accountId:string;eventId:string;
 readVerifiedCanonicalAttempts:(tx:ChestSqlV70,eventId:string,accountId:string)=>Promise<readonly WorldBossV95SettledAttemptReview[]>;
 readVersionedSecret:(version:string)=>Uint8Array;
},qaEnabled=false){
 if(!qaEnabled||WORLD_BOSS_DAMAGE_STORE_V105_LIVE||process.env.NODE_ENV==='production')throw Error('world_boss_v105_unreleased');
 const {accountId,eventId}=input;
 if(!UUID.test(accountId)||!UUID.test(eventId)||typeof input.readVerifiedCanonicalAttempts!=='function'||typeof input.readVersionedSecret!=='function')
  throw Error('world_boss_v105_invalid_scope');
 // Same order as V70. The caller must own BEGIN READ COMMITTED and rollback.
 await assertWorldBossChestWriteOpenV73(tx,accountId,'world-boss:'+eventId+':'+accountId+':donations_goal');
 await tx.query('INSERT INTO private.chest_account_fence_v70(account_id) SELECT id FROM auth.users WHERE id=$1::uuid ON CONFLICT DO NOTHING',[accountId]);
 const locks=(await tx.query<{account_id:string}>('SELECT account_id::text AS account_id FROM private.chest_account_fence_v70 WHERE account_id=$1::uuid FOR UPDATE',[accountId])).rows;
 if(locks.length!==1||locks[0].account_id!==accountId)throw Error('world_boss_v105_account_missing');
 const rows=(await tx.query<Row>('SELECT event_id::text AS event_id,account_id::text AS account_id,boss_id,bracket_id,revision,damage_per_roll,entropy_version FROM private.world_boss_damage_policy_v105 WHERE event_id=$1::uuid AND account_id=$2::uuid FOR UPDATE',[eventId,accountId])).rows;
 if(rows.length!==1||rows[0].event_id!==eventId||rows[0].account_id!==accountId)throw Error('world_boss_v105_policy_not_frozen');
 const p=rows[0],canonical=await readCanonicalWorldBossChestV73(tx,eventId,accountId);
 if(p.boss_id!==canonical.event.bossId||typeof p.bracket_id!=='string'||typeof p.entropy_version!=='string')throw Error('world_boss_v105_policy_mismatch');
 const policy:DamageChestPolicyV97={eventId,accountId,bossId:canonical.event.bossId,bracketId:p.bracket_id,revision:number(p.revision),damagePerRoll:number(p.damage_per_roll),entropyVersion:p.entropy_version};
 const readHistory=async():Promise<DamageChestRollV97[]>=>{
  const history=(await tx.query<Row>('SELECT ordinal,threshold_damage,roll,hit,source_key FROM private.world_boss_damage_rolls_v105 WHERE event_id=$1::uuid AND account_id=$2::uuid ORDER BY ordinal',[eventId,accountId])).rows;
  return history.map(row=>{
   if(typeof row.hit!=='boolean'||typeof row.source_key!=='string')throw Error('world_boss_v105_invalid_history');
   return {ordinal:number(row.ordinal),thresholdDamage:number(row.threshold_damage),roll:number(row.roll),hit:row.hit,sourceKey:row.source_key};
  });
 };
 const previous=await readHistory();
 const receipts=await input.readVerifiedCanonicalAttempts(tx,eventId,accountId);
 const verify=await readWorldBossAttemptVerifierV104(tx,eventId,accountId,receipts);
 const digest=gatheringSnapshotDigestV100(policy);
 const result=reviewWorldBossDamageChestsV97({canonical,receipts,policy,previous,secret:input.readVersionedSecret(policy.entropyVersion),
 verifyPersistedAttempt:verify,verifyFrozenPolicy:row=>gatheringSnapshotDigestV100(row)===digest});
 for(const roll of result.newRolls)await tx.query('INSERT INTO private.world_boss_damage_rolls_v105(event_id,account_id,ordinal,threshold_damage,roll,hit,source_key) VALUES($1,$2,$3,$4,$5,$6,$7)',
 [eventId,accountId,roll.ordinal,roll.thresholdDamage,roll.roll,roll.hit,roll.sourceKey]);
 if(gatheringSnapshotDigestV100(await readHistory())!==gatheringSnapshotDigestV100(result.rolls))throw Error('world_boss_v105_history_readback_mismatch');
 return {...result,policy,earnedSourceKeys:result.rolls.filter(x=>x.hit).map(x=>x.sourceKey),
 persistedInCallerTransaction:true as const,committed:false as const,claimEnabled:false as const};
}
