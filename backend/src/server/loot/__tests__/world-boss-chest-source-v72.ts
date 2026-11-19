import {
 readWorldBossTrustedChestSourceV72,
 WORLD_BOSS_SHARED_CHEST_SOURCE_V72_RELEASED,
 WORLD_BOSS_SHARED_CHEST_PROOF_VERSION_V72,
 type WorldBossChestSourcePortV72,
} from '../world-boss-chest-source-v72';
import type {WorldBossCanonicalChestReadV59}
 from '../../combat/world-boss-chest-proof-v59';
import {worldBossChestGuaranteeV58}
 from '../../combat/world-boss-chests-v58';
import type {ChestSqlV70} from '../chest-postgres-store-v70';

function check(ok:unknown,reason:string):asserts ok{
 if(!ok)throw Error('world_boss_v72_test:'+reason);
}
async function rejects(fn:()=>Promise<unknown>,code:string){
 let matched=false;
 try{await fn()}catch(error){matched=String(error).includes(code)}
 check(matched,'expected_'+code);
}
const eventId='11111111-1111-4111-8111-111111111111';
const accountId='22222222-2222-4222-8222-222222222222';
const other='33333333-3333-4333-8333-333333333333';
const kinds=['donations_goal','three_attempts','community_damage_goal'] as const;
const source=(kind:typeof kinds[number])=>
 'world-boss:'+eventId+':'+accountId+':'+kind;
