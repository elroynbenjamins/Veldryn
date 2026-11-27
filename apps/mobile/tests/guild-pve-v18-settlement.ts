/** Synthetic V18 async settlement: actual Veldryn character kit, never live data. */
import {assert} from './test-assert';
import {CLASSES} from '../src/content/classes';
import {REGIONAL_COMBAT_FIXTURES,regionalCombatFixture} from '../src/core/regional-combat-fixtures';
import {GuildPveV12VerifiedActorLoader} from '../../../backend/online/guild-pve-verified-loader-v12';
import {makeGuildPveReferenceV7} from '../../../backend/src/server/combat/guild-pve-broken-forge-v7';
import {makeGuildPveV9Run,type GuildPveV9StoreState} from '../../../backend/src/server/combat/guild-pve-transaction-v9';
import {InMemoryGuildPveV18Port,GuildPveV18SettlementService,
 type GuildPveV18StoreState,type GuildPveV18Charges,type GuildPveV18TrustedAuthority}
 from '../../../backend/src/server/combat/guild-pve-settlement-v18';
import {reviewGuildPveV18Reward} from '../../../backend/src/server/combat/guild-pve-reward-review-v18';
const ACCOUNT_A='GX_V18_ACC_A',ACCOUNT_B='GX_V18_ACC_B',
 CHAR_A='GX_V18_CHAR_A',CHAR_B='GX_V18_CHAR_B',
 GUILD='GX_V18_GUILD',OTHER='GX_V18_OTHER_GUILD',CYCLE='GX_V18_CYCLE';
