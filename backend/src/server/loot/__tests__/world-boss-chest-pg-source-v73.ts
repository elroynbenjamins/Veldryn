import {
 WORLD_BOSS_CHEST_PG_SOURCE_V73_RELEASED,
 assertWorldBossChestWriteOpenV73,
 createWorldBossChestSourcePortsV73,
 readCanonicalWorldBossChestV73,
} from '../world-boss-chest-pg-source-v73';
import type {ChestSqlV70} from '../chest-postgres-store-v70';

function check(ok:unknown,why:string):asserts ok{
 if(!ok)throw Error('world_boss_v73_test:'+why);
}
async function rejects(fn:()=>Promise<unknown>,code:string){
 let caught=false;try{await fn()}catch(e){caught=String(e).includes(code)}
 check(caught,'expected_'+code);
}
const event='11111111-1111-4111-8111-111111111111';
const owner='22222222-2222-4222-8222-222222222222';
const foreign='33333333-3333-4333-8333-333333333333';
const source=(kind:string) =>
 'world-boss:'+event+':'+owner+':'+kind;
type SqlCall={sql:string;params:readonly unknown[]};
function fixture(){
 const calls:SqlCall[]=[];
 const config={
  status:'active',fenced:false,boss:'hollowroot',
  damageRemaining:'300',donated:true,proofs:3,
  campOwner:event,foreignDonation:false,foreignAttack:false,
 };
 const tx:ChestSqlV70={
  async query<T extends Record<string,unknown>>(sql:string,
   params:readonly unknown[]=[]):Promise<{rows:T[]}>{
   calls.push({sql,params});
   let rows:Record<string,unknown>[]=[];
   if(sql.includes('FOR UPDATE')&&
    sql.includes('private.world_boss_events_v17')){
    rows=[{event_id:event,status:config.status}];
   }else if(sql.includes('world_boss_v57_assert_write_open')){
    if(config.fenced)throw Error('WB57_ACCOUNT_ERASURE_FENCED');
   }else if(sql.includes('max_hp::text AS initial_hp')){
    rows=[{event_id:event,boss_id:config.boss,status:config.status,
     initial_hp:'1000',remaining_hp:config.damageRemaining}];
   }else if(sql.includes('private.world_boss_war_camps_v27')){
    rows=[{event_id:config.campOwner,fortifications:2,
     field_provisions:3,siegecraft:0,fort_tier1:1,fort_tier2:3,
     field_tier1:2,field_tier2:4,siege_tier1:3,siege_tier2:5}];
   }else if(sql.includes('private.world_boss_war_donations_v27')){
    if(config.donated)rows=[{event_id:event,
     account_id:config.foreignDonation?foreign:owner,
     request_id:'donate_00001'}];
   }else if(sql.includes('private.world_boss_attempts_v17 a')){
    rows=[1,2,3].map(i=>({
     event_id:event,account_id:config.foreignAttack?foreign:owner,
     request_id:'attack_0000'+i,ordinal:i,status:'committed',
     replay_proof:i<=config.proofs?'verified':'absent',
    }));
   }else throw Error('world_boss_v73_test_unexpected_sql:'+sql);
   return {rows:rows as T[]};
  },
  release(){throw Error('world_boss_v73_test_unexpected_release')},
 };
 return {tx,calls,config};
}
async function run(){
 check(WORLD_BOSS_CHEST_PG_SOURCE_V73_RELEASED===false,'not_live');
 const a=fixture();
 const ports=createWorldBossChestSourcePortsV73();
 await ports.assertSourceWriteOpen(a.tx,owner,source('donations_goal'));
 check(a.calls.length===2&&
  a.calls[0]!.sql.includes('FOR UPDATE')&&
  a.calls[0]!.sql.includes('world_boss_events_v17')&&
  a.calls[1]!.sql.includes('world_boss_v57_assert_write_open')&&
  a.calls[0]!.params[0]===event&&a.calls[1]!.params[0]===owner,
  'event_then_v57_before_account_row');
 for(const kind of ['donations_goal','three_attempts',
  'community_damage_goal']){
  const proof=await ports.readCanonicalSource(a.tx,owner,source(kind));
  check(proof.earned===true&&proof.accountId===owner&&
   proof.equipmentDeliveryMode==='account_unclaimed'&&
   proof.lootTable.version==='world_boss_v58_hollowroot_'+kind&&
   proof.lootTable.groups[0]!.chanceBps===100,
   'verified_source_and_legacy_odds_'+kind);
 }
 check(a.calls.some(c=>c.sql.includes('private.world_boss_war_donations_v27')&&
  c.params[0]===event&&c.params[1]===owner),
  'donation_both_keys_bound');
 check(a.calls.some(c=>c.sql.includes('private.world_boss_attempts_v17 a')&&
  c.sql.includes('p.replay_digest=a.replay_digest')&&
  c.sql.includes("a.status='committed'")&&
  c.params[0]===event&&c.params[1]===owner),
  'strong_replay_digest_match_and_account_scope');
 const previous=a.calls.length;
 await rejects(()=>ports.readCanonicalSource(a.tx,foreign,
  source('donations_goal')),'invalid_account_source');
 check(a.calls.length===previous,'foreign_identity_no_sql');
 a.config.fenced=true;
 await rejects(()=>ports.assertSourceWriteOpen(
  a.tx,owner,source('donations_goal')),'ACCOUNT_ERASURE_FENCED');
 a.config.fenced=false;
 a.config.status='draft';
 await rejects(()=>ports.assertSourceWriteOpen(
  a.tx,owner,source('donations_goal')),'event_not_claimable');
 a.config.status='active';
 a.config.foreignDonation=true;
 await rejects(()=>ports.readCanonicalSource(
  a.tx,owner,source('donations_goal')),'foreign_donation');
 a.config.foreignDonation=false;
 a.config.foreignAttack=true;
 await rejects(()=>ports.readCanonicalSource(
  a.tx,owner,source('three_attempts')),'foreign_or_unproven_attempt');
 a.config.foreignAttack=false;
 a.config.proofs=2;
 await rejects(()=>ports.readCanonicalSource(
  a.tx,owner,source('three_attempts')),'unearned_chest');
 a.config.proofs=0;
 await rejects(()=>ports.readCanonicalSource(
  a.tx,owner,source('community_damage_goal')),'unearned_chest');
 a.config.proofs=3;a.config.damageRemaining='301';
 await rejects(()=>ports.readCanonicalSource(
  a.tx,owner,source('community_damage_goal')),'unearned_chest');
 a.config.damageRemaining='300';
 a.config.campOwner=foreign;
 await rejects(()=>readCanonicalWorldBossChestV73(
  a.tx,event,owner),'foreign_camp');
 a.config.campOwner=event;
 const old=process.env.NODE_ENV;
 try{
  process.env.NODE_ENV='production';
  await rejects(()=>ports.assertSourceWriteOpen(
   a.tx,owner,source('donations_goal')),'unreleased');
  await rejects(()=>ports.readCanonicalSource(
   a.tx,owner,source('donations_goal')),'unreleased');
 }finally{process.env.NODE_ENV=old;}
 console.log('WORLD_BOSS_V73_OK: event-first erasure guard, pinned account-scoped V17/V27/V28 SQL, replay digest, all three chests and production off');
}
run().catch(e=>{console.error(e);throw e});
