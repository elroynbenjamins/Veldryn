/**
 * V65 executable private wallet/ledger evidence on disposable PGlite only.
 * NO network, staging/production DB, deployed migration or API grant.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const draft=(name)=>{
 const sql=readFileSync(new URL('../../docs/roadmap/party-events/hidden-migrations/'+name,import.meta.url),'utf8');
 const lines=sql.split(/\r?\n/);
 const start=lines.findIndex(x=>x.trim().toLowerCase()==='begin;');
 const end=lines.findLastIndex(x=>x.trim().toLowerCase()==='commit;');
 assert(start>=0&&end>start,'hidden draft has one complete transaction');
 return lines.slice(start+1,end).join('\n');
};
const db=await PGlite.create();
const account='11111111-1111-4111-8111-111111111111';
const second='33333333-3333-4333-8333-333333333333';
const party='22222222-2222-4222-8222-222222222222';
const weeks=['2026-11-16T00:00:00Z','2026-11-23T00:00:00Z'];
const key=(w,acc,kind)=>'party-event:'+Date.parse(w)+':'+acc+':'+kind;
const amounts={
 participation:[8,200,2,4],preparation:[10,300,3,5],finale:[16,500,5,8],
};
async function insertReceipt(w,acc,kind){
 const source=key(w,acc,kind),isExchange=kind==='exchange';
 const a=isExchange?[-60,0,0,0]:amounts[kind];
 const piece=isExchange?'PE_WAYFARERS_PACT_BOOTS':null;
 const instance=isExchange?'44444444-4444-4444-8444-444444444444':null;
 const version=isExchange?'equipment-v2-event-approved':null;
 const frozen=isExchange?{itemInstanceId:instance,pieceId:piece,tier:2,
  exactItemReceiptVersion:version}:null;
 const data={sourceKey:source,accountId:acc,weekStartMs:Date.parse(w),
  origin:isExchange?'exchange':'chest',chestKind:isExchange?null:kind,
  pieceId:piece,frozenGear:frozen,partySigilsDelta:a[0],gold:a[1],
  gemDust:a[2],companionEssence:a[3],rulesVersion:'party-event-reward-v60'};
 await db.query(`insert into private.party_event_reward_receipts_v61(
  source_key,party_id,event_starts_at,account_id,origin,chest_kind,piece_id,
  item_instance_id,exact_item_receipt_version,party_sigils_delta,gold,
  gem_dust,companion_essence,rules_version,canonical_proof_version,receipt)
  values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
   'party-event-reward-v60','party-event-proof-v61',$14::jsonb)`,[
  source,party,w,acc,data.origin,data.chestKind,piece,instance,version,
  ...a,JSON.stringify(data),
 ]);
 return source;
}
const pay=async(acc,source)=>(await db.query(
 'select private.apply_party_sigils_from_receipt_v65($1::uuid,$2::text) as result',
 [acc,source])).rows[0].result;
const balance=async acc=>(await db.query(
 'select balance from private.party_sigils_wallet_v65 where account_id=$1',[acc])
 ).rows[0]?.balance??0;
try{
 await db.exec(`create schema auth;create schema private;
  create role anon;create role authenticated;create role service_role;
  create table auth.users(id uuid primary key);
  create table private.party_event_roster_v11(
   party_id uuid not null,event_starts_at timestamptz not null,
   account_id uuid not null,primary key(party_id,event_starts_at,account_id));`);
 await db.query('insert into auth.users values($1),($2)',[account,second]);
 for(const w of weeks){
  await db.query('insert into private.party_event_roster_v11 values($1,$2,$3),($1,$2,$4)',[party,w,account,second]);
 }
 await db.exec(draft('20261119070000_party_event_reward_ledger_v61.sql'));
 await db.exec(draft('20261119094500_party_sigils_account_ledger_v65.sql'));
 const rights=(await db.query(`select
  has_table_privilege('anon','private.party_sigils_wallet_v65','SELECT') anon_read,
  has_table_privilege('authenticated','private.party_sigils_ledger_v65','INSERT') player_insert,
  has_table_privilege('service_role','private.party_sigils_wallet_v65','SELECT') svc_read,
  has_table_privilege('service_role','private.party_sigils_wallet_v65','UPDATE') svc_write,
  has_function_privilege('service_role',
   'private.apply_party_sigils_from_receipt_v65(uuid,text)','EXECUTE') svc_execute`)).rows[0];
 assert.equal(rights.anon_read,false);assert.equal(rights.player_insert,false);
 assert.equal(rights.svc_read,true);assert.equal(rights.svc_write,false);
 assert.equal(rights.svc_execute,false);
 await assert.rejects(()=>pay(account,key(weeks[0],account,'participation')),
  /party_sigils_v65_receipt_missing/);
 const first=await insertReceipt(weeks[0],account,'participation');
 const r=await pay(account,first);
 assert.equal(r.delta,8);assert.equal(r.balanceAfter,8);
 await assert.rejects(()=>pay(account,first),/party_sigils_v65_source_already_applied/);
 assert.equal(await balance(account),8);
 const prep=await insertReceipt(weeks[0],account,'preparation');
 await assert.rejects(()=>db.query(
  'insert into private.party_sigils_ledger_v65(source_key,account_id,delta,balance_after) values($1,$2,16,24)',
  [prep,account]),/party_sigils_v65_noncanonical_ledger_row/);
 await pay(account,prep);
 const finale=await insertReceipt(weeks[0],account,'finale');
 await assert.rejects(()=>db.query(
  'insert into private.party_sigils_ledger_v65(source_key,account_id,delta,balance_after) values($1,$2,16,34)',
  [finale,account]),/party_sigils_v65_noncanonical_ledger_row/);
 await pay(account,finale);
 assert.equal(await balance(account),34);
 const blockedExchange=await insertReceipt(weeks[0],account,'exchange');
 await assert.rejects(()=>pay(account,blockedExchange),/party_sigils_v65_insufficient_or_overflow/);
 assert.equal(await balance(account),34);
 assert.equal((await db.query('select count(*)::integer n from private.party_sigils_ledger_v65')).rows[0].n,3);
 for(const kind of ['participation','preparation','finale']){
  const source=await insertReceipt(weeks[1],account,kind);
  await pay(account,source);
 }
 assert.equal(await balance(account),68);
 const spent=await pay(account,blockedExchange);
 assert.equal(spent.delta,-60);assert.equal(spent.balanceAfter,8);
 assert.equal(await balance(account),8);
 await assert.rejects(()=>pay(second,first),/party_sigils_v65_receipt_missing/);
 await assert.rejects(()=>db.query(
  'update private.party_sigils_ledger_v65 set delta=16 where source_key=$1',[first]),
  /party_sigils_v65_immutable_record/);
 const secondReceipt=await insertReceipt(weeks[0],second,'participation');
 await db.exec('begin;');
 await pay(second,secondReceipt);
 await db.exec('rollback;');
 assert.equal(await balance(second),0,'rollback removes wallet and ledger');
 assert.equal((await db.query('select count(*)::integer n from private.party_sigils_ledger_v65')).rows[0].n,7);
 await db.query('delete from auth.users where id=$1',[account]);
 assert.equal((await db.query('select count(*)::integer n from private.party_sigils_wallet_v65')).rows[0].n,0);
 assert.equal((await db.query('select count(*)::integer n from private.party_sigils_ledger_v65')).rows[0].n,0);
 console.log('PARTY_SIGILS_V65_PGLITE_OK: canonical source, exact 8/10/16/-60, single wallet, negative guard, duplicate denial, rollback, erasure and private permissions');
}finally{await db.close();}
