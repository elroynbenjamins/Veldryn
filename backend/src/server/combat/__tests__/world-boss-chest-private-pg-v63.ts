import {createHash} from 'node:crypto';
import {claimWorldBossChestV61,type WorldBossChestReceiptV61} from '../world-boss-chest-settlement-v61';
import {createWorldBossChestPrivatePgV63,
 type WorldBossChestPgDriverV63,type WorldBossChestPgTransactionV63,
 type WorldBossChestPgPortsV63} from '../world-boss-chest-private-pg-v63';
import {worldBossCatalogTierUnlocksV67,worldBossTierForVerifiedAccountLevelV67}
 from '../world-boss-tier-policy-v67';
import {deriveServerChestRollsV1} from '../../loot/event-chest-server-roll-v1';
function check(v:unknown,msg:string):asserts v{
 if(!v)throw Error('world_boss_v63_test:'+msg);
}
async function rejects(fn:()=>Promise<unknown>|unknown,code:string){
 let failed=false;try{await fn();}catch(e){failed=String(e).includes(code);}
 check(failed,'expected_'+code);
}
const event='11111111-1111-4111-8111-111111111111';
const account='22222222-2222-4222-8222-222222222222';
const source='world-boss:'+event+':'+account+':donations_goal';
const selection={token:'private-test-token',eventId:event,kind:'donations_goal' as const};
const tiers=worldBossCatalogTierUnlocksV67();
check(tiers.length===9&&tiers[0].tier==='T1'&&tiers[8].tier==='T9',
 'nine_canonical_catalog_tiers');
check(worldBossTierForVerifiedAccountLevelV67({
 highestOwnedCharacterLevel:tiers[0].minLevel})==='T1','lowest_tier');
check(worldBossTierForVerifiedAccountLevelV67({
 highestOwnedCharacterLevel:tiers[8].minLevel})==='T9','top_tier');
for(let i=1;i<tiers.length;i++){
 check(worldBossTierForVerifiedAccountLevelV67({
  highestOwnedCharacterLevel:tiers[i].minLevel-1})===tiers[i-1].tier,
  'no_early_tier_'+i);
}
await rejects(()=>worldBossTierForVerifiedAccountLevelV67({
 highestOwnedCharacterLevel:0}),'invalid_verified_level');
