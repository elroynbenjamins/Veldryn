/**
 * PRIVATE, UNMOUNTED Combat 2.0 solo reward store.
 *
 * PostgreSQL client MUST be a single pinned, privileged server connection.
 * Every grant writer and Inbox writer receives that SAME connection, never
 * a URL, service-role REST RPC, background queue, or its own connection.
 *
 * SQL ledger schema is REVIEW ONLY until release approval. At present this
 * adapter fails closed on missing tables/writers and cannot mint live rewards.
 */
import {enemyV2SnapshotDigest} from './enemy-engine-authority';
import type {TrustedSoloIdentityV2} from './solo-encounter-persistence';
import type {
 SoloRewardReceiptV2,SoloRewardGrantV2,SoloRewardSettlementStoreV2,
} from './solo-reward-settlement';

export interface CombatV2SqlQueryResult<Row> { readonly rows:readonly Row[]; }
export interface CombatV2RewardSqlTransaction {
 query<Row=Record<string,unknown>>(sql:string,params?:readonly unknown[]):Promise<CombatV2SqlQueryResult<Row>>;
}
export interface CombatV2PinnedSqlClient extends CombatV2RewardSqlTransaction {
 release():void;
}
export interface CombatV2SqlPool {
 connect():Promise<CombatV2PinnedSqlClient>;
}
export interface CombatV2RewardGrantWriteProof {
 readonly grantSourceId:string;
 readonly kind:SoloRewardGrantV2['kind'];
 readonly resourceId:string;
 readonly amount:number;
}
export interface CombatV2RewardInboxWriteProof {
 readonly sourceKey:string;
 readonly accountId:string;
 readonly characterId:string;
}
export interface CombatV2RewardWriters {
 /** Implement with audited transaction-local source-unique grant ledgers.
  * Each call must return the exact durable grant-source write/readback proof.
  * Any error or missing proof MUST rollback; never silently succeed. */
 applyGrant(tx:CombatV2RewardSqlTransaction,scope:TrustedSoloIdentityV2,
  grant:SoloRewardGrantV2):Promise<CombatV2RewardGrantWriteProof>;
 /** Exactly one Inbox message under receipt.sourceKey, in the SAME transaction. */
 appendInbox(tx:CombatV2RewardSqlTransaction,scope:TrustedSoloIdentityV2,
  receipt:SoloRewardReceiptV2):Promise<CombatV2RewardInboxWriteProof>;
}
export interface CombatV2RewardSqlStoreDeps {
 readonly pool:CombatV2SqlPool;
 readonly writers:CombatV2RewardWriters;
 /** Explicitly server-approved policy versions; no implicit defaults. */
 readonly approvedPolicyIds:readonly string[];
}
interface LockedSnapshotRow {
 readonly account_id:string; readonly character_id:string;
 readonly snapshot_digest:string;readonly payload:unknown;
}
interface LockedRewardRow {readonly receipt:SoloRewardReceiptV2;}
const identifier=(x:unknown):x is string=>typeof x==='string'&&x.length>0&&
 x.length<=128&&/^[a-zA-Z0-9:_-]+$/.test(x);
const sha=(x:unknown):x is string=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const fail=(reason:string):never=>{throw Error('combat_v2_reward_sql_'+reason);};
const clone=<T>(x:T):T=>JSON.parse(JSON.stringify(x)) as T;
function validateReceipt(scope:TrustedSoloIdentityV2,receipt:SoloRewardReceiptV2){
 if(!receipt||receipt.schemaVersion!==1||
  receipt.encounterId!==scope.encounterId||
  receipt.accountId!==scope.accountId||
  receipt.characterId!==scope.characterId||
  receipt.sourceKey!=='combat-v2:solo:'+scope.encounterId||
  !identifier(receipt.policyId)||
  !sha(receipt.snapshotDigest)||!sha(receipt.outcomeDigest)||
  !sha(receipt.grantDigest)||!sha(receipt.receiptDigest)||
  !Array.isArray(receipt.grants)||receipt.grants.length<1||receipt.grants.length>32)
  fail('invalid_receipt');
 const {receiptDigest,...body}=receipt;
 if(enemyV2SnapshotDigest(body)!==receiptDigest||
  enemyV2SnapshotDigest(receipt.grants)!==receipt.grantDigest)
  fail('invalid_digest');
 const unique=new Set<string>();
 receipt.grants.forEach((g,i)=>{
  if(!g||!['gold','skill_xp','companion_essence','material'].includes(g.kind)||
   !identifier(g.resourceId)||!Number.isSafeInteger(g.amount)||g.amount<1||
   g.grantSourceId!==receipt.sourceKey+':'+i)
   fail('invalid_grant');
  const key=g.kind+':'+g.resourceId;
  if(unique.has(key))fail('duplicate_grant');
  unique.add(key);
 });
}
function validateScope(scope:TrustedSoloIdentityV2){
 if(!scope||!identifier(scope.encounterId)||
  !identifier(scope.accountId)||!identifier(scope.characterId))
  fail('invalid_scope');
}
function checkSnapshot(scope:TrustedSoloIdentityV2,row:LockedSnapshotRow|undefined,
 receipt:SoloRewardReceiptV2){
 if(!row)fail('snapshot_missing');
 if(row.account_id!==scope.accountId||row.character_id!==scope.characterId||
  row.snapshot_digest!==receipt.snapshotDigest||
  !row.payload||typeof row.payload!=='object'||
  (row.payload as {snapshotDigest?:string}).snapshotDigest!==receipt.snapshotDigest)
  fail('snapshot_provenance_conflict');
}
const SELECT_SNAPSHOT=
`select account_id::text as account_id, character_id::text as character_id,
        snapshot_digest,payload
   from private.combat_v2_solo_snapshots_v1
  where encounter_id=$1 for update`;
