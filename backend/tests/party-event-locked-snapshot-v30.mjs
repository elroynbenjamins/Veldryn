/**
 * v30 read-only locked-inspection SQL integration fixture.
 * Executes in a throwaway in-memory PGlite instance, never production.
 */
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {PGlite} from '@electric-sql/pglite';
const filepath=fileURLToPath(new URL(
 '../../docs/roadmap/party-events/hidden-migrations/20261115190000_party_event_locked_claim_snapshot_v30.sql',
 import.meta.url));
const migration=readFileSync(filepath,'utf8');
// Regression for EVERY draft writer touching an event-claim account.
 // The prior v25 preflight locked character -> online, while quote locked
 // wallet -> online; both differed from v30's online -> character -> wallet.
 // This graph check prevents restoring their opposite acquisition order.
const v25Files=[
 ['prepare_party_event_claim_preflight_v25',
  '20261113224500_party_event_claim_preflight_v25.sql',
  ['perform pg_advisory_xact_lock(', 
   'select * into w from private.party_event_weeks_v11',
   'where id=p_offer_id for update;',
   'select * into game from public.online_game_states',
   'select c.inventory_capacity into v_cap from public.characters']],
 ['prepare_party_event_claim_quote_v25',
  '20261113230000_party_event_reward_claim_quote_v25.sql',
  ['perform pg_advisory_xact_lock(',
   'select * into w from private.party_event_weeks_v11',
   'where id=p_offer_id for update;',
   'select state into v_state from public.online_game_states',
   'select gold into v_wallet_gold from public.character_wallets']],
];
for(const [name,file,steps] of v25Files){
 const source=readFileSync(fileURLToPath(new URL(
  '../../docs/roadmap/party-events/hidden-migrations/'+file,import.meta.url)),'utf8');
 const start=source.indexOf('create or replace function private.'+name+'(');
 // PL/pgSQL function bodies end with `end;$;` (two dollar signs).
 // Keep this delimited to the named writer so the lock-order checks cannot
 // accidentally scan a later function or bypass a missing writer.
 const end=source.indexOf('end;$;',start);
 if(start<0||end<start)throw Error('v30_missing_v25_writer_'+name);
 const body=source.slice(start,end);
 const positions=steps.map(step=>body.indexOf(step));
 if(positions.some(x=>x<0)||
   positions.some((x,i)=>i>0&&x<=positions[i-1])||
   !body.includes("hashtextextended('party-account:'||p_account_id::text,0)")){
  throw Error('v30_v25_lock_hierarchy_regression_'+name);
 }
}
// Prevent account/offer lock inversion with the existing v25 week-first
// preflight: an unlocked offer locator must precede WEEK row locking,
// which must precede taking the OFFER update lock.
const locate=migration.indexOf(
 'where id=p_offer_id and account_id=p_account_id;');
const lockWeek=migration.indexOf(
 'where party_id=o.party_id and event_starts_at=o.event_starts_at\n  for update;');
const lockOffer=migration.indexOf(
 'where id=p_offer_id and account_id=p_account_id for update;');
if(!(locate>=0&&locate<lockWeek&&lockWeek<lockOffer)){
 throw Error('v30_incorrect_account_week_offer_lock_order');
}
if(!migration.includes("w.status not in ('active','closed','settled')")){
 throw Error('v30_settled_week_claim_window_regressed');
}
const db=await PGlite.create();
const account='11111111-1111-4111-8111-111111111111';
const offer='33333333-3333-4333-8333-333333333333';
function must(v,m){if(!v)throw Error('v30_locked_sql_'+m);}
async function denied(promise,message){
 try{await promise;throw Error('unexpected_success');}
 catch(e){must(String(e).includes(message),
  'expected_'+message+'_got_'+String(e));}
}
async function run(){
 await db.exec(`
  create schema private;
  create role anon;
  create role authenticated;
  create role service_role;
  create table private.party_event_reward_offers_v24(
    id uuid primary key,account_id uuid not null
  );
 `);
 await db.exec(migration);
 const fn=await db.query(`select p.prosecdef,p.provolatile,n.nspname
  from pg_proc p join pg_namespace n on p.pronamespace=n.oid
  where p.proname='inspect_party_event_claim_lock_v30'`);
 must(fn.rows.length===1&&fn.rows[0].prosecdef===true
  &&fn.rows[0].provolatile==='v'&&fn.rows[0].nspname==='private',
  'private_transaction_scoped_function');
 const grants=await db.query(`select
  has_function_privilege('anon',
   'private.inspect_party_event_claim_lock_v30(uuid,uuid)','EXECUTE') a,
  has_function_privilege('authenticated',
   'private.inspect_party_event_claim_lock_v30(uuid,uuid)','EXECUTE') b,
  has_function_privilege('service_role',
   'private.inspect_party_event_claim_lock_v30(uuid,uuid)','EXECUTE') s`);
 must(grants.rows[0].a===false&&grants.rows[0].b===false
  &&grants.rows[0].s===true,'no_player_sql_execute');
 const q=`select private.inspect_party_event_claim_lock_v30(
  $1::uuid,$2::uuid) as snapshot`;
 await denied(db.query(q,[null,account]),'trusted_ids_required');
 await denied(db.query(q,[offer,account]),'offer_not_owned');
 const summary=await db.query(`select count(*)::int n from pg_proc p
  join pg_namespace n on p.pronamespace=n.oid where
  n.nspname='private' and p.proname like '%pay%v30'`);
 must(summary.rows[0].n===0,'no_payout_writer_created');
 console.log('Party Events v30 PGlite: private inspect-only SQL, no public execute, locked account/offer ownership, fail-closed and zero payout writers');
}
run().then(()=>db.close()).catch(async e=>{
 console.error(e);try{await db.close();}catch{}
 process.exitCode=1;
});
