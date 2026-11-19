/**
 * Disposable PGlite verification of the EXACT V43 one-statement source
 * selection queries. The credit function here is an inert stub; the actual
 * V14 authoritative credit/lock/replay engine has its separate SQL tests.
 *
 * Never deploy these test schemas or the stub function.
 */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {PGlite} from '@electric-sql/pglite';

const content=readFileSync(fileURLToPath(new URL(
 '../online/party-event-activity-credit-worker-v43.ts',import.meta.url)),'utf8');
function sourceSql(name){
 const marker='export const '+name+'=';
 const idx=content.indexOf(marker);
 if(idx<0)throw Error('missing_source_sql_'+name);
 const begin=content.indexOf('`',idx)+1;
 const end=content.indexOf('` as const;',begin);
 if(begin<=idx||end<=begin)throw Error('malformed_source_sql_'+name);
 return content.slice(begin,end);
}
const idleSql=sourceSql('PARTY_EVENT_IDLE_CREDIT_SQL_V43');
const craftSql=sourceSql('PARTY_EVENT_CRAFT_CREDIT_SQL_V43');
const coopSql=sourceSql('PARTY_EVENT_COOP_CREDIT_SQL_V43');
const must=(value,why)=>{if(!value)throw Error('v43_pglite_'+why)};
const accountA='11111111-1111-4111-8111-111111111111';
const accountB='22222222-2222-4222-8222-222222222222';
const characterA='33333333-3333-4333-8333-333333333333';
const characterB='44444444-4444-4444-8444-444444444444';
const partyA='55555555-5555-4555-8555-555555555555';
const partyB='66666666-6666-4666-8666-666666666666';
const sourceClaim='77777777-7777-4777-8777-777777777777';
const sourceCraft='88888888-8888-4888-8888-888888888888';
const runId='99999999-9999-4999-8999-999999999999';
const joined='2026-11-16T00:00:00Z',sourceAt='2026-11-18T10:00:00Z';
const ends='2026-11-23T00:00:00Z',key='pe43:stub:123456789';
const db=await PGlite.create();
try{
 await db.exec(`
 create schema private;
 create table public.characters(id uuid primary key,account_id uuid not null);
 create table public.idle_claim_receipts(
  claim_id uuid primary key,character_id uuid not null,created_at timestamptz not null);
 create table public.craft_receipts(
  receipt_id uuid primary key,character_id uuid not null,created_at timestamptz not null);
 create table public.coop_node_results(
  run_id uuid,node_id text,success boolean,committed_at timestamptz,
  fencing_generation bigint,start_state_hash text);
 create table private.party_event_coop_node_actors_v49(
  run_id uuid,node_id text,account_id uuid,character_id uuid,
  node_committed_at timestamptz,fencing_generation bigint,start_state_hash text);
 create table private.party_event_weeks_v11(
  party_id uuid,event_starts_at timestamptz,event_ends_at timestamptz);
 create table private.party_event_roster_v11(
  party_id uuid,event_starts_at timestamptz,account_id uuid,
  character_id uuid,joined_at timestamptz);
 create function private.credit_party_event_activity_v14(
  party uuid,week timestamptz,kind text,src uuid,node text,actor uuid,request text
 ) returns jsonb language sql as $$
  select jsonb_build_object('sourceType',kind,'eventParty',party,'eventStartsAt',week,
   'sourceRef',src,'nodeId',node,'actorAccount',actor,'requestId',request)
 $$;
 `);
 await db.query('insert into public.characters values ($1::uuid,$3::uuid),($2::uuid,$4::uuid)',
  [characterA,characterB,accountA,accountB]);
 await db.query(`insert into private.party_event_weeks_v11 values
 ($1::uuid,$3::timestamptz,$4::timestamptz),
 ($2::uuid,$3::timestamptz,$4::timestamptz)`,[partyA,partyB,joined,ends]);
 await db.query(`insert into private.party_event_roster_v11 values
 ($1::uuid,$3::timestamptz,$4::uuid,$6::uuid,$3::timestamptz),
 ($2::uuid,$3::timestamptz,$5::uuid,$7::uuid,$3::timestamptz)`,
 [partyA,partyB,joined,accountA,accountB,characterA,characterB]);
 await db.query('insert into public.idle_claim_receipts values ($1::uuid,$2::uuid,$3::timestamptz)',
  [sourceClaim,characterA,sourceAt]);
 await db.query('insert into public.craft_receipts values ($1::uuid,$2::uuid,$3::timestamptz)',
  [sourceCraft,characterA,sourceAt]);
 await db.query('insert into public.coop_node_results values ($1::uuid,$2::text,true,$3::timestamptz,1,\'HASH_A\')',
  [runId,'NODE_A',sourceAt]);
 await db.query(`insert into private.party_event_coop_node_actors_v49 values
 ($1::uuid,$2::text,$3::uuid,$4::uuid,$5::timestamptz,1,'HASH_A')`,
 [runId,'NODE_A',accountA,characterA,sourceAt]);
 const get=async(sql,params)=>db.query(sql,params);
 const idle=await get(idleSql,[sourceClaim,key]);
 must(idle.rows.length===1&&idle.rows[0].credit.eventParty===partyA,'idle_owned_party');
 must(idle.rows[0].credit.sourceType==='idle','idle_canonical_kind');
 const craft=await get(craftSql,[sourceCraft,key]);
 must(craft.rows.length===1&&craft.rows[0].credit.eventParty===partyA,'craft_owned_party');
 const coop=await get(coopSql,[runId,'NODE_A',accountA,key]);
 must(coop.rows.length===1&&coop.rows[0].credit.eventParty===partyA
  &&coop.rows[0].credit.actorAccount===accountA,'coop_verified_source_time_attested_actor');
 // The attested source is bound to immutable committed node provenance.
 // Tampering with the underlying success/hash can never pass the selection.
 await db.query(`update public.coop_node_results set start_state_hash='CHANGED'
  where run_id=$1::uuid`,[runId]);
 must((await get(coopSql,[runId,'NODE_A',accountA,key])).rows.length===0,
  'node_hash_mismatch_denied');
 await db.query(`update public.coop_node_results set start_state_hash='HASH_A',success=false
  where run_id=$1::uuid`,[runId]);
 must((await get(coopSql,[runId,'NODE_A',accountA,key])).rows.length===0,
  'failed_node_cannot_match_persisted_witness');
 await db.query(`update public.coop_node_results set success=true
  where run_id=$1::uuid`,[runId]);
 const forgedActor=await get(coopSql,[runId,'NODE_A',accountB,key]);
 must(forgedActor.rows.length===0,'coop_wrong_actor_denied');
 const fakeNode=await get(coopSql,[runId,'FAKE_NODE',accountA,key]);
 must(fakeNode.rows.length===0,'coop_nonexistent_node_denied');
 const fakeClaim=await get(idleSql,['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',key]);
 must(fakeClaim.rows.length===0,'missing_claim_never_creates_credit');
 // New future enrollment is ineligible even if it belongs to same account.
 const futureParty='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 const futureStart='2026-12-01T00:00:00Z';
 const futureEnd='2026-12-08T00:00:00Z';
 await db.query('insert into private.party_event_weeks_v11 values ($1::uuid,$2::timestamptz,$3::timestamptz)',
  [futureParty,futureStart,futureEnd]);
 await db.query(`insert into private.party_event_roster_v11 values
 ($1::uuid,$2::timestamptz,$3::uuid,$4::uuid,$2::timestamptz)`,
 [futureParty,futureStart,accountA,characterA]);
 must((await get(idleSql,[sourceClaim,key])).rows.length===1,
  'future_week_cannot_mask_current_receipt_week');
 // Ambiguous source in overlapping weeks blocks credit entirely.
 const overlapParty='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
 const overlapStart='2026-11-17T00:00:00Z';
 const overlapEnd='2026-11-24T00:00:00Z';
 await db.query('insert into private.party_event_weeks_v11 values ($1::uuid,$2::timestamptz,$3::timestamptz)',
  [overlapParty,overlapStart,overlapEnd]);
 await db.query(`insert into private.party_event_roster_v11 values
 ($1::uuid,$2::timestamptz,$3::uuid,$4::uuid,$2::timestamptz)`,
 [overlapParty,overlapStart,accountA,characterA]);
 must((await get(idleSql,[sourceClaim,key])).rows.length===0,'overlap_idle_fails_closed');
 must((await get(craftSql,[sourceCraft,key])).rows.length===0,'overlap_craft_fails_closed');
 must((await get(coopSql,[runId,'NODE_A',accountA,key])).rows.length===0,'overlap_coop_fails_closed');
 console.log('PARTY_EVENTS_V43_PGLITE_OK: canonical receipt/owner, no player party selection, future/overlap blocks, no live grants');
}finally{await db.close()}
