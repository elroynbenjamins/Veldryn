import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
// Real review-only SQL, executed against a throwaway in-memory database.
const sql=readFileSync(new URL('../../docs/roadmap/party-events/hidden-migrations/20261119070000_party_event_reward_ledger_v61.sql',import.meta.url),'utf8');
const lines=sql.split(/\r?\n/);
const start=lines.findIndex(x=>x.trim().toLowerCase()==='begin;');
const end=lines.findLastIndex(x=>x.trim().toLowerCase()==='commit;');
assert(start>=0&&end>start);
const db=await PGlite.create();
const account='11111111-1111-4111-8111-111111111111';
const party='22222222-2222-4222-8222-222222222222';
const week='2026-11-16T00:00:00Z';
const weekMs=Date.parse(week);
const source=kind=>'party-event:'+weekMs+':'+account+':'+kind;
try{
 await db.exec('create schema auth;create schema private;create role anon;create role authenticated;create role service_role;create table auth.users(id uuid primary key);create table private.party_event_roster_v11(party_id uuid not null,event_starts_at timestamptz not null,account_id uuid not null,primary key(party_id,event_starts_at,account_id));');
 await db.query('insert into auth.users values($1)',[account]);
 await db.query('insert into private.party_event_roster_v11 values($1,$2,$3)',[party,week,account]);
 await db.exec(lines.slice(start+1,end).join('\n'));
 const rights=(await db.query("select has_table_privilege('anon','private.party_event_reward_receipts_v61','SELECT') anon_read,has_table_privilege('authenticated','private.party_event_reward_receipts_v61','SELECT') player_read,has_table_privilege('service_role','private.party_event_reward_receipts_v61','SELECT') worker_read,has_table_privilege('service_role','private.party_event_reward_receipts_v61','INSERT') worker_insert")).rows[0];
 assert.equal(rights.anon_read,false);
 assert.equal(rights.player_read,false);
 assert.equal(rights.worker_read,true);
 assert.equal(rights.worker_insert,false);
 const bundle={
  participation:{sigils:8,gold:200,gems:2,essence:4},
  preparation:{sigils:10,gold:300,gems:3,essence:5},
  finale:{sigils:16,gold:500,gems:5,essence:8},
 };
 const envelope=(kind,b)=>({
  sourceKey:source(kind),accountId:account,weekStartMs:weekMs,
  origin:'chest',chestKind:kind,pieceId:null,frozenGear:null,
  partySigilsDelta:b.sigils,gold:b.gold,gemDust:b.gems,
  companionEssence:b.essence,rulesVersion:'party-event-reward-v60',
 });
 const insert=(kind,receipt,changes={})=>{
  const b=bundle[kind];
  return db.query("insert into private.party_event_reward_receipts_v61(source_key,party_id,event_starts_at,account_id,origin,chest_kind,party_sigils_delta,gold,gem_dust,companion_essence,rules_version,canonical_proof_version,receipt) values($1,$2,$3,$4,'chest',$5,$6,$7,$8,$9,'party-event-reward-v60','party-event-proof-v61',$10::jsonb)",[
   changes.source??source(kind),party,week,account,kind,
   changes.sigils??b.sigils,changes.gold??b.gold,
   b.gems,b.essence,JSON.stringify(receipt),
  ]);
 };
 await insert('participation',envelope('participation',bundle.participation));
 await assert.rejects(()=>insert('participation',envelope('participation',bundle.participation)),/duplicate key/);
 await assert.rejects(()=>insert('preparation',envelope('preparation',bundle.preparation),{sigils:999}),/check constraint/);
 await assert.rejects(()=>insert('preparation',{...envelope('preparation',bundle.preparation),gold:999}),/check constraint/);
 const withoutSource=envelope('preparation',bundle.preparation);delete withoutSource.sourceKey;
 await assert.rejects(()=>insert('preparation',withoutSource),/check constraint/);
 await assert.rejects(()=>insert('preparation',envelope('preparation',bundle.preparation),{source:'bad-source'}),/check constraint/);
 await db.exec('begin;');
 await insert('finale',envelope('finale',bundle.finale));
 await db.exec('rollback;');
 const count=(await db.query('select count(*)::integer n from private.party_event_reward_receipts_v61')).rows[0].n;
 assert.equal(count,1,'rollback erased uncommitted receipt');
 await assert.rejects(()=>db.query('update private.party_event_reward_receipts_v61 set gold=900 where source_key=$1',[source('participation')]),/party_event_v61_receipt_immutable/);
 console.log('PARTY_EVENT_LEDGER_V61_OK: private grants, one source, frozen amounts, mandatory receipt keys, rollback, append-only');
}finally{await db.close();}