const START=Date.UTC(2026,10,16),DAY=86400000;
const BASE=REGIONAL_COMBAT_FIXTURES.find(f=>f.regionId==='IRONWOOD')!;
const reference=makeGuildPveReferenceV7('T2',{attack:1000,defense:650,maxHp:4500});
const playerState=(char:string,cls:number)=>{
 const state=regionalCombatFixture({...BASE,tier:'T2',level:15},'prepared',CLASSES[cls].id);
 state.character={...state.character!,id:char};return state;
};
const a=playerState(CHAR_A,0),b=playerState(CHAR_B,1);
function makeState():GuildPveV18StoreState{
 const run=makeGuildPveV9Run({
  cycleId:CYCLE,guildId:GUILD,startMs:START,difficulty:'Scout',
  accountIds:[ACCOUNT_A,ACCOUNT_B],reference,
 });
 const guild:GuildPveV9StoreState={
  guildRuns:{[JSON.stringify([CYCLE,GUILD])]:run},
  receipts:{},cycleBindings:{},
 };
 const charges:GuildPveV18Charges={
  shrineChoice:null,protection:0,cleanse:0,insight:0,
 };
 return {guild,charges:{[JSON.stringify([CYCLE,GUILD])]:charges},receipts:{}};
}
const authority:GuildPveV18TrustedAuthority={
 async verifyOwnedGuildActor({principalAccountId,guildId,characterId}){
  if(guildId!==GUILD)throw Error('GX_UNAUTHORIZED_GUILD');
  const user=principalAccountId===ACCOUNT_A&&characterId===CHAR_A?{state:a}: 
   principalAccountId===ACCOUNT_B&&characterId===CHAR_B?{state:b}:null;
  if(!user)throw Error('GX_CHARACTER_NOT_OWNED');
  const reader=new GuildPveV12VerifiedActorLoader({
   async readOwnedState(){return {
    ownerAccountId:principalAccountId,characterId,revision:7,state:user.state,
   }},
  });
  return reader.resolveOwnedActor(principalAccountId,characterId);
 },
};
const kit=(initial=makeState())=>{
 const port=new InMemoryGuildPveV18Port(initial);
 const service=new GuildPveV18SettlementService(port,authority);
 const hit=(account=ACCOUNT_A,char=CHAR_A,request='GX_R1',node='C1-04',
  day=1,stance:'Assault'|'Guard'|'Rally'='Assault',guild=GUILD)=>
  service.attack({principalAccountId:account,nowUtcMs:START+day*DAY},
   {cycleId:CYCLE,guildId:guild,characterId:char,requestId:request,
    nodeId:node as 'C1-04',stance});
 return {port,hit,service};
};
async function rejects(fn:()=>Promise<unknown>,reason:string){
 let actual='';try{await fn()}catch(e){actual=String(e)}
 assert.ok(actual.includes(reason),'Expected '+reason+' got '+actual);
}
async function main(){
 const {port,hit}=kit();
 const first=await hit();
 assert.equal(first.status,'committed');
 assert.equal(first.sealDebit,1);
 assert.equal(first.combat?.serverPersisted,false);
 assert.equal(first.rewardGranted,false);
 assert.equal(first.walletWritten,false);
 assert.equal(first.outboxCreated,false);
 assert.equal(first.actorSourceHash?.length,64);
 assert.equal(port.inspect().guild.guildRuns[JSON.stringify([CYCLE,GUILD])].members[ACCOUNT_A].sealsSpent,1);
 assert.ok(first.afterHp<=first.beforeHp);
 assert.ok(first.creditedHp<=first.combat!.bossHpRemoved);
 const repeat=await hit(ACCOUNT_A,CHAR_A,'GX_R1','C1-04',15);
 assert.deepEqual(repeat,first);
 assert.equal(port.inspect().guild.guildRuns[JSON.stringify([CYCLE,GUILD])].members[ACCOUNT_A].sealsSpent,1);
 await rejects(()=>hit(ACCOUNT_A,CHAR_A,'GX_R1','C1-04',1,'Guard'),'nonce_conflict');
 await rejects(()=>hit(ACCOUNT_A,CHAR_B,'GX_WRONG_CHAR'),'GX_CHARACTER_NOT_OWNED');
 await rejects(()=>hit(ACCOUNT_A,CHAR_A,'GX_TOO_LATE','C1-04',14),'campaign_closed');
 const partial=reviewGuildPveV18Reward({
  state:port.inspect(),cycleId:CYCLE,guildId:GUILD,accountId:ACCOUNT_A,
 });
 assert.equal(partial.band,'partial_review');
 assert.equal(partial.verifiedActions,1);
 assert.equal(partial.canClaim,false);
 assert.equal(partial.tokenAmount,null);
 assert.equal(partial.guildXpAmount,null);
 const proofInput=()=>({state:port.inspect(),cycleId:CYCLE,guildId:GUILD,accountId:ACCOUNT_A});
 const tamper=(mutate:(state:GuildPveV18StoreState)=>void,reason:string)=>{
  const s=structuredClone(proofInput().state);
  mutate(s);
  let error='';
  try{reviewGuildPveV18Reward({...proofInput(),state:s})}catch(e){error=String(e)}
  assert.ok(error.includes(reason),'Expected '+reason+', got '+error);
 };
 const receiptKey=JSON.stringify([CYCLE,ACCOUNT_A,'GX_R1']);
 tamper(s=>{s.receipts[receiptKey].value.creditedHp+=1},'hp_credit_mismatch');
 tamper(s=>{s.receipts[receiptKey].value.beforeCharges.protection=1},
  'invalid_charge_settlement');
 tamper(s=>{s.receipts[receiptKey].value.stance='Guard'},'invalid_receipt');
 tamper(s=>{s.guild.guildRuns[JSON.stringify([CYCLE,GUILD])]
  .members[ACCOUNT_A].sealsSpent++},'seal_receipt_mismatch');
 tamper(s=>{s.receipts[receiptKey].value.guildRevision=999},'invalid_receipt_revision');
 tamper(s=>{s.guild.guildRuns[JSON.stringify([CYCLE,GUILD])]
  .nodes['C1-04'].cleared=true},'invalid_node_state');
 const changed=port.inspect();
 changed.receipts[receiptKey].value.combat!.effectiveHealing+=1;
 const changedReview=reviewGuildPveV18Reward({...proofInput(),state:changed});
 assert.ok(changedReview.sourceEvidenceDigest!==partial.sourceEvidenceDigest);
 // JSONB-style key reordering must not change the proof digest.
 const reordered=JSON.parse(JSON.stringify(proofInput().state,(_key,value)=>
  value!==null&&typeof value==='object'&&!Array.isArray(value)
   ?Object.fromEntries(Object.keys(value).sort().reverse().map(key=>[key,value[key]]))
   :value)) as GuildPveV18StoreState;
 assert.equal(reviewGuildPveV18Reward({...proofInput(),state:reordered})
  .sourceEvidenceDigest,partial.sourceEvidenceDigest);
 const noBinding=port.inspect();
 delete noBinding.guild.cycleBindings[JSON.stringify([CYCLE,ACCOUNT_A])];
 assert.equal(reviewGuildPveV18Reward({
  state:noBinding,cycleId:CYCLE,guildId:GUILD,accountId:ACCOUNT_A,
 }).reason,'missing_guild_binding');
 const noAction=reviewGuildPveV18Reward({
  state:port.inspect(),cycleId:CYCLE,guildId:GUILD,accountId:ACCOUNT_B,
 });
 assert.equal(noAction.band,'none');

 // Fail closed on corrupt run metadata before a combat/Seal mutation.
 const badRun=makeState();
 badRun.guild.guildRuns[JSON.stringify([CYCLE,GUILD])].pressure=101;
 const badRunKit=kit(badRun);
 await rejects(()=>badRunKit.hit(),'invalid_run_state');
 assert.deepEqual(badRunKit.port.inspect(),badRun);
 const badNode=makeState();
 badNode.guild.guildRuns[JSON.stringify([CYCLE,GUILD])].nodes['C1-04'].cleared=true;
 const badNodeKit=kit(badNode);
 await rejects(()=>badNodeKit.hit(),'invalid_shared_hp');
 assert.deepEqual(badNodeKit.port.inspect(),badNode);

 // Simulate a transaction abort after a fully computed real-engine fight.
 const aborted=kit();
 aborted.port.failNextCommit();
 await rejects(()=>aborted.hit(),'synthetic_rollback');
 assert.equal(aborted.port.inspect().guild.guildRuns[JSON.stringify([CYCLE,GUILD])].members[ACCOUNT_A].sealsSpent,0);
 assert.equal(Object.keys(aborted.port.inspect().receipts).length,0);
 assert.equal((await aborted.hit()).sealDebit,1);

 // First worker clears; second independent account receives a free stale
 // receipt after serializing the same 1HP target. No second Seal or reward.
 const raceState=makeState();
 const raceNode=raceState.guild.guildRuns[JSON.stringify([CYCLE,GUILD])].nodes['C1-04'];
 raceNode.maxHp=1;raceNode.hp=1;
 const race=kit(raceState);
 const [one,two]=await Promise.all([
  race.hit(ACCOUNT_A,CHAR_A,'GX_RACE_A'),
  race.hit(ACCOUNT_B,CHAR_B,'GX_RACE_B'),
 ]);
 assert.equal(one.status,'committed');
 assert.equal(two.status,'stale');
 assert.equal(two.sealDebit,0);
 assert.equal(two.creditedHp,0);
 const raceRun=race.port.inspect().guild.guildRuns[JSON.stringify([CYCLE,GUILD])];
 assert.equal(raceRun.members[ACCOUNT_A].sealsSpent,1);
 assert.equal(raceRun.members[ACCOUNT_B].sealsSpent,0);
 assert.equal((await race.hit(ACCOUNT_B,CHAR_B,'GX_RACE_B', 'C1-04',20)).status,'stale');

 // Global one-account-one-guild binding survives attempted guild switching.
 const cross=makeState();
 cross.guild.guildRuns[JSON.stringify([CYCLE,OTHER])]=makeGuildPveV9Run({
  cycleId:CYCLE,guildId:OTHER,startMs:START,difficulty:'Scout',
  accountIds:[ACCOUNT_A],reference,
 });
 cross.charges[JSON.stringify([CYCLE,OTHER])]={
  shrineChoice:null,protection:0,cleanse:0,insight:0,
 };
 const crossKit=kit(cross);
 await crossKit.hit();
 await rejects(()=>crossKit.hit(ACCOUNT_A,CHAR_A,'GX_OTHER_REQ','C1-04',1,'Assault',OTHER),
  'already_bound_elsewhere');

 // In week one the fifth attempt fails, while Day 8 extends to eight total.
 const quota=makeState(),quotaNode=quota.guild.guildRuns[JSON.stringify([CYCLE,GUILD])].nodes['C1-04'];
 quotaNode.maxHp=100000000;quotaNode.hp=100000000;
 const quotaKit=kit(quota);
 for(let i=0;i<4;i++)assert.equal((await quotaKit.hit(
  ACCOUNT_A,CHAR_A,'GX_Q'+i)).sealDebit,1);
 await rejects(()=>quotaKit.hit(ACCOUNT_A,CHAR_A,'GX_Q4'),'no_assault_seals');
 for(let i=4;i<8;i++)assert.equal((await quotaKit.hit(
  ACCOUNT_A,CHAR_A,'GX_Q'+i,'C1-04',8)).sealDebit,1);
 await rejects(()=>quotaKit.hit(ACCOUNT_A,CHAR_A,'GX_Q8','C1-04',8),
  'no_assault_seals');

 // Fully completed frozen campaign grants NO actual reward.
 const complete=port.inspect(),run=complete.guild.guildRuns[JSON.stringify([CYCLE,GUILD])];
 for(const def of ['C1-04','C1-06','C2-01','C2-05','C2-06','C3-01','C3-06'] as const){
  run.nodes[def].hp=0;run.nodes[def].cleared=true;
 }
 const full=reviewGuildPveV18Reward({
  state:complete,cycleId:CYCLE,guildId:GUILD,accountId:ACCOUNT_A,
 });
 assert.equal(full.band,'full_review');
 assert.equal(full.canClaim,false);
 assert.equal(full.rewardGranted,false);
 assert.equal(full.tokenAmount,null);

 // Frozen Warding boon is consumed only after an engine-observed shield.
 const bossState=makeState();
 const bossRun=bossState.guild.guildRuns[JSON.stringify([CYCLE,GUILD])];
 for(const id of ['C1-04','C1-06','C2-01','C2-03','C2-04','C2-05','C2-06','C3-01'] as const){
  bossRun.nodes[id].cleared=true;
  if(bossRun.nodes[id].maxHp>0)bossRun.nodes[id].hp=0;
 }
 bossRun.nodes['C3-06'].hp=Math.floor(bossRun.nodes['C3-06'].maxHp*.2);
 bossRun.nodes['C3-06'].phase='exposed_core';
 const boons=bossState.charges[JSON.stringify([CYCLE,GUILD])];
 boons.shrineChoice='warding';boons.protection=1;
 const boss=kit(bossState);
 const attempt=await boss.hit(ACCOUNT_A,CHAR_A,'GX_BOSS','C3-06',8,'Guard');
 assert.equal(attempt.status,'committed');
 assert.equal(attempt.combat!.proposedChargeUses.protection,1);
 assert.equal(boss.port.inspect().charges[JSON.stringify([CYCLE,GUILD])].protection,0);
 assert.deepEqual(await boss.hit(ACCOUNT_A,CHAR_A,'GX_BOSS','C3-06',15,'Guard'),attempt);
 assert.equal(boss.port.inspect().charges[JSON.stringify([CYCLE,GUILD])].protection,0);
 console.log('V18: authoritative-reader contract, stale races, quota, replay, rollback, finite charge, nonpaying reward reviews PASSED');
}
main().catch(e=>{console.error(e);process.exitCode=1});
