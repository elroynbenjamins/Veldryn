/**
 * Disposable REAL PostgreSQL 17 test, two or more independent client sessions.
 * Hidden V69 -> V70 -> V87 SQL + V86 wallets, V61/V65, V80 receipt.
 * PostgreSQL only; never connect to Supabase or an external/live database.
 * Requires PARTY_V89_PG_URL pointing to ephemeral CI localhost PostgreSQL.
 * pg driver is installed into the CI runner's disposable temp directory.
 */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const url=process.env.PARTY_V89_PG_URL??'';
const driver=process.env.PARTY_V89_PG_MODULE??'';
if(!/^postgres(?:ql)?:\/\/postgres:.*@127\.0\.0\.1:54329\/postgres$/.test(url)||
 !driver.includes('/party-pg-v89/node_modules/pg'))
 throw Error('party_event_v89_disposable_local_postgres_only');
const {Pool}=require(driver);
const {createChestPostgresStoreV70}=require(
 '../.event-chest-tests/server/loot/chest-postgres-store-v70.js');
const {createChestRewardSettlementV69,deriveChestSettlementRollsV69}=require(
 '../.event-chest-tests/server/loot/chest-reward-settlement-v69.js');
const {resolveTrustedPartyChestSourceV77}=require(
 '../.event-chest-tests/server/party/weekly-party-event-chest-source-v77.js');
const {createPartyEventAtomicPortsV88}=require(
 '../.event-chest-tests/server/party/weekly-party-event-atomic-ports-v88.js');
const {createPartyEventClaimRetryV89}=require(
 '../.event-chest-tests/server/party/weekly-party-event-claim-retry-v89.js');
const pool=new Pool({connectionString:url,max:8,
 connectionTimeoutMillis:5000,idleTimeoutMillis:1500});
const account='11111111-1111-4111-8111-111111111111';
const foreign='22222222-2222-4222-8222-222222222222';
const hero='33333333-3333-4333-8333-333333333333';
const foreignHero='44444444-4444-4444-8444-444444444444';
const party='55555555-5555-4555-8555-555555555555';
const reservation='66666666-6666-4666-8666-666666666666';
const order='77777777-7777-4777-8777-777777777777';
const donation='88888888-8888-4888-8888-888888888888';
const optionalOrders=[order,'77777777-7777-4777-8777-777777777778','77777777-7777-4777-8777-777777777779'];
const digest='a'.repeat(64),snapshot='b'.repeat(64);
const week=Date.UTC(2026,10,9),end=week+604800000,
 attested=end+3600000,issued=end+7200000;
