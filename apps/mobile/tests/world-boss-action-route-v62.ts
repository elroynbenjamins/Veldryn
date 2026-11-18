/** V62 transport/owner tests only; does NOT simulate a World Boss encounter. */
import {assert} from './test-assert';
import {handleWorldBossActionV62,WORLD_BOSS_V62_ACTION_HTTP_LIVE,
 type WorldBossActionDepsV62} from '../../../backend/online/world-boss-current-action-v62';
import type {WorldBossOverviewRowV41} from '../../../backend/online/world-boss-overview-v41';
import {createWorldBossGateAttestationPgV63,WORLD_BOSS_V63_GATE_ATTESTATION_LIVE} from '../../../backend/online/world-boss-gate-attestation-v63';

const DAY=86400000,START=Date.UTC(2026,10,16),NOW=START+DAY;
const EVENT='30000000-0000-4000-8000-000000000062';
const OWNER='10000000-0000-4000-8000-000000000062';
const OTHER='10000000-0000-4000-8000-000000000063';
const CHARACTER='20000000-0000-4000-8000-000000000062';
const TOKEN='jwt-v62-private-synthetic-session';
const requestId='REQUEST_V62_SAFE_01';
const row=():WorldBossOverviewRowV41=>({
 schema:'world-boss-overview-v41',eventId:EVENT,accountId:OWNER,
 bossId:'hollowroot',status:'active',phase:'preparation',
 startsAtUtcMs:START,endsAtUtcMs:START+7*DAY,readAtUtcMs:NOW,
 maxHp:100000,remainingHp:75000,eventRevision:2,
 attemptsUsed:1,attemptsReserved:0,attemptsCommitted:1,donationsUsed:1,
 warCamp:{eventId:EVENT,revision:2,
  contributions:{fortifications:1,fieldProvisions:1,siegecraft:0},
  goals:{fortifications:{tier1At:1,tier2At:3},
   fieldProvisions:{tier1At:1,tier2At:3},
   siegecraft:{tier1At:1,tier2At:3}},
  frozen:false,snapshot:null},
 rewards:{balance:5,walletRevision:1,claimedThisEvent:5,eventCap:100},
});
let claimCalls=0,donationCalls=0,priorCalls=0,gateChecks=0;
const base:WorldBossActionDepsV62={
 ops:{assertGates:async eventId=>{gateChecks++;assert.equal(eventId,EVENT);}},
 current:{
  authenticate:async t=>t===TOKEN?OWNER:null,
  accountPrivacy:{allowRead:async who=>who===OWNER},
  launchMondayUtcMs:START,serverNowUtcMs:()=>NOW,
  events:{findByCycleStart:async start=>{
   assert.equal(start,START);
   return {eventId:EVENT,bossId:'hollowroot',
    startsAtUtcMs:START,cycleEndsAtUtcMs:START+14*DAY};
  }},
  overview:{read:async()=>row()},
 },
 raid:{
  authenticate:async()=>{throw Error('the endpoint must override action auth');},
  db:{
   readAttempt:async(eventId,accountId,req)=>{
    priorCalls++;assert.equal(eventId,EVENT);assert.equal(accountId,OWNER);
    assert.equal(req,requestId);
    return {characterId:CHARACTER,order:'steady_assault',
     status:'committed',ordinal:1};
   },
   listOwnedStates:async()=>{throw Error('a retry must not load characters');},
   loadEvent:async()=>{throw Error('a retry must not load event');},
   reserve:async()=>{throw Error('a retry must not use an attempt');},
   checkout:async()=>{throw Error('no combat worker here');},
   settle:async()=>{throw Error('no combat settlement here');},
  },
  rulesSource:{} as WorldBossActionDepsV62['raid']['rulesSource'],
  bracketPolicy:{} as WorldBossActionDepsV62['raid']['bracketPolicy'],
  minimumCharacterLevel:1,
  randomSeed:()=>{throw Error('no entropy on retry');},
  workerId:'world_boss_private_v62_worker',
  nowUtcMs:()=>NOW,
  replayStore:{putImmutable:async()=>{throw Error('no replay upload');}},
 },
 donations:{
  authenticate:async()=>{throw Error('action must override auth');},
  db:{
   donateAtomic:async input=>{
    donationCalls++;assert.equal(input.accountId,OWNER);
    assert.equal(input.eventId,EVENT);assert.equal(input.characterId,CHARACTER);
    return {
     ...input,track:'fortifications',ordinal:1 as const,
     revision:1,paidMaterials:[{itemId:'GREENWOOD_LOG',quantity:70},
      {itemId:'COPPER_INGOT',quantity:12}],repeated:false,
    };
   },
   freeze:async()=>{throw Error('no freeze during action dispatch');},
   progress:async()=>{throw Error('no camp read during action dispatch');},
  },
 },
 rewards:{
  authenticate:async()=>{throw Error('action must override auth');},
  db:{
   committedReplay:async()=>{throw Error('no replay during claim dispatch');},
   recordReplay:async()=>{throw Error('no replay during claim dispatch');},
   claim:async(eventId,accountId,req)=>{
    claimCalls++;assert.equal(eventId,EVENT);assert.equal(accountId,OWNER);
    return {eventId,accountId,requestId:req,repeated:false,
     creditedSigils:5,balanceAfter:10,walletRevision:2};
   },
   view:async()=>{throw Error('no full role ledger during claim dispatch');},
  },
  replayStore:{readImmutable:async()=>{throw Error('no replay reader');}},
 },
};
const mk=(body:unknown,authorization:string|null='Bearer '+TOKEN)=>({
 method:'POST',authorization,query:null,body,
});
async function main(){
 assert.equal(WORLD_BOSS_V62_ACTION_HTTP_LIVE,false);
 assert.equal(WORLD_BOSS_V63_GATE_ATTESTATION_LIVE,false);
 const privateGate=createWorldBossGateAttestationPgV63({
  async query<T extends object>(sql:string,params:readonly unknown[]){
   assert.equal(sql,'SELECT private.world_boss_v63_assert_gates($1::uuid) AS ok');
   assert.deepEqual(params,[EVENT]);
   return {rows:[{ok:true} as unknown as T]};
  },
 });
 await privateGate.assertGates(EVENT);
 await assert.rejects(async()=>privateGate.assertGates('malicious event'));
 await assert.rejects(async()=>createWorldBossGateAttestationPgV63({
  async query<T extends object>(){
   return {rows:[{ok:false} as unknown as T]};
  },
 }).assertGates(EVENT));
 await assert.rejects(async()=>createWorldBossGateAttestationPgV63({
  async query<T extends object>(){
   return {rows:[] as T[]};
  },
 }).assertGates(EVENT));
 const forge={action:'claim',requestId,eventId:EVENT,accountId:OTHER};
 const denied=await handleWorldBossActionV62(mk(forge),base);
 assert.equal(denied.status,400);
 assert.equal(claimCalls,0);
 for(const raw of [
  {action:'raid',requestId,order:'steady_assault',serverSeed:'x'.repeat(32)},
  {action:'raid',requestId,order:'steady_assault',bossId:'sunscar'},
  {action:'donation',requestId,characterId:CHARACTER,
   recipeId:'T1_FORTIFICATIONS',quantity:9999},
  {action:'claim',requestId,damage:999999},
  {action:'claim',requestId:'short'},
  JSON.parse('{"action":"claim","requestId":"'+requestId+'","__proto__":"unsafe"}'),
  [],
  null,
 ]){
  assert.equal((await handleWorldBossActionV62(mk(raw),base)).status,400);
 }
 assert.equal((await handleWorldBossActionV62(
  {...mk({action:'claim',requestId}),query:'eventId='+EVENT},base)).status,400);
 assert.equal((await handleWorldBossActionV62(
  {...mk({action:'claim',requestId}),method:'GET'},base)).status,405);
 assert.equal((await handleWorldBossActionV62(mk({action:'claim',requestId},null),base)).status,401);
 assert.equal((await handleWorldBossActionV62(
  mk({action:'claim',requestId},'Bearer forged-jwt-credential'),base)).status,401);
 assert.equal(claimCalls,0);

 // No event/erasure permission, no personal action dispatch.
 assert.equal((await handleWorldBossActionV62(mk({action:'claim',requestId}),{
  ...base,current:{...base.current,
   events:{findByCycleStart:async()=>null}},
 })).status,409);
 assert.equal((await handleWorldBossActionV62(mk({action:'claim',requestId}),{
  ...base,current:{...base.current,
   accountPrivacy:{allowRead:async()=>false}},
 })).status,503);
 assert.equal(claimCalls,0);

 // A missing, incorrectly configured or disabled V61 operator attestation
 // must never route a player write. The SQL INSERT triggers remain the
 // final authority; this startup check protects against accidental mounting.
 assert.equal((await handleWorldBossActionV62(
  mk({action:'claim',requestId}),{
   ...base,ops:undefined,
  } as unknown as WorldBossActionDepsV62)).status,503);
 assert.equal((await handleWorldBossActionV62(
  mk({action:'claim',requestId}),{
   ...base,ops:{assertGates:async()=>{throw Error('WB63_MISSING_OPERATOR_CONTROLS');}},
  })).status,503);
 assert.equal(claimCalls,0);

 const claim=await handleWorldBossActionV62(
  mk({action:'claim',requestId}),base);
 assert.equal(claim.status,200);
 assert.equal(claim.headers['Cache-Control'],'private, no-store, max-age=0');
 assert.equal(claimCalls,1);
 assert.equal(JSON.stringify(claim).includes(TOKEN),false);
 assert.equal(JSON.stringify(claim).includes(OTHER),false);
 const donate=await handleWorldBossActionV62(mk({
  action:'donation',requestId,characterId:CHARACTER,
  recipeId:'T1_FORTIFICATIONS',
 }),base);
 assert.equal(donate.status,200);
 assert.equal(donationCalls,1);
 const retry=await handleWorldBossActionV62(
  mk({action:'raid',requestId,order:'steady_assault'}),base);
 assert.equal(retry.status,200);
 assert.equal(priorCalls,1);
 assert.ok(gateChecks>=3,'real actions must attest installed controls');

 // A token that changes principal between the status read and the action
 // must not reach a wallet or donation write.
 let authCalls=0;
 const changed=await handleWorldBossActionV62(mk({action:'claim',requestId}),{
  ...base,current:{...base.current,
   authenticate:async()=>++authCalls<=1?OWNER:OTHER},
 });
 assert.equal(changed.status,401);
 assert.equal(claimCalls,1);

 // The V61 SQL stop must remain a 409 without leaking SQL text.
 const paused=await handleWorldBossActionV62(mk({action:'claim',requestId}),{
  ...base,rewards:{...base.rewards,db:{
   ...base.rewards.db,claim:async()=>{throw Error('WB61_NEW_ACTION_PAUSED: private reference');},
  }},
 });
 assert.equal(paused.status,409);
 assert.equal(JSON.stringify(paused).includes('private reference'),false);
 console.log('WORLD_BOSS_V62_UNMOUNTED_ACTION_OWNER_AND_HOTFIX_BOUNDARY=PASS');
}
void main().catch(error=>{console.error(error);throw error;});
