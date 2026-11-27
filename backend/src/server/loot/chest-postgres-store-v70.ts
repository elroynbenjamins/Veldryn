/**
 * V70: review-only, UNMOUNTED Postgres adapter for shared V69 chest settlement.
 * The same connection handles source-specific isolation, account inventory locks, frozen
 * receipt, resource/item/inbox delivery, leg audit, and physical read-back.
 *
 * Nothing here enables a reward. Injectable ports must be audited SQL-only
 * operations on the supplied tx: no HTTP, .rpc(), queue, or network.
 */
import type {
 ChestGrantStoreV69,ChestGrantTransactionV69,TrustedChestSourceV69,
 FrozenChestReceiptV69,
} from './chest-reward-settlement-v69';
import {
 planChestEquipmentV71,type ChestEq2ServerContextV71,
} from './chest-equipment-bridge-v71';

export const CHEST_POSTGRES_STORE_V70_RELEASED=false;
export const CHEST_POSTGRES_STORE_V70_VERSION='chest-postgres-v70' as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const KEY=/^[a-z0-9:_-]{20,220}$/;
export interface ChestSqlV70{
 query<T extends Record<string,unknown>=Record<string,unknown>>(
  sql:string,params?:readonly unknown[],
 ):Promise<{rows:T[]}>;
 release():void;
}
export interface ChestPoolV70{connect():Promise<ChestSqlV70>}
export interface ChestPhysicalGrantV70{
 readonly grantId:string;
 readonly itemInstanceId:string|null;
}
export interface ChestLedgerLegV70{
 readonly sourceKey:string;
 readonly accountId:string;
 readonly kind:'guarantee'|'drop'|'inbox';
 readonly ordinal:number;
 readonly rewardId:string;
 readonly quantity:number;
 readonly grantId:string;
 readonly itemInstanceId:string|null;
}
export interface ChestPhysicalPortsV70{
 /** Lock source event first and assert the V57 account-erasure fence BEFORE
  * the shared account-inventory row. Required for World Boss sources. This
  * runs on the same READ COMMITTED connection and must not issue a new BEGIN,
  * network request, or untrusted/client-derived authorization. */
 assertSourceWriteOpen?(
  tx:ChestSqlV70,accountId:string,sourceKey:string,
 ):Promise<void>;
 /** Each method MUST use only this transaction's SQL connection. */
 readCanonicalSource(tx:ChestSqlV70,accountId:string,sourceKey:string):
  Promise<TrustedChestSourceV69>;
 readAccountOwnedDrops(tx:ChestSqlV70,accountId:string):
  Promise<readonly string[]>;
 isOwnedCharacter(tx:ChestSqlV70,accountId:string,characterId:string):
  Promise<boolean>;
 /** Read the locked event proof's actual item tier and boss identity. No
  * client tier or guessed boss/slot may cross the issuance boundary. */
 readApprovedEquipmentContext(tx:ChestSqlV70,receipt:FrozenChestReceiptV69,
  index:number):Promise<ChestEq2ServerContextV71>;
 /** Invoke existing real wallet/resource grants, returning DB grant id.
  * Never use a second connection or external side effect. */
 creditGuaranteed(tx:ChestSqlV70,receipt:FrozenChestReceiptV69,index:number):
  Promise<ChestPhysicalGrantV70>;
 /** Must delegate rolled Equipment 2.0 to verified V71 custody/manifest,
  * not to character JSON or the older equipment_v24_item_instances table. */
 grantDrop(tx:ChestSqlV70,receipt:FrozenChestReceiptV69,index:number):
  Promise<ChestPhysicalGrantV70>;
 /** Insert an immutable source-linked Inbox reward row, no network push. */
 grantInbox(tx:ChestSqlV70,receipt:FrozenChestReceiptV69):
  Promise<ChestPhysicalGrantV70>;
 /** Independently read exact amounts, instances, owner and Inbox from the
  * ACTUAL writer tables; grant journal alone is not physical custody proof. */
 verifyPhysical(tx:ChestSqlV70,receipt:FrozenChestReceiptV69,
  legs:readonly ChestLedgerLegV70[],
  phase:'fresh'|'replay'):Promise<boolean>;
}
const receiptSql=[
 'select receipt from private.chest_reward_receipts_v70',
 'where source_key=$1 and account_id=$2::uuid for update',
].join(' ');
const insertSql=[
 'insert into private.chest_reward_receipts_v70',
 '(source_key,account_id,recipient_character_id,equipment_delivery_mode,proof_version,',
 'table_id,table_version,rules_version,receipt)',
 'values($1,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9::jsonb)',
].join(' ');
const legsSql=[
 'select source_key,account_id::text as account_id,leg_kind,ordinal,',
 'reward_id,quantity,grant_id,item_instance_id::text as item_instance_id',
 'from private.chest_reward_grant_legs_v70 where source_key=$1',
 'and account_id=$2::uuid order by leg_kind,ordinal',
].join(' ');
const insertLegSql=[
 'insert into private.chest_reward_grant_legs_v70',
 '(source_key,account_id,leg_kind,ordinal,reward_id,quantity,grant_id,item_instance_id)',
 'values($1,$2::uuid,$3,$4,$5,$6,$7,$8::uuid)',
].join(' ');
const lockAccountSql=[
 'select account_id::text as account_id',
 'from private.chest_account_fence_v70 where account_id=$1::uuid',
 'for update',
].join(' ');
function assertIdentity(accountId:string,sourceKey:string):void{
 if(!UUID.test(accountId)||accountId!==accountId.toLowerCase()||
  !KEY.test(sourceKey)||sourceKey.split(':'+accountId+':').length!==2)
  throw Error('chest_v70_invalid_identity');
}
function checkedGrant(grant:ChestPhysicalGrantV70,expectedEquipment:boolean):void{
 if(!grant||typeof grant.grantId!=='string'||
  grant.grantId.length<1||grant.grantId.length>200||
  !/^[a-zA-Z0-9:_-]+$/.test(grant.grantId)||
  (expectedEquipment?
   typeof grant.itemInstanceId!=='string'||!UUID.test(grant.itemInstanceId):
   grant.itemInstanceId!==null))
  throw Error('chest_v70_invalid_physical_grant');
}
function numberValue(value:unknown):number{
 const n=typeof value==='string'&&/^\d+$/.test(value)?Number(value):value;
 if(typeof n!=='number'||!Number.isSafeInteger(n)||
  n<0||n>2147483647)
  throw Error('chest_v70_corrupt_leg_quantity');
 return n;
}
function decodeReceipt(value:unknown):FrozenChestReceiptV69{
 const result=typeof value==='string'?JSON.parse(value) as unknown:value;
 if(!result||typeof result!=='object'||Array.isArray(result))
  throw Error('chest_v70_corrupt_receipt_json');
 return result as FrozenChestReceiptV69;
}
function expectedLegs(receipt:FrozenChestReceiptV69):readonly
 Pick<ChestLedgerLegV70,'kind'|'ordinal'|'rewardId'|'quantity'>[]{
 return [
  ...receipt.guaranteed.map((g,i)=>({
   kind:'guarantee' as const,ordinal:i,rewardId:g.id,quantity:g.quantity,
  })),
  ...receipt.drops.map((d,i)=>({
   kind:'drop' as const,ordinal:i,rewardId:d.entryId,quantity:d.quantity,
  })),
  {kind:'inbox' as const,ordinal:0,rewardId:'inbox:'+receipt.sourceKey,quantity:1},
 ];
}
export function createChestPostgresStoreV70(
 pool:ChestPoolV70,ports:ChestPhysicalPortsV70,qaEnabled=false,
 /** Explicit isolated V102 review port; old callers remain fail-closed. */
 gatheringMintReview?:{grant:(tx:ChestSqlV70,receipt:FrozenChestReceiptV69)=>Promise<ChestPhysicalGrantV70>},
):ChestGrantStoreV69{
 return {
  async withLockedAccountSource<T>(accountId:string,sourceKey:string,
   work:(tx:ChestGrantTransactionV69)=>Promise<T>):Promise<T>{
   if(!qaEnabled||CHEST_POSTGRES_STORE_V70_RELEASED||
    process.env.NODE_ENV==='production')
    throw Error('chest_v70_unreleased');
   assertIdentity(accountId,sourceKey);
   // V57 deliberately refuses SERIALIZABLE due to possible stale erasure
   // snapshots. Keep existing SERIALIZABLE behavior for non-World-Boss
   // chests; the guarded World Boss path needs READ COMMITTED plus locks.
   const isWorldBoss=sourceKey.startsWith('world-boss:');
   if(isWorldBoss&&
    typeof ports?.assertSourceWriteOpen!=='function')
    throw Error('chest_v70_world_boss_privacy_gate_required');
   const conn=await pool.connect();
   let began=false;
   try{
    await conn.query(isWorldBoss?
     'begin isolation level read committed':
     'begin isolation level serializable');
    began=true;
    await conn.query("set local lock_timeout='5s'");
    if(ports.assertSourceWriteOpen)
     await ports.assertSourceWriteOpen(conn,accountId,sourceKey);
    // Dedicated account fence, not a per-source-only lock: opening two
    // different chests cannot race the account-wide missing-piece snapshot.
    await conn.query(
     'insert into private.chest_account_fence_v70(account_id) '+
     'select id from auth.users where id=$1::uuid on conflict do nothing',
     [accountId],
    );
    const fence=(await conn.query<{account_id:string}>(
     lockAccountSql,[accountId],
    )).rows;
    if(fence.length!==1||fence[0]!.account_id!==accountId)
     throw Error('chest_v70_unregistered_account');
    let inserted=false,credited=false,inboxed=false;
    const granted=new Set<number>();
    const writeLeg=async(kind:ChestLedgerLegV70['kind'],ordinal:number,
     rewardId:string,quantity:number,grant:ChestPhysicalGrantV70,
     equipment=false)=>{
     checkedGrant(grant,equipment);
     await conn.query(insertLegSql,[
      sourceKey,accountId,kind,ordinal,rewardId,quantity,
      grant.grantId,grant.itemInstanceId,
     ]);
    };
    const tx:ChestGrantTransactionV69={
     readCommittedReceipt:async key=>{
      if(key!==sourceKey)throw Error('chest_v70_source_mismatch');
      const rows=(await conn.query<{receipt:unknown}>(
       receiptSql,[key,accountId],
      )).rows;
      if(rows.length>1)throw Error('chest_v70_nonunique_receipt');
      return rows.length?decodeReceipt(rows[0]!.receipt):null;
     },
     readTrustedSource:async(owner,key)=>{
      if(owner!==accountId||key!==sourceKey)
       throw Error('chest_v70_untrusted_source');
      return ports.readCanonicalSource(conn,accountId,sourceKey);
     },
     readOwnedDropIds:async owner=>{
      if(owner!==accountId)throw Error('chest_v70_foreign_inventory');
      return ports.readAccountOwnedDrops(conn,owner);
     },
     verifyRecipientCharacter:async(owner,id)=>{
      if(owner!==accountId||!UUID.test(id))
       throw Error('chest_v70_foreign_character');
      return ports.isOwnedCharacter(conn,owner,id);
     },
     insertFrozenReceipt:async receipt=>{
      if(inserted||receipt.sourceKey!==sourceKey||
       receipt.accountId!==accountId||receipt.committed!==true)
       throw Error('chest_v70_invalid_receipt_insert');
      await conn.query(insertSql,[
       sourceKey,accountId,receipt.recipientCharacterId,
       receipt.equipmentDeliveryMode,receipt.proofVersion,
       receipt.tableId,receipt.tableVersion,receipt.rulesVersion,
       JSON.stringify(receipt),
      ]);
      inserted=true;
     },
     creditGuaranteed:async receipt=>{
      if(!inserted||credited||receipt.sourceKey!==sourceKey)
       throw Error('chest_v70_grant_without_receipt');
      for(let i=0;i<receipt.guaranteed.length;i++){
       const g=receipt.guaranteed[i]!;
       const grant=await ports.creditGuaranteed(conn,receipt,i);
       await writeLeg('guarantee',i,g.id,g.quantity,grant);
      }
      credited=true;
     },
     grantDrop:async(receipt,index)=>{
      if(!inserted||!credited||inboxed||granted.has(index)||
       receipt.sourceKey!==sourceKey||
       !Number.isInteger(index)||index<0||index>=receipt.drops.length)
       throw Error('chest_v70_invalid_drop_grant');
      const drop=receipt.drops[index]!;
      // Party PE_ templates and World Boss gathering copies still lack a
      // registered, verified EQ2 item writer. Never commit a simulated
      // Equipment 2.0 item or use the old character v24 instance table.
      if(drop.type==='equipment'){
       if(gatheringMintReview&&isWorldBoss&&index===0&&receipt.drops.length===1&&
        receipt.tableId==='world_boss_chest'&&/^world_boss_v98_unified_(hollowroot|sunscar|frostmarch)$/.test(receipt.tableVersion)&&
        receipt.equipmentDeliveryMode==='account_unclaimed'&&receipt.recipientCharacterId===null){
        const grant=await gatheringMintReview.grant(conn,receipt);
        await writeLeg('drop',index,drop.entryId,drop.quantity,grant,true);
        granted.add(index);return;
       }
       const context=await ports.readApprovedEquipmentContext(
        conn,receipt,index,
       );
       const candidate=planChestEquipmentV71(receipt,index,context);
       if(candidate.readyForIssuance!==false||candidate.blockers.length===0)
        throw Error('chest_v70_invalid_eq2_issuance_gate');
       throw Error('chest_v70_eq2_manifest_and_custody_not_ready');
      }
      const grant=await ports.grantDrop(conn,receipt,index);
      await writeLeg('drop',index,drop.entryId,drop.quantity,grant);
      granted.add(index);
     },
     grantInbox:async receipt=>{
      if(!inserted||!credited||inboxed||
       granted.size!==receipt.drops.length||receipt.sourceKey!==sourceKey)
       throw Error('chest_v70_invalid_inbox_grant');
      const grant=await ports.grantInbox(conn,receipt);
      await writeLeg('inbox',0,'inbox:'+sourceKey,1,grant);
      inboxed=true;
     },
     verifyExactlyGranted:async receipt=>{
      if(receipt.sourceKey!==sourceKey||receipt.accountId!==accountId)
       throw Error('chest_v70_foreign_verification');
      const rows=(await conn.query<Record<string,unknown>>(
       legsSql,[sourceKey,accountId],
      )).rows;
      const expected=expectedLegs(receipt);
      if(rows.length!==expected.length)return false;
      const legs:ChestLedgerLegV70[]=[];
      for(const row of rows){
       const kind=row.leg_kind;
       const index=row.ordinal;
       const quantity=numberValue(row.quantity);
       const e=expected.find(x=>x.kind===kind&&x.ordinal===index);
       const grantId=row.grant_id;
       const itemId=row.item_instance_id??null;
       if(!e||e.rewardId!==row.reward_id||e.quantity!==quantity||
        typeof grantId!=='string'||grantId.length===0||
        (itemId!==null&&(typeof itemId!=='string'||!UUID.test(itemId))))
        return false;
       legs.push({
        sourceKey,accountId,kind:e.kind,ordinal:e.ordinal,rewardId:e.rewardId,
        quantity,grantId,itemInstanceId:itemId as string|null,
       });
      }
      return ports.verifyPhysical(conn,receipt,legs,
       inserted?'fresh':'replay');
     },
    };
    const result=await work(tx);
    if(inserted&&!inboxed)
     throw Error('chest_v70_missing_inbox_before_commit');
    await conn.query('commit');
    return result;
   }catch(error){
    if(began){
     try{await conn.query('rollback')}
     catch{throw Error('chest_v70_rollback_failed')}
    }
    throw error;
   }finally{conn.release()}
  },
 };
}