const key=k=>'party-event:'+week+':'+account+':'+k;
const identity={partyId:party,accountId:account,eventStartsAtUtcMs:week};
const proof={
 source:'private_party_event_settlement_join_v61',
 week:{partyId:party,eventStartsAtUtcMs:week,eventEndsAtUtcMs:end,
  settledAtUtcMs:attested,status:'settled',
  family:'broken_caravan',difficulty:'standard'},
 roster:{...identity,rosterSize:2,frozenCharacterId:hero},
 activity:{...identity,activityPoints:25,
  sourceVersion:'party_event_member_progress_v14'},
 preparation:{...identity,committedDonationId:donation,
  optionalSupplyGoalReceiptId:order,optionalGoalFrozen:true},
 finale:{partyId:party,eventStartsAtUtcMs:week,
  canonicalFinaleReceiptId:reservation,serverVerifiedVictory:true},
 tier:{...identity,eligibleGearTier:2,sourceVersion:'server_level_snapshot_v2'},
};
function sql(path){
 const text=readFileSync(new URL(path,import.meta.url),'utf8');
 const lines=text.split(/\r?\n/);
 const start=lines.findIndex(x=>x.trim().toLowerCase()==='begin;');
 const stop=lines.findLastIndex(x=>x.trim().toLowerCase()==='commit;');
 assert.ok(start>=0&&stop>start,'bounded review DDL');
 return lines.slice(start+1,stop).join('\n');
}
const migrations=[
 '../../docs/roadmap/party-events/hidden-migrations/20261119104500_universal_chest_ledger_v70.sql',
 '../../docs/roadmap/party-events/hidden-migrations/20261119070000_party_event_reward_ledger_v61.sql',
 '../../docs/roadmap/party-events/hidden-migrations/20261119094500_party_sigils_account_ledger_v65.sql',
 '../../docs/roadmap/party-events/hidden-migrations/20261121144000_party_event_real_rewards_v86_REVIEW_ONLY.sql',
 '../../docs/roadmap/party-events/hidden-migrations/20261121161500_party_event_authoritative_settlement_v87_REVIEW_ONLY.sql',
];
let releasedConnections=0,openedConnections=0,active=0,peak=0;
const connectPool={
 async connect(){
  const conn=await pool.connect();openedConnections++;active++;
  peak=Math.max(peak,active);
  return {
   query:(query,values)=>conn.query(query,values),
   release(){releasedConnections++;active--;conn.release()},
  };
 },
};
const ports={
 ...createPartyEventAtomicPortsV88(true),
 async readCanonicalSource(tx,owner,source){
  const canonical=await createPartyEventAtomicPortsV88(true)
   .readCanonicalSource(tx,owner,source);
  // Encourage an actual lock overlap. The 2nd connection starts its
  // transaction while the 1st holds V70's account-wide row lock.
  if(source===key('participation') && !seenFirstSource){
   seenFirstSource=true;
   await new Promise(resolve=>setTimeout(resolve,175));
  }
  return canonical;
 },
 readAccountOwnedDrops:async()=>[],
 async isOwnedCharacter(tx,owner,id){
  const rows=(await tx.query('SELECT id FROM public.characters '+
   'WHERE id=$1::uuid AND account_id=$2::uuid',[id,owner])).rows;
  return rows.length===1;
 },
 readApprovedEquipmentContext:async()=>({tier:2}),
};
let seenFirstSource=false;
const store=createChestPostgresStoreV70(connectPool,ports,true);
const entropy=new Map();
function secretFor(k,hit=false){
 const id=k+':'+hit;
 if(entropy.has(id))return entropy.get(id);
 const table=resolveTrustedPartyChestSourceV77({
  authenticatedAccountId:account,sourceKey:key(k),proof,
 }).lootTable;
 for(let i=1;i<256;i++){
  const s=new Uint8Array(32).fill(i);
  const rolls=deriveChestSettlementRollsV69(table,key(k),s);
  if((rolls[0].hitRoll<table.groups[0].chanceBps)===hit){
   entropy.set(id,s);return s;
  }
 }
 throw Error('party_event_v89_no_entropy_miss');
}
const buildOpen=(k,hit=false)=>{
 const open=createChestRewardSettlementV69(
  store,{secret:secretFor(k,hit)},true,
 );
 return createPartyEventClaimRetryV89(open,true);
};
const open=(k,hit=false)=>buildOpen(k,hit)({
 authenticatedAccountId:account,sourceKey:key(k),
});
async function getCount(table,where='',args=[]){
 const {rows}=await pool.query('SELECT count(*)::int AS n FROM '+table+
  (where?' WHERE '+where:''),args);
 return Number(rows[0].n);
}
async function balances(){
 const {rows:[game]}=await pool.query(
  'SELECT state FROM public.online_game_states WHERE account_id=$1',
  [account]);
 const {rows:[wallet]}=await pool.query(
  'SELECT gold::bigint::text AS value FROM public.character_wallets WHERE character_id=$1',
  [hero]);
 const {rows:[sigils]}=await pool.query(
  'SELECT balance::bigint::text AS value FROM private.party_sigils_wallet_v65 '+
  'WHERE account_id=$1',[account]);
 return {state:game.state,gold:Number(wallet.value),
  sigils:sigils?Number(sigils.value):0};
}
try{
 // The CI service contains no real user data and is discarded after this job.
 const init=[
  'CREATE SCHEMA auth;CREATE SCHEMA private;',
  'CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;',
  'CREATE TABLE auth.users(id uuid PRIMARY KEY);',
  'CREATE TABLE public.characters(id uuid PRIMARY KEY,'+
   'account_id uuid NOT NULL REFERENCES auth.users(id),UNIQUE(id,account_id));',
  'CREATE TABLE public.online_game_states(account_id uuid PRIMARY KEY,'+
   'character_id uuid NOT NULL REFERENCES public.characters(id),'+
   'state jsonb NOT NULL,revision bigint NOT NULL DEFAULT 0,'+
   'updated_at timestamptz NOT NULL DEFAULT now());',
  'CREATE TABLE public.character_wallets(character_id uuid PRIMARY KEY '+
   'REFERENCES public.characters(id),gold bigint NOT NULL CHECK(gold>=0),'+
   'updated_at timestamptz NOT NULL DEFAULT now());',
  'CREATE TABLE private.party_event_weeks_v11('+
   'party_id uuid NOT NULL,event_starts_at timestamptz NOT NULL,'+
   'event_ends_at timestamptz NOT NULL,family text NOT NULL,'+
   'difficulty text NOT NULL,status text NOT NULL,'+
   'active_stage smallint NOT NULL,PRIMARY KEY(party_id,event_starts_at));',
  'CREATE TABLE private.party_event_roster_v11('+
   'party_id uuid NOT NULL,event_starts_at timestamptz NOT NULL,'+
   'account_id uuid NOT NULL,character_id uuid NOT NULL,'+
   'PRIMARY KEY(party_id,event_starts_at,account_id));',
  'CREATE TABLE private.party_event_member_progress_v14('+
   'party_id uuid NOT NULL,event_starts_at timestamptz NOT NULL,'+
   'account_id uuid NOT NULL,activity_points integer NOT NULL);',
  'CREATE TABLE private.party_event_supply_orders_v16('+
   'id uuid PRIMARY KEY,party_id uuid NOT NULL,event_starts_at timestamptz NOT NULL,'+
   'stage smallint NOT NULL,kind text NOT NULL,'+
   'target_quantity integer NOT NULL,donated_quantity integer NOT NULL);',
  'CREATE TABLE private.party_event_supply_donations_v16('+
   'id uuid PRIMARY KEY,order_id uuid NOT NULL,'+
   'party_id uuid NOT NULL,event_starts_at timestamptz NOT NULL,'+
   'account_id uuid NOT NULL,created_at timestamptz NOT NULL);',
  'CREATE TABLE private.party_event_stage_seals_v17('+
   'party_id uuid NOT NULL,event_starts_at timestamptz NOT NULL,'+
   'stage smallint NOT NULL,sealed_at timestamptz NOT NULL);',
  'CREATE TABLE private.party_event_boss_loadouts_v18('+
   'party_id uuid NOT NULL,event_starts_at timestamptz NOT NULL,'+
   'account_id uuid NOT NULL,character_id uuid NOT NULL,'+
   'character_level integer NOT NULL,snapshot_hash text NOT NULL,'+
   'saved_at timestamptz NOT NULL);',
  'CREATE TABLE private.party_event_boss_replay_attestations_v23('+
   'reservation_id uuid PRIMARY KEY,party_id uuid NOT NULL,'+
   'event_starts_at timestamptz NOT NULL,source_digest text NOT NULL,'+
   'tiers_cleared smallint NOT NULL,worker_attested_at timestamptz NOT NULL,'+
   'rewards_granted boolean NOT NULL DEFAULT false,'+
   'reward_entitlement_created boolean NOT NULL DEFAULT false);',
  'CREATE TABLE private.reward_inbox_v1('+
   'id uuid PRIMARY KEY DEFAULT gen_random_uuid(),'+
   'account_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,'+
   'source_key text NOT NULL,source_kind text NOT NULL CHECK(source_kind IN '+
   "('party','guild','dungeon','gift')),"+
   'source_id uuid NOT NULL,title text NOT NULL,body text NOT NULL,'+
   "attachments jsonb NOT NULL DEFAULT '[]',"+
   'claimed_at timestamptz,UNIQUE(account_id,source_key));',
 ];
 for(const statement of init)await pool.query(statement);
 await pool.query('INSERT INTO auth.users VALUES($1),($2)',[account,foreign]);
 await pool.query('INSERT INTO public.characters VALUES($1,$2),($3,$4)',
  [hero,account,foreignHero,foreign]);
 await pool.query('INSERT INTO private.party_event_weeks_v11 VALUES('+
  '$1,to_timestamp($2::double precision/1000),'+
  'to_timestamp($3::double precision/1000),'+
  "'broken_caravan','standard','settled',3)",
  [party,week,end]);
 await pool.query('INSERT INTO private.party_event_roster_v11 VALUES'+
  '($1,to_timestamp($2::double precision/1000),$3,$4),'+
  '($1,to_timestamp($2::double precision/1000),$5,$6)',
  [party,week,account,hero,foreign,foreignHero]);
 await pool.query('INSERT INTO private.party_event_member_progress_v14 VALUES('+
  '$1,to_timestamp($2::double precision/1000),$3,25)',[party,week,account]);
 for(const optionalOrder of optionalOrders){
  await pool.query('INSERT INTO private.party_event_supply_orders_v16 VALUES'+
   "($1,$2,to_timestamp($3::double precision/1000),2,'optional',10,10)",
   [optionalOrder,party,week]);
 }
 await pool.query('INSERT INTO private.party_event_supply_donations_v16 VALUES'+
  '($1,$2,$3,to_timestamp($4::double precision/1000),$5,'+
  'to_timestamp($6::double precision/1000))',
  [donation,order,party,week,account,week+172800000+3600000]);
 await pool.query('INSERT INTO private.party_event_stage_seals_v17 VALUES'+
  '($1,to_timestamp($2::double precision/1000),2,'+
  'to_timestamp($3::double precision/1000))',
  [party,week,week+172800000]);
 await pool.query('INSERT INTO private.party_event_boss_loadouts_v18 VALUES'+
  '($1,to_timestamp($2::double precision/1000),$3,$4,25,$5,'+
  'to_timestamp($6::double precision/1000))',
  [party,week,account,hero,snapshot,week+86400000]);
 await pool.query('INSERT INTO private.party_event_boss_replay_attestations_v23 VALUES'+
  '($1,$2,to_timestamp($3::double precision/1000),$4,2,'+
  'to_timestamp($5::double precision/1000),false,false)',
  [reservation,party,week,digest,attested]);
 const initial={character:{id:hero,gold:100},account:{companionEssence:5},
  inventory:{capacity:2,stacks:[{itemId:'GEM_DUST',quantity:3}]},
  bank:{capacity:2,stacks:[]},overflow:{stacks:[],expiresAtMs:null}};
 await pool.query('INSERT INTO public.online_game_states VALUES('+
  '$1,$2,$3::jsonb,0,now())',
  [account,hero,JSON.stringify(initial)]);
 await pool.query('INSERT INTO public.character_wallets VALUES($1,100,now())',
  [hero]);
 for(const file of migrations)await pool.query(sql(file));
 // The worker-attested V23 boss alone cannot grant any chest.
 await assert.rejects(()=>open('participation'),
  /party_event_v87_settlement_certificate_missing_or_ambiguous/);
 assert.equal(await getCount('private.chest_reward_receipts_v70'),0);
 assert.equal(await getCount('private.party_sigils_ledger_v65'),0);
 await pool.query('INSERT INTO private.party_event_settlement_certificates_v87('+
  'party_id,event_starts_at,reservation_id,source_digest,verified_tiers_cleared,'+
  'independently_verified_victory,settled_at,issued_at) VALUES('+
  '$1,to_timestamp($2::double precision/1000),$3,$4,2,true,'+
  'to_timestamp($5::double precision/1000),'+
  'to_timestamp($6::double precision/1000))',
  [party,week,reservation,digest,attested,issued]);
 // The settlement certificate without the frozen actor/tier is insufficient.
 await assert.rejects(()=>open('participation'),
  /party_event_v87_settlement_certificate_missing_or_ambiguous/);
 assert.equal(await getCount('private.chest_reward_receipts_v70'),0);
 assert.equal(await getCount('private.party_event_reward_receipts_v61'),0);
 await pool.query('INSERT INTO private.party_event_member_tier_certificates_v87('+
  'party_id,event_starts_at,account_id,frozen_character_id,'+
  'frozen_level,frozen_loadout_hash,eligible_gear_tier) VALUES('+
  '$1,to_timestamp($2::double precision/1000),$3,$4,25,$5,2)',
  [party,week,account,hero,snapshot]);

 // Real concurrency. One fresh receipt and one committed replay, regardless
 // of which connection encounters SQLSTATE 40001 first.
 const parallel=await Promise.all([open('participation'),open('participation')]);
 assert.deepEqual(parallel.map(x=>x.replayed).sort(),[false,true]);
 assert.deepEqual(parallel[0].receipt,parallel[1].receipt);
 assert.ok(peak>=2,'independent PostgreSQL client connections overlapped');
 assert.equal(await getCount('private.chest_reward_receipts_v70'),1);
 assert.equal(await getCount('private.party_event_reward_receipts_v61'),1);
 assert.equal(await getCount('private.party_event_chest_resource_grants_v86'),4);
 assert.equal(await getCount('private.chest_reward_grant_legs_v70'),5);
 assert.equal(await getCount('private.reward_inbox_v1'),1);
 const first=await balances();
 assert.equal(first.sigils,8);
 assert.equal(first.gold,300);
 assert.equal(first.state.character.gold,300);
 assert.equal(first.state.inventory.stacks[0].quantity,5);
 assert.equal(first.state.account.companionEssence,9);

 // User spending later cannot reroll or credit a paid chest again.
 await pool.query('UPDATE public.character_wallets SET gold=250 WHERE '+
  'character_id=$1',[hero]);
 await pool.query('UPDATE public.online_game_states SET state='+
  'jsonb_set(jsonb_set(jsonb_set(state,'+
  "'{character,gold}','250'::jsonb),"+
  "'{account,companionEssence}','3'::jsonb),"+
  "'{inventory,stacks,0,quantity}','1'::jsonb) "+
  'WHERE account_id=$1',[account]);
 const replay=await open('participation');
 assert.equal(replay.replayed,true);
 assert.equal((await balances()).sigils,8);

 // A failed/new claim cannot grant only a subset of rewards.
 const full={...first.state,
  character:{...first.state.character,gold:250},
  account:{...first.state.account,companionEssence:3},
  inventory:{capacity:1,stacks:[{itemId:'OTHER',quantity:1}]},
  bank:{capacity:1,stacks:[{itemId:'ANOTHER',quantity:1}]}};
 await pool.query('UPDATE public.online_game_states SET state=$2::jsonb '+
  'WHERE account_id=$1',[account,JSON.stringify(full)]);
 await assert.rejects(()=>open('preparation'),
  /party_event_v86_inventory_and_bank_full/);
 assert.equal(await getCount('private.chest_reward_receipts_v70',
  'source_key=$1',[key('preparation')]),0);
 assert.equal(await getCount('private.party_sigils_ledger_v65'),1);
 assert.equal(await getCount('private.party_event_chest_resource_grants_v86'),4);
 assert.equal((await balances()).gold,250);
 assert.equal((await balances()).sigils,8);

 // Restore capacity and claim two DIFFERENT sources on independent clients.
 await pool.query('UPDATE public.online_game_states SET state=$2::jsonb '+
  'WHERE account_id=$1',[account,JSON.stringify({
   ...full,inventory:{capacity:2,stacks:[{itemId:'GEM_DUST',quantity:1}]},
   bank:{capacity:2,stacks:[]},
  })]);
 const others=await Promise.all([open('preparation'),open('finale')]);
 assert.ok(others.every(x=>!x.replayed));
 const paid=await balances();
 assert.equal(paid.sigils,34);
 assert.equal(paid.gold,1050); // 250 after spending +300 +500
 assert.equal(paid.state.character.gold,1050);
 assert.equal(paid.state.inventory.stacks[0].quantity,9); // 1 +3 +5
 assert.equal(paid.state.account.companionEssence,16); // 3 +5 +8
 assert.equal(await getCount('private.chest_reward_receipts_v70'),3);
 assert.equal(await getCount('private.party_event_reward_receipts_v61'),3);
 assert.equal(await getCount('private.party_sigils_ledger_v65'),3);
 assert.equal(await getCount('private.party_event_chest_resource_grants_v86'),12);
 assert.equal(await getCount('private.chest_reward_grant_legs_v70'),15);
 assert.equal(await getCount('private.reward_inbox_v1'),3);
 assert.equal(active,0);
 assert.equal(openedConnections,releasedConnections);
 console.log('PARTY_EVENT_V89_POSTGRES17_OK: independent transactions, duplicate same source replay, two distinct simultaneous chests, rollback, no lost-ACK double payment');
}finally{
 await pool.end();
}