const SELECT_EXISTING=
`select receipt from private.combat_v2_solo_reward_receipts_v1
  where encounter_id=$1 for update`;
const SELECT_READ=
`select r.receipt from private.combat_v2_solo_reward_receipts_v1 r
  join private.combat_v2_solo_snapshots_v1 s
    on s.encounter_id=r.encounter_id
 where r.encounter_id=$1 and r.account_id=$2::uuid
   and r.character_id=$3::uuid
   and s.account_id=$2::uuid and s.character_id=$3::uuid`;
const INSERT_RECEIPT=
`insert into private.combat_v2_solo_reward_receipts_v1
 (encounter_id,account_id,character_id,source_key,snapshot_digest,
  outcome_digest,grant_digest,receipt_digest,policy_id,receipt)
 values ($1,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9,$10::jsonb)`;
/** Pinned transaction. Never implement this with sequential Supabase REST RPCs. */
export function transactionalSoloRewardStoreV2(
 deps:CombatV2RewardSqlStoreDeps,
):SoloRewardSettlementStoreV2{
 if(!deps?.pool||typeof deps.pool.connect!=='function'||
  !deps.writers||typeof deps.writers.applyGrant!=='function'||
  typeof deps.writers.appendInbox!=='function'||
  !Array.isArray(deps.approvedPolicyIds)||!deps.approvedPolicyIds.length||
  deps.approvedPolicyIds.some(value=>!identifier(value)))
  fail('missing_approved_transaction_dependencies');
 return {
  async load(scope){
   validateScope(scope);
   const tx=await deps.pool.connect();
   try{
    const r=await tx.query<LockedRewardRow>(SELECT_READ,[
     scope.encounterId,scope.accountId,scope.characterId]);
    if(r.rows.length>1)fail('duplicate_ledger_rows');
    if(!r.rows.length)return null;
    validateReceipt(scope,r.rows[0].receipt);
    return clone(r.rows[0].receipt);
   }finally{tx.release();}
  },
  async commitOnce(scope,receipt){
   validateScope(scope);
   validateReceipt(scope,receipt);
   const tx=await deps.pool.connect();
   let transactionStarted=false;
   try{
    await tx.query('BEGIN');
    transactionStarted=true;
    // Every contender for the same encounter locks this row first.
    const snapshots=await tx.query<LockedSnapshotRow>(SELECT_SNAPSHOT,[scope.encounterId]);
    if(snapshots.rows.length!==1)fail('snapshot_missing_or_duplicate');
    checkSnapshot(scope,snapshots.rows[0],receipt);
    const previous=await tx.query<LockedRewardRow>(SELECT_EXISTING,[scope.encounterId]);
    if(previous.rows.length>1)fail('duplicate_ledger_rows');
    if(previous.rows.length){
     const saved=previous.rows[0].receipt;
     validateReceipt(scope,saved);
     if(saved.snapshotDigest!==receipt.snapshotDigest||
      saved.outcomeDigest!==receipt.outcomeDigest)
      fail('conflicting_outcome');
     await tx.query('COMMIT');
     transactionStarted=false;
     return clone(saved); // preserve original policy after rotations/retries
    }
    if(!deps.approvedPolicyIds.includes(receipt.policyId))
     fail('policy_not_approved');
    // Expose only a scoped query facade: grant writers cannot release the
    // pinned client or control transaction lifetime (BEGIN/COMMIT/ROLLBACK).
    const grantTx:CombatV2RewardSqlTransaction={
     query:<Row=Record<string,unknown>>(sql:string,params?:readonly unknown[])=>{
      if(typeof sql!=='string'||/^\\s*(?:begin|commit|rollback|end|savepoint|release)\\b/i.test(sql))
       fail('writer_transaction_control_forbidden');
      return tx.query<Row>(sql,params);
     },
    };
    // Every grant + Inbox call MUST use the same pinned transaction.
    for(const grant of receipt.grants){
     const proof=await deps.writers.applyGrant(grantTx,scope,clone(grant));
     if(!proof||proof.grantSourceId!==grant.grantSourceId||
      proof.kind!==grant.kind||proof.resourceId!==grant.resourceId||
      proof.amount!==grant.amount)
      fail('grant_write_not_verified');
    }
    const inboxProof=await deps.writers.appendInbox(grantTx,scope,clone(receipt));
    if(!inboxProof||inboxProof.sourceKey!==receipt.sourceKey||
     inboxProof.accountId!==scope.accountId||
     inboxProof.characterId!==scope.characterId)
     fail('inbox_write_not_verified');
    await tx.query(INSERT_RECEIPT,[
     receipt.encounterId,receipt.accountId,receipt.characterId,
     receipt.sourceKey,receipt.snapshotDigest,receipt.outcomeDigest,
     receipt.grantDigest,receipt.receiptDigest,receipt.policyId,
     JSON.stringify(receipt),
    ]);
    await tx.query('COMMIT');
    transactionStarted=false;
    return clone(receipt);
   }catch(error){
    if(transactionStarted)try{await tx.query('ROLLBACK');}catch{
     // Preserve original failure; never report a successful settlement.
    }
    throw error;
   }finally{
    tx.release();
   }
  },
 };
}