await rejects(()=>worldBossTierForVerifiedAccountLevelV67({
 highestOwnedCharacterLevel:10,
 unlocks:[...tiers.slice(0,4),tiers[3],...tiers.slice(5)],
}),'untrusted_tier_policy');
function secretFor(hit:boolean){
 for(let i=0;i<6000;i++){
  const secret=createHash('sha256').update('world-boss-v63-pg-fixture-'+i).digest();
  const r=deriveServerChestRollsV1({
   secret,domain:'world_boss_v58',committedChestKey:source,
  }).hitRoll;
  if((r<100)===hit)return secret;
 }
 throw Error('world_boss_v63_test_no_entropy');
}
const winner=secretFor(true);
const miss=secretFor(false);
type ItemRow={instanceId:string;sourceKey:string;accountId:string;eventId:string;bossId:string;slot:string};
type DbState={
 receipts:Map<string,WorldBossChestReceiptV61>;
 items:Map<string,ItemRow>;
 grants:Set<string>;
 inbox:Set<string>;
 gold:number;
};
function state():DbState{
 return {receipts:new Map(),items:new Map(),grants:new Set(),
  inbox:new Set(),gold:0};
}
function clone(s:DbState):DbState{
 return {...s,receipts:new Map(s.receipts),items:new Map(s.items),
  grants:new Set(s.grants),inbox:new Set(s.inbox)};
}
class PgFixture implements WorldBossChestPgDriverV63{
 data=state();sql:string[]=[];txCount=0;issueCount=0;
 status:'active'|'draft'='active';
 fail:'none'|'resources'|'inbox'='none';
 private pending=Promise.resolve();
 async withTransaction<T>(work:(tx:WorldBossChestPgTransactionV63)=>Promise<T>):Promise<T>{
  const prior=this.pending;let release!:()=>void;
  this.pending=new Promise<void>(done=>release=done);
  await prior;
  const data=clone(this.data);
  this.txCount++;
  const query=async <T extends object>(sql:string,args:readonly unknown[]):Promise<{rows:T[]}>=>{
   this.sql.push(sql);
   const rows:object[]=[];
   if(sql.startsWith('SET TRANSACTION')){}
   else if(sql.includes('FROM private.world_boss_events_v17')){
    rows.push({eventId:event,bossId:'sunscar',status:this.status,
     initialHp:'1000',remainingHp:'300'});
   }else if(sql.includes('world_boss_v57_assert_write_open')){}
   else if(sql.includes('pg_advisory_xact_lock')){}
   else if(sql.includes('FROM private.world_boss_war_camps_v27')){
    rows.push({fortifications:2,fieldProvisions:2,siegecraft:0,
     fortTier1:1,fieldTier1:1,siegeTier1:1,
     fortTier2:3,fieldTier2:3,siegeTier2:3});
   }else if(sql.includes('FROM private.world_boss_war_donations_v27')){
    rows.push({eventId:event,accountId:account,requestId:'validdonation1'});
   }else if(sql.includes('FROM private.world_boss_attempts_v17 a')){
    for(let ordinal=1;ordinal<=3;ordinal++){
     rows.push({eventId:event,accountId:account,requestId:'attackreq'+ordinal,
      ordinal,status:'committed',replayProof:'verified'});
    }
   }else if(sql.includes('SELECT DISTINCT slot FROM private.world_boss_gathering_items_v67')){
    rows.push(...['helmet','chest','gloves','legs','boots','weapon','offhand','cape','amulet']
     .map(slot=>({slot})));
   }else if(sql.includes('SELECT immutable_receipt AS receipt')){
    const receipt=data.receipts.get(args[2] as string);
    if(receipt)rows.push({receipt});
   }else if(sql.includes('INSERT INTO private.world_boss_gathering_items_v67')){
    const key=args[0] as string;
    if(data.items.has(key))throw Error('item_source_conflict');
    this.issueCount++;
    const instanceId='44444444-4444-4444-8444-444444444444';
    data.items.set(key,{instanceId,sourceKey:key,accountId:account,
     eventId:event,bossId:'sunscar',slot:args[4] as string});
    rows.push({instanceId});
   }else if(sql.includes('INSERT INTO private.world_boss_chest_receipts_v61')){
    const key=args[4] as string;
    if(data.receipts.has(key))throw Error('receipt_source_conflict');
    data.receipts.set(key,JSON.parse(args[13] as string) as WorldBossChestReceiptV61);
    rows.push({sourceKey:key});
   }else if(sql.includes('INSERT INTO private.world_boss_chest_grant_sources_v61')){
    const key=args[0]+':'+args[1];
    if(data.grants.has(key))throw Error('duplicate_component');
    data.grants.add(key);
   }else if(sql.includes('SELECT instance_id::text AS "instanceId"')){
    const found=data.items.get(args[0] as string);
    if(found)rows.push({instanceId:found.instanceId});
   }else throw Error('world_boss_v63_unexpected_sql:'+sql.slice(0,90));
   return {rows:rows as T[]};
  };
  try{
   const answer=await work({query});
   this.data=data;return answer;
  }finally{release();}
 }
}
const ports=(pg:PgFixture):WorldBossChestPgPortsV63=>({
 readHighestOwnedCharacterLevel:async()=>tiers[8].minLevel,
 grantAccountResources:async(_tx,_key,_account,reward)=>{
  if(pg.fail==='resources')throw Error('fixture_resources_failure');
  // Same private transaction represented by staged fixture state for this test;
  // durable resource backing remains an explicit V63 external port.
  check(reward.gold===450&&reward.gemDust===2,'correct_resource_amounts');
 },
 insertAccountInbox:async()=>{
  if(pg.fail==='inbox')throw Error('fixture_inbox_failure');
 },
});
async function run(){
 await rejects(()=>createWorldBossChestPrivatePgV63(new PgFixture(),
  ports(new PgFixture())),'hidden_adapter_disabled');
 const pg=new PgFixture();
 const store=createWorldBossChestPrivatePgV63(pg,ports(pg),true);
 const first=await claimWorldBossChestV61(selection,{
  authenticate:async()=>account,secret:winner,store,
 },true);
 check(first.status==='committed'&&first.gearHit&&
  first.frozenGear?.tier==='T9'&&first.frozenGear?.slot==='Ring',
  'catalog_tier_and_missing_ring_item');
 check(pg.data.receipts.size===1&&pg.data.items.size===1&&
  pg.issueCount===1&&pg.data.grants.size===6,'all_grant_source_rows');
 check(pg.sql[0].startsWith('SET TRANSACTION'),'read_committed_transaction_start');
 check(pg.sql[1].includes('FROM private.world_boss_events_v17'),'event_lock_first');
 check(pg.sql[2].includes('world_boss_v57_assert_write_open'),'v57_after_event_lock');
 check(pg.sql[3].includes('pg_advisory_xact_lock'),'source_lock_after_fence');
 const second=await claimWorldBossChestV61(selection,{
  authenticate:async()=>account,secret:miss,store,
 },true);
 check(JSON.stringify(first)===JSON.stringify(second)&&pg.issueCount===1,
  'retry_secret_rotation_returns_first_item');
 const racing=new PgFixture();
 const parallel=createWorldBossChestPrivatePgV63(racing,ports(racing),true);
 const [a,b]=await Promise.all([
  claimWorldBossChestV61(selection,{authenticate:async()=>account,
   secret:winner,store:parallel},true),
  claimWorldBossChestV61(selection,{authenticate:async()=>account,
   secret:winner,store:parallel},true),
 ]);
 check(JSON.stringify(a)===JSON.stringify(b)&&racing.issueCount===1,
  'parallel_claim_single_item');
 for(const fail of ['resources','inbox'] as const){
  const broken=new PgFixture();broken.fail=fail;
  const locked=createWorldBossChestPrivatePgV63(broken,ports(broken),true);
  await rejects(()=>claimWorldBossChestV61(selection,{
   authenticate:async()=>account,secret:winner,store:locked,
  },true),'fixture_'+fail+'_failure');
  check(broken.data.receipts.size===0&&broken.data.items.size===0&&
   broken.data.grants.size===0,'rollback_claim_and_item_'+fail);
  broken.fail='none';
  const fixed=await claimWorldBossChestV61(selection,{
   authenticate:async()=>account,secret:winner,store:locked,
  },true);
  check(fixed.gearHit&&broken.data.items.size===1,
   'retry_after_rollback_'+fail);
 }
 const draft=new PgFixture();draft.status='draft';
 await rejects(()=>claimWorldBossChestV61(selection,{
  authenticate:async()=>account,secret:winner,
  store:createWorldBossChestPrivatePgV63(draft,ports(draft),true),
 },true),'invalid_event');
 check(draft.data.items.size===0,'draft_event_no_issuance');
 console.log('WORLD_BOSS_V63_PG_OK: event-first V57 lock, proof receipts, tier parity, parallel retries, atomic rollback');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
