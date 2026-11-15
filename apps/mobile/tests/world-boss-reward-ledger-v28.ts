/** V28 private World Sigil economy: authenticated, replay-backed, no live UI. */
import {createHash} from 'node:crypto';
import {assert} from './test-assert';
import {recordTrustedWorldBossReplayV28,
 claimAuthenticatedWorldBossSigilsV28,readAuthenticatedWorldBossRewardsV28,
 summarizeWorldBossRoleEvidenceV28,WORLD_BOSS_V28_REWARDS_LIVE,
 WORLD_BOSS_V28_IMPACT_PAYOUTS_APPROVED,WORLD_BOSS_V28_EVENT_CAP,
 type WorldBossRewardDepsV28,type WorldBossRewardViewV28}
 from '../../../backend/online/world-boss-rewards-v28';
import {createWorldBossRewardPgV28,
 WORLD_BOSS_V28_PRIVATE_PG_LIVE} from
 '../../../backend/online/world-boss-rewards-pg-v28';

const EVENT='30000000-0000-4000-8000-000000000028';
const ACCOUNT='10000000-0000-4000-8000-000000000028';
const CHAR='20000000-0000-4000-8000-000000000028';
const REQUEST='WB28_BATTLE_0001';
const body={
 version:'world-boss-account-rounds-v25-prototype',
 eventId:EVENT,accountId:ACCOUNT,requestId:REQUEST,
 seed:'server-only-seed',rosterDigest:'a'.repeat(64),
 phase:'armored',warCampDigest:'b'.repeat(64),
 encounterDigest:'c'.repeat(64),
 replay:{
  schema:'world-boss-v25-authored-account-rounds',
  engineVersion:'world-boss-account-rounds-v25-prototype',
  eventId:EVENT,accountId:ACCOUNT,requestId:REQUEST,
  roundsCompleted:14,survived:true,
  rawBossHpDamage:300,proposedWorldHpDamage:300,
  localGuardDamage:80,
  characterLedger:[{characterId:CHAR,role:'tank',
   bossHpDamage:300,localGuardDamage:80,effectiveHealing:0,
   shieldConsumed:40,tankProtection:120,cleansePrevented:0,
   interrupts:2,survived:true}],
  events:[{round:14,type:'battle_end',abilityId:'END'}],
 },
};
const content=JSON.stringify(body);
const digest=createHash('sha256').update(content).digest('hex');
const key='WB26_REPLAY_'+digest.slice(0,40);
const fail=async(fn:()=>Promise<unknown>,fragment:string)=>{
 let error='';
 try{await fn();}catch(e){error=String(e);}
 assert.ok(error.includes(fragment),fragment+' not found in '+error);
};
function fixture(){
 let damaged=false,badReceipt=false;
 let proofs=0,reads=0,claims=0;
 let balance=0,revision=0;
 const issued=new Map<string,{amount:number,balanceAfter:number,revision:number}>();
 const claimedSources=new Set<string>();
 const sources=new Map<string,number>([
  ['battle:1',10],['supply:1',5],['supply:2',5],
  ['global:70',5],['global:30',10],['global:0',15],
 ]);
 let proofValidated=false;
 const evidence={
  attempt:1,survived:true,worldHpContribution:300,
  localGuardDamage:80,characterLedger:body.replay.characterLedger,
  impactStatus:'pending_balance_approval',
 };
 const db:WorldBossRewardDepsV28['db']={
  async committedReplay(eventId,accountId,requestId){
   assert.equal(eventId,EVENT);
   assert.equal(accountId,ACCOUNT);
   assert.equal(requestId,REQUEST);
   return {eventId,accountId,requestId,status:'committed',
    engineVersion:body.version,replayDigest:digest,replayKey:key};
  },
  async recordReplay(eventId,accountId,requestId,raw){
   assert.equal(createHash('sha256').update(raw).digest('hex'),digest);
   proofs++;
   proofValidated=true;
   return {eventId,accountId,requestId,repeated:proofs>1,
    survived:badReceipt?false:true,status:'pending_balance_approval'};
  },
  async claim(eventId,accountId,requestId){
   claims++;
   const old=issued.get(requestId);
   if(old)return {eventId,accountId,requestId,repeated:true,
    creditedSigils:old.amount,balanceAfter:old.balanceAfter,
    walletRevision:old.revision};
   let delta=0;
   for(const [source,amount] of sources){
    if(source.startsWith('battle:')&&!proofValidated)continue;
    if(source.startsWith('global:')&&!proofValidated)continue;
    if(!claimedSources.has(source)){
     claimedSources.add(source);delta+=amount;
    }
   }
   assert.ok(delta<=WORLD_BOSS_V28_EVENT_CAP);
   balance+=delta;
   if(delta)revision++;
   issued.set(requestId,{amount:delta,balanceAfter:balance,revision});
   return {eventId,accountId,requestId,repeated:false,
    creditedSigils:badReceipt?101:delta,balanceAfter:balance,
    walletRevision:revision};
  },
  async view(accountId,eventId){
   reads++;
   return {accountId,eventId,balance,walletRevision:revision,
    claimedThisEvent:balance,eventCap:100,
    impactStatus:'pending_balance_approval',
    impactMilestonesCredited:false,
    roleContributions:proofValidated?[evidence]:[],
   } as unknown as WorldBossRewardViewV28;
  },
 };
 const deps:WorldBossRewardDepsV28={
  authenticate:async(token)=>token==='private-verified-auth'?ACCOUNT:null,
  db,replayStore:{async readImmutable(id){
   assert.equal(id,key);return damaged?content+'x':content;
  }},
 };
 return {deps,metrics:()=>({proofs,reads,claims,balance,revision}),
  setTamper:(v:boolean)=>{damaged=v;},
  setBadReceipt:(v:boolean)=>{badReceipt=v;},
  addSource:(source:string,amount:number)=>sources.set(source,amount),
 };
}
async function main(){
 assert.equal(WORLD_BOSS_V28_REWARDS_LIVE,false);
 assert.equal(WORLD_BOSS_V28_PRIVATE_PG_LIVE,false);
 assert.equal(WORLD_BOSS_V28_IMPACT_PAYOUTS_APPROVED,false);
 assert.equal(WORLD_BOSS_V28_EVENT_CAP,100);
 const f=fixture();
 const selection={eventId:EVENT,requestId:'WB28_CLAIM_FIRST'};
 await fail(()=>claimAuthenticatedWorldBossSigilsV28({
  token:'wrong-private-token',selection,
 },f.deps),'auth_required');
 await fail(()=>claimAuthenticatedWorldBossSigilsV28({
  token:'private-verified-auth',selection:{
   ...selection,amount:1000,
  } as never,
 },f.deps),'invalid_claim_selection');
 await fail(()=>claimAuthenticatedWorldBossSigilsV28({
  token:'private-verified-auth',selection:{
   ...selection,requestId:'bad',
  },
 },f.deps),'invalid_selection');
 const donationOnly=await claimAuthenticatedWorldBossSigilsV28({
  token:'private-verified-auth',selection,
 },f.deps);
 assert.equal(donationOnly.creditedSigils,10);
 assert.equal(f.metrics().balance,10);
 const before=f.metrics().proofs;
 f.setTamper(true);
 await fail(()=>recordTrustedWorldBossReplayV28({
  eventId:EVENT,accountId:ACCOUNT,requestId:REQUEST,
 },f.deps),'replay_content_mismatch');
 assert.equal(f.metrics().proofs,before);
 f.setTamper(false);
 f.setBadReceipt(true);
 await fail(()=>recordTrustedWorldBossReplayV28({
  eventId:EVENT,accountId:ACCOUNT,requestId:REQUEST,
 },f.deps),'untrusted_proof_receipt');
 f.setBadReceipt(false);
 const proved=await recordTrustedWorldBossReplayV28({
  eventId:EVENT,accountId:ACCOUNT,requestId:REQUEST,
 },f.deps);
 assert.equal(proved.survived,true);
 assert.equal(proved.status,'pending_balance_approval');
 const repeatProof=await recordTrustedWorldBossReplayV28({
  eventId:EVENT,accountId:ACCOUNT,requestId:REQUEST,
 },f.deps);
 assert.equal(repeatProof.repeated,true);
 const firstAfter=await claimAuthenticatedWorldBossSigilsV28({
  token:'private-verified-auth',
  selection:{eventId:EVENT,requestId:'WB28_CLAIM_SECOND'},
 },f.deps);
 assert.equal(firstAfter.creditedSigils,45);
 assert.equal(firstAfter.balanceAfter,55);
 const repeatDonation=await claimAuthenticatedWorldBossSigilsV28({
  token:'private-verified-auth',selection,
 },f.deps);
 assert.equal(repeatDonation.repeated,true);
 assert.equal(repeatDonation.creditedSigils,10);
 assert.equal(repeatDonation.balanceAfter,10);
 const noDuplicate=await claimAuthenticatedWorldBossSigilsV28({
  token:'private-verified-auth',
  selection:{eventId:EVENT,requestId:'WB28_CLAIM_THIRD'},
 },f.deps);
 assert.equal(noDuplicate.creditedSigils,0);
 const overview=await readAuthenticatedWorldBossRewardsV28({
  token:'private-verified-auth',eventId:EVENT,
 },f.deps);
 assert.equal(overview.balance,55);
 assert.equal(overview.claimedThisEvent,55);
 assert.equal(overview.eventCap,100);
 assert.equal(overview.impactMilestonesCredited,false);
 const utility=summarizeWorldBossRoleEvidenceV28(overview);
 assert.equal(utility.status,'impact_pending_approval');
 assert.equal(utility.roles.tank.protection,120);
 assert.equal(utility.roles.tank.shields,40);
 assert.equal(utility.roles.tank.guard,80);
 assert.equal(utility.roles.tank.damage,300);
 assert.equal(utility.roles.tank.interrupts,2);
 assert.equal(utility.payoutsAuthorized,false);
 await fail(()=>readAuthenticatedWorldBossRewardsV28({
  token:'wrong-private-token',eventId:EVENT,
 },f.deps),'auth_required');

 // Private SQL never interpolates user-selected request ID or Auth identity.
 const queries:Array<{sql:string;values:readonly unknown[]}>=[],db=createWorldBossRewardPgV28({
  async query<T extends object>(sql:string,values:readonly unknown[]){
   queries.push({sql,values});
   assert.ok(sql.includes('private.world_boss_'));
   assert.ok(!sql.includes(ACCOUNT)&&!sql.includes('WB28_CLAIM_FOURTH'));
   if(sql.includes('world_boss_v28_claim('))return {rows:[{
    receipt:{eventId:EVENT,accountId:ACCOUNT,requestId:'WB28_CLAIM_FOURTH',
     repeated:false,creditedSigils:0,balanceAfter:55,walletRevision:2},
   } as unknown as T]};
   if(sql.includes('world_boss_v28_view('))return {rows:[{
    state:overview,
   } as unknown as T]};
   if(sql.includes('world_boss_v28_record_replay('))return {rows:[{
    receipt:proved,
   } as unknown as T]};
   if(sql.includes('world_boss_attempts_v17'))return {rows:[{
    eventId:EVENT,accountId:ACCOUNT,requestId:REQUEST,status:'committed',
    engineVersion:body.version,replayDigest:digest,replayKey:key,
   } as unknown as T]};
   throw Error('unexpected SQL');
  },
 });
 const fourth=await db.claim(EVENT,ACCOUNT,'WB28_CLAIM_FOURTH');
 assert.equal(fourth.creditedSigils,0);
 assert.equal((await db.committedReplay(EVENT,ACCOUNT,REQUEST)).replayDigest,digest);
 assert.equal((await db.recordReplay(EVENT,ACCOUNT,REQUEST,content)).survived,true);
 assert.equal((await db.view(ACCOUNT,EVENT)).balance,55);
 assert.equal(queries.length,4);
 for(const q of queries)assert.ok(q.values.length>=2);
 await fail(()=>db.claim(EVENT,ACCOUNT,'invalid'),'private_pg_identity_invalid');
 assert.equal(queries.length,4);
 console.log('WORLD_BOSS_V28_REWARD_SERVICE='+JSON.stringify({
  exactReplayOnly:true,replayedReceipt:true,
  donationOnly:donationOnly.creditedSigils,
  verifiedEarnedLater:firstAfter.creditedSigils,
  totalClaimed:overview.claimedThisEvent,
  roleEvidence:utility.roles,
  impactPayoutsApproved:false,claimedImpactPayout:0,
  privateSqlCalls:queries.length,
  eventCap:100,live:false,
 }));
}
void main().catch(e=>{console.error(e);throw e;});
