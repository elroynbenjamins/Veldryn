/** World Boss V16 lost-ACK / multi-worker race contract — offline only. */
import {assert} from './test-assert';
import {launchPlayer} from '../../../backend/src/server/combat/content/launch-combat';
import {
 WorldBossReservationEmulatorV10,type WorldBossV10Reservation,
} from '../../../backend/src/server/combat/world-boss-reservation-v10';
import {
 prepareOrResumeWorldBossAttemptV16,
 type WorldBossAttemptStoreV16,
} from '../../../backend/src/server/combat/world-boss-attempt-command-v16';
import type {
 WorldBossRosterLoaderV9,WorldBossRosterRequestV9,
} from '../../../backend/src/server/combat/world-boss-verified-roster-v9';

const NOW=1794564000000;
const EVENT='WB_V16_TEST_EVENT';
const PLAYER=launchPlayer('Ironwarden',25);
function command(requestId='WB_V16_REQUEST_0001',characterId='WB_V16_CHARACTER',
 order:'break_armor'|'hold_line'|'steady_assault'='hold_line'):
 WorldBossRosterRequestV9{
 return {eventId:EVENT,requestId,characterId,order};
}
let loadCalls=0,seedCalls=0;
function loader(owner='WB_V16_OWNER',clock=NOW):WorldBossRosterLoaderV9{
 return {
  principalAccountId:owner,nowUtcMs:()=>clock,
  randomSeed:()=>{seedCalls++;return 'WB_V16_ENTROPY_'+String(seedCalls).padStart(12,'0')+'_secret';},
  async loadCurrentCharacter({accountId,characterId}){
   loadCalls++;
   assert.equal(accountId,owner);
   return {
    snapshotId:'WB_V16_SNAP_'+characterId,
    ownerAccountId:owner,capturedAtUtcMs:clock-10,
    bracket:3 as const,usageCount:0,eligible:true,
    verified:{
     characterId,classId:'IRONWARDEN',role:'tank' as const,level:25,
     maxHp:PLAYER.stats.maxHp,attackPower:PLAYER.stats.attackPower,
     healingPower:PLAYER.stats.healingPower,defense:PLAYER.stats.defense,
     accuracy:PLAYER.stats.accuracy,evasion:PLAYER.stats.evasion,
     critChance:PLAYER.stats.critChance,critMultiplier:PLAYER.stats.critMultiplier,
     haste:PLAYER.stats.haste,
    },
    abilities:PLAYER.abilities.map(a=>({
     ...a,effects:a.effects.map(e=>({...e})),
    })),
   };
  },
  async listEligibleEchoes(){return [];},
 };
}
function setup(){
 const event=new WorldBossReservationEmulatorV10({
  eventId:EVENT,boss:'hollowroot',startsAtUtcMs:NOW-1000,
  endsAtUtcMs:NOW+3600000,maxHp:900000,
 });
 const store:WorldBossAttemptStoreV16={
  read:({accountId,requestId})=>event.read(accountId,requestId),
  reserveAtomic:({prepared,nowUtcMs})=>event.reserve(prepared,nowUtcMs),
 };
 return {event,store};
}
async function reject(fn:()=>Promise<unknown>,text:string){
 let caught='';
 try{await fn();}catch(e){caught=String(e);}
 assert.ok(caught.includes(text),'expected '+text+' but got '+caught);
}
async function main(){
 const {event,store}=setup(),auth=loader(),c=command();
 const first=await prepareOrResumeWorldBossAttemptV16({command:c,loader:auth,store});
 assert.equal(first.repeated,false);
 assert.equal(first.freshlyPrepared,true);
 assert.equal(first.reservation.ordinal,1);
 assert.equal(first.persistedByRealDatabase,false);
 const initialSeed=first.reservation.serverSeed,initialDigest=first.reservation.snapshotDigest;
 const loadAfterFirst=loadCalls,seedAfterFirst=seedCalls;
 const retry=await prepareOrResumeWorldBossAttemptV16({command:c,loader:auth,store});
 assert.equal(retry.repeated,true);
 assert.equal(retry.freshlyPrepared,false);
 assert.equal(retry.reservation.serverSeed,initialSeed);
 assert.equal(retry.reservation.snapshotDigest,initialDigest);
 assert.equal(loadCalls,loadAfterFirst,'retry must not load roster');
 assert.equal(seedCalls,seedAfterFirst,'retry must not generate another nonce');
 const detached=retry.reservation;
 detached.command.squad[0].resolvedCombatant.stats.attackPower=0;
 assert.ok((await event.read('WB_V16_OWNER',c.requestId))!.command.squad[0]
  .resolvedCombatant.stats.attackPower>0,'cannot mutate DB receipt by return alias');
 await reject(()=>prepareOrResumeWorldBossAttemptV16({
  command:{...c,order:'break_armor'},loader:auth,store,
 }), 'request_id_reused_with_different_intent');
 await reject(()=>prepareOrResumeWorldBossAttemptV16({
  command:{...c,characterId:'WB_V16_DIFFERENT_CHAR'},loader:auth,store,
 }), 'request_id_reused_with_different_intent');
 assert.equal(seedCalls,seedAfterFirst,'changed retry intent cannot reroll');
 const afterClosed=await prepareOrResumeWorldBossAttemptV16({
  command:c,loader:loader('WB_V16_OWNER',NOW+7200000),store,
 });
 assert.equal(afterClosed.reservation.serverSeed,initialSeed,
  'finished event can still retrieve the original attempt');

 // Two concurrent workers both see an empty key, but only the winning
 // reservation's immutable seed survives; the loser re-reads it.
 const race=setup();
 const contenders=await Promise.all(
  Array.from({length:12},()=>prepareOrResumeWorldBossAttemptV16({
   command:command('WB_V16_SAME_REQUEST_2'),loader:loader(),store:race.store,
  })),
 );
 assert.equal(contenders.filter(x=>!x.repeated).length,1);
 assert.equal(contenders.filter(x=>x.repeated).length,11);
 assert.equal(new Set(contenders.map(x=>x.reservation.serverSeed)).size,1);
 assert.equal(new Set(contenders.map(x=>x.reservation.snapshotDigest)).size,1);
 assert.equal(Object.keys(race.event.snapshot().reservations).length,1);
 assert.ok(contenders.every(x=>x.reservation.ordinal===1));
 const completed=await race.event.run('WB_V16_OWNER','WB_V16_SAME_REQUEST_2',NOW);
 const completedRetry=await prepareOrResumeWorldBossAttemptV16({
  command:command('WB_V16_SAME_REQUEST_2'),loader:loader(),store:race.store,
 });
 assert.equal(completedRetry.reservation.status,'committed');
 assert.equal(completedRetry.reservation.settlement?.replayDigest,
  completed.settlement.replayDigest);
 assert.equal(race.event.snapshot().revision,1);

 // Voided requests remain tombstones: new request ID is required.
 const voided=setup(),voidCommand=command('WB_V16_VOID_REQUEST');
 await prepareOrResumeWorldBossAttemptV16({
  command:voidCommand,loader:loader(),store:voided.store,
 });
 await voided.event.voidFailed('WB_V16_OWNER',voidCommand.requestId);
 const voidedRetry=await prepareOrResumeWorldBossAttemptV16({
  command:voidCommand,loader:loader(),store:voided.store,
 });
 assert.equal(voidedRetry.reservation.status,'voided');
 assert.equal(voidedRetry.freshlyPrepared,false);
 const replacement=await prepareOrResumeWorldBossAttemptV16({
  command:command('WB_V16_NEW_REQUEST'),loader:loader(),store:voided.store,
 });
 assert.equal(replacement.reservation.ordinal,1);

 await reject(()=>prepareOrResumeWorldBossAttemptV16({
  command:{...c,requestId:'x'},loader:auth,store,
 }), 'invalid_server_command');
 await reject(()=>prepareOrResumeWorldBossAttemptV16({
  command:c,loader:loader('bad owner'),store,
 }), 'invalid_server_command');
 await reject(()=>prepareOrResumeWorldBossAttemptV16({
  command:c,loader:auth,store:{
   ...store,read:async()=>{throw Error('world_boss_v16_store_unavailable');},
  },
 }), 'store_unavailable');
 await reject(()=>prepareOrResumeWorldBossAttemptV16({
  command:c,loader:auth,store:{
   ...store,read:async()=>({...first.reservation,accountId:'FOREIGN'}),
  },
 }), 'store_returned_foreign_reservation');

 // Account-wide cap is still enforced by the store for different keys.
 const cap=setup();
 for(let i=0;i<3;i++){
  const x=await prepareOrResumeWorldBossAttemptV16({
   command:command('WB_V16_SLOT_'+i),loader:loader(),store:cap.store,
  });
  assert.equal(x.reservation.ordinal,i+1);
 }
 await reject(()=>prepareOrResumeWorldBossAttemptV16({
  command:command('WB_V16_SLOT_4'),loader:loader(),store:cap.store,
 }), 'account_attempt_limit');
 assert.equal(Object.keys(cap.event.snapshot().reservations).length,3);
 console.log('WB_V16_ATTEMPT_COMMAND='+JSON.stringify({
  tested:'synthetic_only',readBeforeSeed:true,racingWorkers:12,
  oneImmutableRequest:true,replayLostAck:true,voidTombstone:true,
  threeAccountWideAttempts:true,live:false,dbReads:0,walletGrants:0,
 }));
}
void main().catch(e=>{console.error(e);throw e;});