const canonical:WorldBossCanonicalChestReadV59={
 eventId,accountId,event:{bossId:'hollowroot',initialHp:1000,remainingHp:300},
 warCamp:{
  eventId,trackTiers:{fortifications:1,fieldProvisions:1,siegecraft:0},
  ownDonationReceipts:[{
   eventId,accountId,requestId:'donation_0001',status:'committed',
  }],
 },
 attacks:[1,2,3].map(ordinal=>({
  eventId,accountId,ordinal,requestId:'attack_000'+ordinal,
  status:'committed' as const,replayProof:'verified' as const,
 })),
};
let reads=0;
let proof:WorldBossCanonicalChestReadV59=canonical;
const tx:ChestSqlV70={
 async query<T extends Record<string,unknown>>():Promise<{rows:T[]}>{
  throw Error('V72 source mock must not perform unaudited SQL');
 },
 release(){throw Error('V72 port must not release the locked connection')},
};
const port:WorldBossChestSourcePortV72={
 readCanonicalInLockedTransaction:async(sameTx,event,owner)=>{
  check(sameTx===tx,'same_pinned_v70_connection');
  reads++;
  check(event===eventId&&owner===accountId,'private_lookup_bound');
  return proof;
 },
};
async function run(){
 check(WORLD_BOSS_SHARED_CHEST_SOURCE_V72_RELEASED===false,'release_off');
 await rejects(()=>readWorldBossTrustedChestSourceV72({
  authenticatedAccountId:accountId,sourceKey:source('donations_goal'),
 },tx,port),'unreleased');
 check(reads===0,'no_private_read_while_disabled');
 for(const kind of kinds){
  const trusted=await readWorldBossTrustedChestSourceV72({
   authenticatedAccountId:accountId,sourceKey:source(kind),
  },tx,port,true);
  const guarantee=worldBossChestGuaranteeV58(kind);
  check(trusted.earned===true&&trusted.accountId===accountId&&
   trusted.sourceKey===source(kind)&&
   trusted.proofVersion===WORLD_BOSS_SHARED_CHEST_PROOF_VERSION_V72&&
   trusted.equipmentDeliveryMode==='account_unclaimed'&&
   trusted.recipientCharacterId===null,'identity_custody_'+kind);
  check(trusted.lootTable.tableId==='world_boss_chest'&&
   trusted.lootTable.version==='world_boss_v58_hollowroot_'+kind&&
   trusted.lootTable.groups.length===1&&
   trusted.lootTable.groups[0]!.chanceBps===100&&
   trusted.lootTable.groups[0]!.entries.length===10&&
   trusted.lootTable.groups[0]!.duplicatePolicy==='prefer_unowned',
   'original_one_percent_ten_piece_policy_'+kind);
  const actual=new Map(trusted.lootTable.guarantees.map(g=>[g.id,g.quantity]));
  check(actual.size===4&&actual.get('gold')===guarantee.gold&&
   actual.get('companion_essence')===guarantee.companionEssence&&
   actual.get('gem_dust')===guarantee.gemDust&&
   actual.get('tempering_dust')===guarantee.temperingDust,
   'original_four_guarantees_'+kind);
 }
 // Rotation selects the gathering collection strictly from the event,
 // never from the supplied chest kind or a client boss selector.
 for(const bossId of ['sunscar','frostmarch'] as const){
  proof={...canonical,event:{...canonical.event,bossId}};
  const rotated=await readWorldBossTrustedChestSourceV72({
   authenticatedAccountId:accountId,sourceKey:source('donations_goal'),
  },tx,port,true);
  check(rotated.lootTable.version===
   'world_boss_v58_'+bossId+'_donations_goal'&&
   rotated.lootTable.groups[0]!.chanceBps===100,
   'server_owned_boss_rotation_'+bossId);
 }
 proof=canonical;
 await rejects(()=>readWorldBossTrustedChestSourceV72({
  authenticatedAccountId:other,sourceKey:source('donations_goal'),
 },tx,port,true),'invalid_account_source');
 await rejects(()=>readWorldBossTrustedChestSourceV72({
  authenticatedAccountId:accountId,sourceKey:source('donations_goal')+':extra',
 },tx,port,true),'invalid_account_source');
 await rejects(()=>readWorldBossTrustedChestSourceV72({
  authenticatedAccountId:accountId,sourceKey:source('donations_goal')
   .replace('world-boss:','party-event:'),
 },tx,port,true),'invalid_account_source');
 check(reads===5,'invalid_selection_never_queries_private_state');
 proof={...canonical,accountId:other};
 await rejects(()=>readWorldBossTrustedChestSourceV72({
  authenticatedAccountId:accountId,sourceKey:source('donations_goal'),
 },tx,port,true),'cross_account_proof');
 proof={...canonical,warCamp:{
  ...canonical.warCamp,ownDonationReceipts:[],
 }};
 await rejects(()=>readWorldBossTrustedChestSourceV72({
  authenticatedAccountId:accountId,sourceKey:source('donations_goal'),
 },tx,port,true),'unearned_chest');
 proof={...canonical,attacks:canonical.attacks.map(attack=>({
  ...attack,replayProof:'pending' as const,
 }))};
 await rejects(()=>readWorldBossTrustedChestSourceV72({
  authenticatedAccountId:accountId,sourceKey:source('three_attempts'),
 },tx,port,true),'unearned_chest');
 await rejects(()=>readWorldBossTrustedChestSourceV72({
  authenticatedAccountId:accountId,sourceKey:source('community_damage_goal'),
 },tx,port,true),'unearned_chest');
 proof={...canonical,attacks:[]};
 await rejects(()=>readWorldBossTrustedChestSourceV72({
  authenticatedAccountId:accountId,sourceKey:source('three_attempts'),
 },tx,port,true),'unearned_chest');
 await rejects(()=>readWorldBossTrustedChestSourceV72({
  authenticatedAccountId:accountId,sourceKey:source('community_damage_goal'),
 },tx,port,true),'unearned_chest');
 proof={...canonical,event:{...canonical.event,remainingHp:301}};
 await rejects(()=>readWorldBossTrustedChestSourceV72({
  authenticatedAccountId:accountId,sourceKey:source('community_damage_goal'),
 },tx,port,true),'unearned_chest');
 proof=canonical;
 const previous=process.env.NODE_ENV;
 try{
  process.env.NODE_ENV='production';
  await rejects(()=>readWorldBossTrustedChestSourceV72({
   authenticatedAccountId:accountId,sourceKey:source('donations_goal'),
  },tx,port,true),'unreleased');
 }finally{process.env.NODE_ENV=previous}
 console.log('WORLD_BOSS_V72_OK: private source binding, three replay-proven milestones, original 1% policy, forged proof denial, production off');
}
run().catch(error=>{console.error(error);throw error});
