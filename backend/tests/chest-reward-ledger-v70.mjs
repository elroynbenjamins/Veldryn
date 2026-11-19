/**
 * Review-only V70 schema proof with disposable PGlite. NO live SQL writes.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const sql=readFileSync(new URL(
 '../../docs/roadmap/party-events/hidden-migrations/20261119104500_universal_chest_ledger_v70.sql',
 import.meta.url),'utf8');
const lines=sql.split(/\r?\n/);
const start=lines.findIndex(x=>x.trim().toLowerCase()==='begin;');
const end=lines.findLastIndex(x=>x.trim().toLowerCase()==='commit;');
assert(start>=0&&end>start,'draft contains one transaction');
const draft=lines.slice(start+1,end).join('\n');
const account='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const char='33333333-3333-4333-8333-333333333333';
const instance='44444444-4444-4444-8444-444444444444';
const source='winter-event:2026_11_16:'+account+':first';
const source2='winter-event:2026_11_16:'+account+':retry';
const receiptFor=(src,acc=account)=>({
 rulesVersion:'chest-settlement-v69',sourceKey:src,accountId:acc,
 recipientCharacterId:char,equipmentDeliveryMode:'character',
 proofVersion:'trusted-winter-v1',
 tableId:'winter_chest',tableVersion:'winter_v1',
 guaranteed:[{id:'gold',quantity:400},{id:'gem_dust',quantity:2}],
 groups:[{groupId:'equipment',type:'equipment',chanceBps:100,
  hit:true,entryId:'PE_WAYFARERS_PACT_BOOTS',quantity:1},
  {groupId:'material',type:'material',chanceBps:10000,
   hit:true,entryId:'MATERIAL_ORE',quantity:5}],
 drops:[{groupId:'equipment',type:'equipment',
  entryId:'PE_WAYFARERS_PACT_BOOTS',quantity:1},
  {groupId:'material',type:'material',entryId:'MATERIAL_ORE',quantity:5}],
 committed:true,
});
const db=await PGlite.create();
const insertReceipt=async(src,acc=account,receipt=receiptFor(src,acc))=>db.query(
 'insert into private.chest_reward_receipts_v70 '+
 '(source_key,account_id,recipient_character_id,equipment_delivery_mode,proof_version,table_id,table_version,rules_version,receipt) '+
 'values($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)',
 [src,acc,receipt.recipientCharacterId,receipt.equipmentDeliveryMode,
  receipt.proofVersion,
  receipt.tableId,receipt.tableVersion,receipt.rulesVersion,JSON.stringify(receipt)],
);
const insertLeg=async(src,acc,kind,ordinal,reward,quantity,grant,instanceId=null)=>db.query(
 'insert into private.chest_reward_grant_legs_v70 '+
 '(source_key,account_id,leg_kind,ordinal,reward_id,quantity,grant_id,item_instance_id) '+
 'values($1,$2,$3,$4,$5,$6,$7,$8::uuid)',
 [src,acc,kind,ordinal,reward,quantity,grant,instanceId],
);
try{
 await db.exec('create schema auth;create schema private;'+
  'create role anon;create role authenticated;create role service_role;'+
  'create table auth.users(id uuid primary key);');
 await db.query('insert into auth.users(id) values($1),($2)',[account,other]);
 await db.exec(draft);
 const rights=(await db.query(
  "select has_table_privilege('anon','private.chest_reward_receipts_v70','SELECT') as a_read,"+
  "has_table_privilege('authenticated','private.chest_reward_grant_legs_v70','INSERT') as user_write,"+
  "has_table_privilege('service_role','private.chest_reward_receipts_v70','INSERT') as svc_write"
 )).rows[0];
 assert.equal(rights.a_read,false);
 assert.equal(rights.user_write,false);
 assert.equal(rights.svc_write,false);
 await insertReceipt(source);
 await assert.rejects(()=>insertReceipt(source),/duplicate key/);
 await assert.rejects(()=>insertReceipt(source,other),/check constraint|duplicate key/);
 await assert.rejects(()=>insertReceipt(source2,account,{
  ...receiptFor(source2),accountId:other,
 }),/check constraint/);
 const missingOwner=receiptFor(source2);
 delete missingOwner.accountId;
 await assert.rejects(()=>insertReceipt(source2,account,missingOwner),
  /check constraint/);
 await assert.rejects(()=>insertReceipt(source2,account,{
  ...receiptFor(source2),equipmentDeliveryMode:null,
 }),/check constraint/);
 await assert.rejects(()=>insertReceipt(source2,account,{
  ...receiptFor(source2),committed:'true',
 }),/check constraint/);
 // A missing drop type once bypassed nullable SQL IF conditions.
 await db.exec('begin');
 const missingDropType=receiptFor(source2);
 missingDropType.drops[0]={...missingDropType.drops[0],type:null};
 await insertReceipt(source2,account,missingDropType);
 await assert.rejects(()=>insertLeg(source2,account,'drop',0,
  'PE_WAYFARERS_PACT_BOOTS',1,'malformed_equipment',instance),
  /CHEST_V70_INVALID_DROP_LEG/);
 await db.exec('rollback');
 await db.exec('begin');
 await insertReceipt(source2,account,{
  ...receiptFor(source2),equipmentDeliveryMode:'account_unclaimed',
  recipientCharacterId:null,
 });
 await db.exec('rollback');
 await assert.rejects(()=>insertLeg(source,account,'guarantee',0,'gold',401,'g_bad'),
  /CHEST_V70_INVALID_GUARANTEE_LEG/);
 await assert.rejects(()=>insertLeg(source,account,'drop',0,
  'PE_WAYFARERS_PACT_BOOTS',1,'equip_without_instance'),
  /CHEST_V70_INVALID_DROP_LEG/);
 await assert.rejects(()=>insertLeg(source,account,'inbox',0,
  'fake_inbox',1,'i_bad'),/CHEST_V70_INVALID_INBOX_LEG/);
 await insertLeg(source,account,'guarantee',0,'gold',400,'wallet_gold_1');
 await insertLeg(source,account,'guarantee',1,'gem_dust',2,'wallet_gems_1');
 await insertLeg(source,account,'drop',0,
  'PE_WAYFARERS_PACT_BOOTS',1,'equipment_item_1',instance);
 await insertLeg(source,account,'drop',1,'MATERIAL_ORE',5,'ore_stack_1');
 await insertLeg(source,account,'inbox',0,'inbox:'+source,1,'inbox_message_1');
 await assert.rejects(()=>insertLeg(source,account,'inbox',0,
  'inbox:'+source,1,'inbox_message_2'),/duplicate key/);
 await assert.rejects(()=>insertLeg(source,other,'guarantee',0,
  'gold',400,'cross_account'),/CHEST_V70_RECEIPT_NOT_FOUND/);
 await assert.rejects(()=>db.query(
  'update private.chest_reward_receipts_v70 set table_version=$1 where source_key=$2',
  ['tampered',source]),/CHEST_V70_IMMUTABLE/);
 await assert.rejects(()=>db.query(
  'delete from private.chest_reward_grant_legs_v70 where source_key=$1',
  [source]),/CHEST_V70_IMMUTABLE/);
 await assert.rejects(()=>db.query(
  'delete from auth.users where id=$1',[account]),/foreign key/);
 const count=async table=>(await db.query(
  'select count(*)::integer as n from private.'+table,
 )).rows[0].n;
 assert.equal(await count('chest_reward_receipts_v70'),1);
 assert.equal(await count('chest_reward_grant_legs_v70'),5);
 await db.exec('begin');
 await insertReceipt(source2);
 await insertLeg(source2,account,'guarantee',0,'gold',400,'retry_wallet');
 await db.exec('rollback');
 assert.equal(await count('chest_reward_receipts_v70'),1);
 assert.equal(await count('chest_reward_grant_legs_v70'),5);
 console.log('CHEST_V70_PGLITE_OK: private RLS, account/source identity, immutable receipt, exact grant legs, item UUID, no duplicates and rollback');
}finally{await db.close()}
