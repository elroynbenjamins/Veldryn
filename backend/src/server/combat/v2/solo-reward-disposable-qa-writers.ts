/**
 * Combat 2.0 QA-only ledger writers: disposable PG integration tests, NOT the game economy.
 * Does not reference, mutate, or claim ownership of live character_wallets,
 * skill XP, account resources, inventory or existing Inbox.
 *
 * Must be manually passed to an unmounted transactionalSoloRewardStoreV2 with
 * a fresh ephemeral QA database and explicit allowDisposableQaWriters flag.
 * Transaction-local source rows guarantee one balance adjustment per grant.
 */
import type {TrustedSoloIdentityV2} from './solo-encounter-persistence';
import type {SoloRewardGrantV2,SoloRewardReceiptV2} from './solo-reward-settlement';
import type {
 CombatV2RewardWriters,CombatV2RewardSqlTransaction,
 CombatV2RewardGrantWriteProof,CombatV2RewardInboxWriteProof,
} from './solo-reward-transactional-store';

type QaGrantRow={
 grant_source_id:string;account_id:string;character_id:string;
 kind:SoloRewardGrantV2['kind'];resource_id:string;amount:string;
};
type QaBalanceRow={balance:string};
type QaInboxRow={source_key:string;account_id:string;character_id:string;receipt_digest:string};
const reject=(reason:string):never=>{throw Error('combat_v2_disposable_qa_'+reason);};
const validId=(s:unknown):s is string=>
 typeof s==='string'&&s.length>0&&s.length<=128&&/^[A-Za-z0-9:_-]+$/.test(s);
const same=(a:unknown,b:unknown)=>a===b;
const textAmount=(value:number)=>String(value);
const INSERT_GRANT=`insert into private.combat_v2_reward_qa_sources_v1
 (grant_source_id,account_id,character_id,kind,resource_id,amount)
 values ($1,$2::uuid,$3::uuid,$4,$5,$6::bigint)
 on conflict (grant_source_id) do nothing
 returning grant_source_id,account_id::text,character_id::text,kind,resource_id,amount::text`;
const READ_GRANT=`select grant_source_id,account_id::text,character_id::text,kind,resource_id,amount::text
 from private.combat_v2_reward_qa_sources_v1 where grant_source_id=$1`;
const CREDIT_QA_BALANCE=`insert into private.combat_v2_reward_qa_balances_v1
 (account_id,character_id,kind,resource_id,balance)
 values ($1::uuid,$2::uuid,$3,$4,$5::bigint)
 on conflict (account_id,character_id,kind,resource_id)
 do update set balance=private.combat_v2_reward_qa_balances_v1.balance+excluded.balance
 returning balance::text`;
const INSERT_INBOX=`insert into private.combat_v2_reward_qa_inbox_v1
 (source_key,account_id,character_id,receipt_digest)
 values ($1,$2::uuid,$3::uuid,$4)
 on conflict (source_key) do nothing
 returning source_key,account_id::text,character_id::text,receipt_digest`;
const READ_INBOX=`select source_key,account_id::text,character_id::text,receipt_digest
 from private.combat_v2_reward_qa_inbox_v1 where source_key=$1`;
function checkGrant(
 row:QaGrantRow|undefined,scope:TrustedSoloIdentityV2,grant:SoloRewardGrantV2,
):CombatV2RewardGrantWriteProof{
 if(!row||!same(row.grant_source_id,grant.grantSourceId)||
  row.account_id!==scope.accountId||row.character_id!==scope.characterId||
  row.kind!==grant.kind||row.resource_id!==grant.resourceId||
  row.amount!==textAmount(grant.amount))reject('grant_provenance_mismatch');
 return {
  grantSourceId:row.grant_source_id,kind:row.kind,resourceId:row.resource_id,
  amount:grant.amount,
 };
}
function checkInbox(
 row:QaInboxRow|undefined,scope:TrustedSoloIdentityV2,receipt:SoloRewardReceiptV2,
):CombatV2RewardInboxWriteProof{
 if(!row||row.source_key!==receipt.sourceKey||
  row.account_id!==scope.accountId||row.character_id!==scope.characterId||
  row.receipt_digest!==receipt.receiptDigest)reject('inbox_provenance_mismatch');
 return {
  sourceKey:row.source_key,accountId:row.account_id,characterId:row.character_id,
 };
}
export function disposableQaSoloRewardWritersV2(
 allowDisposableQaWriters=false,
):CombatV2RewardWriters {
 if(!allowDisposableQaWriters)reject('disabled');
 return {
  async applyGrant(
   tx:CombatV2RewardSqlTransaction,
   scope:TrustedSoloIdentityV2,grant:SoloRewardGrantV2,
  ) {
   if(!validId(scope.accountId)||!validId(scope.characterId)||
    !validId(scope.encounterId)||!grant||
    !validId(grant.resourceId)||!Number.isSafeInteger(grant.amount)||
    grant.amount<1||typeof grant.grantSourceId!=='string'||
     !new RegExp('^combat-v2:solo:'+scope.encounterId+':[0-9]{1,2}$').test(grant.grantSourceId))
    reject('invalid_grant_scope');
   const params=[grant.grantSourceId,scope.accountId,scope.characterId,
    grant.kind,grant.resourceId,textAmount(grant.amount)] as const;
   const added=await tx.query<QaGrantRow>(INSERT_GRANT,params);
   if(added.rows.length>1)reject('duplicated_grant_source');
   if(!added.rows.length){
    const original=await tx.query<QaGrantRow>(READ_GRANT,[grant.grantSourceId]);
    if(original.rows.length!==1)reject('missing_grant_source');
    return checkGrant(original.rows[0],scope,grant);
   }
   const proof=checkGrant(added.rows[0],scope,grant);
   const balance=await tx.query<QaBalanceRow>(CREDIT_QA_BALANCE,[
    scope.accountId,scope.characterId,grant.kind,grant.resourceId,textAmount(grant.amount),
   ]);
   if(balance.rows.length!==1||
     !new RegExp('^[0-9]+$').test(balance.rows[0].balance)||
    BigInt(balance.rows[0].balance)<BigInt(grant.amount))
    reject('balance_readback_failed');
   return proof;
  },
  async appendInbox(
   tx:CombatV2RewardSqlTransaction,
   scope:TrustedSoloIdentityV2,receipt:SoloRewardReceiptV2,
  ){
   if(!receipt||receipt.sourceKey!=='combat-v2:solo:'+scope.encounterId||
    receipt.accountId!==scope.accountId||receipt.characterId!==scope.characterId)
    reject('invalid_inbox_scope');
   const params=[receipt.sourceKey,scope.accountId,scope.characterId,receipt.receiptDigest] as const;
   const added=await tx.query<QaInboxRow>(INSERT_INBOX,params);
   if(added.rows.length>1)reject('duplicated_inbox_source');
   if(added.rows.length===1)return checkInbox(added.rows[0],scope,receipt);
   const existing=await tx.query<QaInboxRow>(READ_INBOX,[receipt.sourceKey]);
   if(existing.rows.length!==1)reject('missing_inbox_source');
   return checkInbox(existing.rows[0],scope,receipt);
  },
 };
}
