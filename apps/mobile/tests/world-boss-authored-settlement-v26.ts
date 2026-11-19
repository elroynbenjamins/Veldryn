/**
 * Hidden V26: 14-round authored same-account reservation, frozen replay,
 * exactly-once global HP settlement contract. In-memory *test* DB only.
 * Never exercises Supabase or awards World Sigils.
 */
import {assert} from './test-assert';
import {regionalCombatFixture,REGIONAL_COMBAT_FIXTURES} from
 '../src/core/regional-combat-fixtures';
import type {GameState,ClassId} from '../src/core/types';
import type {WorldBossRepositoryV26,WorldBossDepsV26,
 FrozenAccountPacketV26} from '../../../backend/online/world-boss-account-service-v26';
import {reserveAuthenticatedWorldBossAccountV26,
 settleTrustedWorldBossAccountV26,WORLD_BOSS_V26_LIVE} from
 '../../../backend/online/world-boss-account-service-v26';
import {WORLD_BOSS_V26_PRIVATE_PG_LIVE} from
 '../../../backend/online/world-boss-account-pg-v26';
import {WORLD_BOSS_V25_ENGINE_VERSION} from
 '../../../backend/src/server/combat/world-boss-account-encounter-v25';
import {settleTrustedWorldBossAccountV23} from
 '../../../backend/online/world-boss-account-service-v23';
import type {WorldBossDepsV23} from
 '../../../backend/online/world-boss-account-service-v23';
import {assertWorldBossAttackWindowV22} from
 '../../../backend/src/server/combat/world-boss-weekend-v22';
import {makeWorldBossWarCampSnapshotV11} from
 '../../../backend/src/server/combat/world-boss-war-camp-v11';
import {makeWorldBossEncounterProfileV13} from
 '../../../backend/src/server/combat/world-boss-encounter-profile-v13';
import type {WorldBossLeaseV19,WorldBossAttemptViewV19,
 WorldBossSettlePayloadV19,WorldBossSettlementViewV19} from
 '../../../backend/online/world-boss-private-pg-v19';

const DAY=86400000,HOUR=3600000;
const MONDAY=Date.UTC(2026,10,16);
const SATURDAY=MONDAY+5*DAY;
const EVENT='30000000-0000-4000-8000-000000000022';
const ACCOUNT='10000000-0000-4000-8000-000000000022';
const CHARS=['20000000-0000-4000-8000-000000000001',
 '20000000-0000-4000-8000-000000000002'];
const T2=REGIONAL_COMBAT_FIXTURES.find(x=>x.regionId==='IRONWOOD')!;
const classes:ClassId[]=['IRONWARDEN','DAWNKEEPER'];
const fail=async(f:()=>Promise<unknown>,message:string)=>{
 let error='';try{await f();}catch(e){error=String(e);}
 assert.ok(error.includes(message),'Expected '+message+', got '+error);
};
type Reservation={
 record:WorldBossAttemptViewV19;
 frozen:FrozenAccountPacketV26;seed:string;digest:string;
 phase:'armored'|'exposed'|'enraged';engine:string;warCampDigest:string;
 reservedAt:number;
 encounterDigest:string;generation:number;settlement?:WorldBossSettlementViewV19;
};
function fixture(opts:{inventoryTonic?:string;bankTonic?:string}={}){
 let now=SATURDAY+12*HOUR;
 let hp=1000000;
 let entropyCount=0,rosterReads=0,replayWrites=0,settleCalls=0;
 let failReplay=false;
 const history=new Map<string,Reservation>();
 const artifacts=new Map<string,string>();
 const saved=CHARS.map((characterId,i)=>{
  const serverState=regionalCombatFixture({...T2,level:25,tier:'T2'},
   'prepared',classes[i]);
  serverState.character={...serverState.character!,id:characterId};
  if(i===0&&opts.inventoryTonic)serverState.inventory={...serverState.inventory,
   stacks:[...serverState.inventory.stacks,{itemId:opts.inventoryTonic,quantity:2}]};
  if(i===1&&opts.bankTonic)serverState.bank={...serverState.bank,
   stacks:[...serverState.bank.stacks,{itemId:opts.bankTonic,quantity:1}]};
  return {ownerAccountId:ACCOUNT,characterId,gameVersion:2,
   updatedAtUtcMs:SATURDAY-2*HOUR,serverState};
 });
 const phases=['armored','exposed','enraged'] as const;
 const profile=(phase:typeof phases[number])=>makeWorldBossEncounterProfileV13({
  eventId:EVENT,configVersion:'wb23-untuned-test',boss:'sunscar',
  phase,gearBand:2,attack:1000,defense:700,guardMax:5000,
 });
 const camp=makeWorldBossWarCampSnapshotV11({
  eventId:EVENT,revision:1,
  levels:{fortifications:1,fieldProvisions:1,siegecraft:1},
 });
 const db:WorldBossRepositoryV26={
  async readAttempt(eventId,accountId,requestId){
   assert.equal(eventId,EVENT);assert.equal(accountId,ACCOUNT);
   return history.get(requestId)?.record;
  },
  async listOwnedStates(accountId){
   assert.equal(accountId,ACCOUNT);rosterReads++;
   return structuredClone(saved);
  },
  async loadEvent(eventId){
   assert.equal(eventId,EVENT);
   return {boss:'sunscar',status:'active',rulesVersion:'wb23-private-test',
    startsAtUtcMs:MONDAY,endsAtUtcMs:MONDAY+7*DAY};
  },
  async reserve(input){
   assert.equal(input.accountId,ACCOUNT);
   assert.equal(input.frozenPacket.schema,'world-boss-v26-authored-account-packet');
   assert.equal(input.engineVersion,WORLD_BOSS_V25_ENGINE_VERSION);
   assert.equal(input.frozenPacket.characters.length,2);
   assert.equal(input.warCampDigest,camp.digest);
   assertWorldBossAttackWindowV22(MONDAY,now);
   if(history.has(input.requestId))throw Error('WB23_DUPLICATE_REQUEST');
   const ordinal=history.size+1;
   if(ordinal>3)throw Error('WB18_ACCOUNT_ATTEMPT_LIMIT');
   const phase=hp/1000000<=.3?'enraged':hp/1000000<=.7?'exposed':'armored';
   const frozen=JSON.parse(JSON.stringify(input.frozenPacket)) as FrozenAccountPacketV26;
   history.set(input.requestId,{record:{
    characterId:input.characterId,order:input.order,status:'reserved',ordinal,
   },frozen,seed:input.seed,digest:input.digest,phase,
   engine:input.engineVersion,warCampDigest:camp.digest,reservedAt:now,
   encounterDigest:profile(phase).digest,generation:1});
   return {status:'reserved',ordinal,generation:1,repeated:false};
  },
  async checkout(eventId,accountId,requestId,workerId){
   assert.equal(eventId,EVENT);assert.equal(accountId,ACCOUNT);
   assert.equal(workerId,'WB23_SERVER_WORKER');
   const item=history.get(requestId);
   if(!item)throw Error('WB23_NOT_FOUND');
   // V18 voids a reservation after 15 minutes or sooner at the event
   // closing grace boundary; durable retries cannot run forever.
   const hardExpiry=Math.min(item.reservedAt+15*60*1000,
    MONDAY+7*DAY+15*60*1000);
   if(item.record.status==='reserved'&&now>=hardExpiry)
    item.record.status='voided';
   const lease:WorldBossLeaseV19={
    status:item.record.status,ordinal:item.record.ordinal,
    generation:item.generation,repeated:false,
   };
   if(lease.status!=='reserved')return lease;
   return {...lease,seed:item.seed,squad:item.frozen,digest:item.digest,
    phase:item.phase,order:item.record.order,engine:item.engine,
    warCampDigest:item.warCampDigest,encounterDigest:item.encounterDigest};
  },
  async settle(input:WorldBossSettlePayloadV19){
   settleCalls++;
   const item=history.get(input.requestId)!;
   assert.equal(input.digest,item.digest);
   assert.equal(input.workerId,'WB23_SERVER_WORKER');
   assert.equal(input.generation,item.generation);
   assert.equal(input.engineVersion,item.engine);
   assert.ok(artifacts.has(input.replayKey),'replay must persist first');
   assert.ok(Number.isFinite(input.rawDamage)&&input.rawDamage>=0);
   assert.ok(Number.isFinite(input.guardDamage)&&input.guardDamage>=0);
   const content=artifacts.get(input.replayKey);
   assert.ok(content,'private replay must exist before settlement');
   const saved=JSON.parse(content!) as {
    version:string;eventId:string;accountId:string;
    replay:{engineVersion:string;roundsCompleted:number;
      proposedWorldHpDamage:number;localGuardDamage:number;
      localGuardDamageForReplay?:number;rawBossHpDamage:number;
      characterLedger:unknown[];events:unknown[];};
   };
   assert.equal(saved.version,WORLD_BOSS_V25_ENGINE_VERSION);
   assert.equal(saved.replay.engineVersion,WORLD_BOSS_V25_ENGINE_VERSION);
   assert.ok(saved.replay.roundsCompleted>=1&&saved.replay.roundsCompleted<=14);
   assert.ok(saved.replay.events.length>0);
   assert.equal(saved.replay.characterLedger.length,2);
   assert.equal(input.rawDamage,saved.replay.proposedWorldHpDamage);
   assert.equal(input.guardDamage,Number(saved.replay.localGuardDamage.toFixed(2)));
   assert.ok(input.rawDamage<=saved.replay.rawBossHpDamage);
   if(item.settlement)return {...item.settlement,repeated:true};
   const before=hp;
   const creditedHp=Math.min(before,Math.floor(input.rawDamage));
   hp-=creditedHp;
   item.record.status='committed';
   item.settlement={status:'committed',ordinal:item.record.ordinal,
    repeated:false,creditedHp,hpAfter:hp,residualEcho:before===0};
   return item.settlement;
  },
 };
 const deps:WorldBossDepsV26={
  authenticate:async(token)=>token==='auth-token-verified'?ACCOUNT:null,
  db,workerId:'WB23_SERVER_WORKER',nowUtcMs:()=>now,
  randomSeed:()=>{entropyCount++;return 'WB23_PRIVATE_ENTROPY_NONCE_123456789';},
  minimumCharacterLevel:1,
  bracketPolicy:{version:'wb23-test',bounds:[2500,5000,10000,20000]},
  rulesSource:{
   gearBandByBracket:[2,2,2,2,2],
   loadWarCamp:async()=>camp,
   loadProfile:async({phase})=>profile(phase),
  },
  replayStore:{
   async putImmutable({key,digest,content}){
    if(failReplay)throw Error('WB23_REPLAY_STORE_FAILED');
    assert.equal(digest.length,64);
    const prior=artifacts.get(key);
    if(prior&&prior!==content)throw Error('WB23_REPLAY_OVERWRITE');
    artifacts.set(key,content);replayWrites++;
   },
  },
 };
 return {deps,history,artifacts,
  setNow:(value:number)=>{now=value;},
  setFailReplay:(value:boolean)=>{failReplay=value;},
  tamper:(requestId:string,mutation:(x:Reservation)=>void)=>{
   mutation(history.get(requestId)!);
  },
  metrics:()=>({hp,entropyCount,rosterReads,replayWrites,settleCalls}),
 };
}
const selection=(requestId:string)=>({
 eventId:EVENT,requestId,order:'steady_assault' as const,
});
async function main(){
 assert.equal(WORLD_BOSS_V26_LIVE,false);
 assert.equal(WORLD_BOSS_V26_PRIVATE_PG_LIVE,false);
 const f=fixture();
 const requestId='WB23_ATTEMPT_ONE';
 await fail(()=>reserveAuthenticatedWorldBossAccountV26({
  token:'invalid-token',selection:selection(requestId),
 },f.deps),'invalid_auth');
 assert.equal(f.metrics().rosterReads,0);
 const first=await reserveAuthenticatedWorldBossAccountV26({
  token:'auth-token-verified',selection:selection(requestId),
 },f.deps);
 assert.equal(first.status,'reserved');assert.equal(first.ordinal,1);
 assert.equal(f.metrics().entropyCount,1);
 const frozen=f.history.get(requestId)!;
 assert.equal(frozen.frozen.characters.length,2);
 assert.equal(frozen.frozen.rosterDigest,frozen.digest);
 assert.equal(frozen.encounterDigest,
  frozen.frozen.encounterProfiles[frozen.phase].digest);
 const replayed=await reserveAuthenticatedWorldBossAccountV26({
  token:'auth-token-verified',selection:selection(requestId),
 },f.deps);
 assert.equal(replayed.repeated,true);
 assert.equal(f.metrics().entropyCount,1);
 assert.equal(f.metrics().rosterReads,1);
 await fail(()=>reserveAuthenticatedWorldBossAccountV26({
  token:'auth-token-verified',selection:{
   ...selection(requestId),order:'hold_line',
  },
 },f.deps),'request_reused');
 await fail(()=>reserveAuthenticatedWorldBossAccountV26({
  token:'auth-token-verified',selection:{
   ...selection('WB23_INVALID_FIELDS'),rawDamage:999999,
  } as never,
 },f.deps),'invalid_selection');
 // A failed replay upload cannot spend an attempt or global boss HP.
 f.setFailReplay(true);
 await fail(()=>settleTrustedWorldBossAccountV26({
  eventId:EVENT,accountId:ACCOUNT,requestId,
 },f.deps),'REPLAY_STORE_FAILED');
 assert.equal(f.history.get(requestId)?.record.status,'reserved');
 assert.equal(f.metrics().settleCalls,0);
 const hpBefore=f.metrics().hp;
 f.setFailReplay(false);
 // No V23 (generic-timer) worker can consume the V26 authored packet.
 await fail(()=>settleTrustedWorldBossAccountV23({
  eventId:EVENT,accountId:ACCOUNT,requestId,
 },f.deps as unknown as WorldBossDepsV23),'invalid_frozen_lease');
 assert.equal(f.metrics().settleCalls,0);
 const committed=await settleTrustedWorldBossAccountV26({
  eventId:EVENT,accountId:ACCOUNT,requestId,
 },f.deps);
 assert.equal(committed.status,'committed');
 assert.ok(f.metrics().hp<=hpBefore);
 assert.equal(f.metrics().settleCalls,1);
 assert.equal(f.metrics().replayWrites,1);
 const repeatedCommit=await settleTrustedWorldBossAccountV26({
  eventId:EVENT,accountId:ACCOUNT,requestId,
 },f.deps);
 assert.equal(repeatedCommit.repeated,true);
 assert.equal(f.metrics().settleCalls,1);
 // Create two reservations in the final weekend minutes, not on Saturday:
 // the actual V18 lease lasts no more than fifteen minutes.
 f.setNow(MONDAY+7*DAY-6*60*1000);
 const secondId='WB23_ATTEMPT_TWO';
 await reserveAuthenticatedWorldBossAccountV26({
  token:'auth-token-verified',selection:selection(secondId),
 },f.deps);
 // Profile tampering is caught before storing any replay or global HP debit.
 f.tamper(secondId,x=>{x.frozen.encounterProfiles[x.phase].attack+=1234;});
 await fail(()=>settleTrustedWorldBossAccountV26({
  eventId:EVENT,accountId:ACCOUNT,requestId:secondId,
 },f.deps),'invalid_or_foreign_profile');
 assert.equal(f.history.get(secondId)?.record.status,'reserved');
 assert.equal(f.metrics().settleCalls,1);
 f.tamper(secondId,x=>{x.frozen.encounterProfiles[x.phase]=profileReplacement();});
 // Replace with a valid, matching trusted profile for a continuation test.
 function profileReplacement(){return makeWorldBossEncounterProfileV13({
  eventId:EVENT,configVersion:'wb23-untuned-test',boss:'sunscar',
  phase:f.history.get(secondId)!.phase,gearBand:2,
  attack:1000,defense:700,guardMax:5000,
 });}
 // The third attempt still fits before the weekend closes.
 f.setNow(MONDAY+7*DAY-5*60*1000);
 await reserveAuthenticatedWorldBossAccountV26({
  token:'auth-token-verified',selection:selection('WB23_ATTEMPT_THREE'),
 },f.deps);
 await fail(()=>reserveAuthenticatedWorldBossAccountV26({
  token:'auth-token-verified',selection:selection('WB23_ATTEMPT_FOUR'),
 },f.deps),'ACCOUNT_ATTEMPT_LIMIT');
 // At Monday 00:01 no NEW reservations, but Sunday 23:54's committed
 // reservation can finish within V18's limited grace period.
 f.setNow(MONDAY+7*DAY+60*1000);
 await fail(()=>reserveAuthenticatedWorldBossAccountV26({
  token:'auth-token-verified',selection:selection('WB23_WEEKEND_CLOSED'),
 },f.deps),'weekend_closed');
 const recovered=await settleTrustedWorldBossAccountV26({
  eventId:EVENT,accountId:ACCOUNT,requestId:secondId,
 },f.deps);
 assert.equal(recovered.status,'committed');
 // Refuse forged mutable roster identity and retain reserved attempt.
 f.tamper('WB23_ATTEMPT_THREE',x=>{
  x.frozen.characters[0].characterId='20000000-0000-4000-8000-000000000099';
 });
 await fail(()=>settleTrustedWorldBossAccountV26({
  eventId:EVENT,accountId:ACCOUNT,requestId:'WB23_ATTEMPT_THREE',
 },f.deps),'roster_identity_mismatch');
 assert.equal(f.history.get('WB23_ATTEMPT_THREE')?.record.status,'reserved');
 // Delayed beyond the 15-minute hard lease: no replay and no debit.
 f.setNow(MONDAY+7*DAY+20*60*1000);
 const expired=await settleTrustedWorldBossAccountV26({
  eventId:EVENT,accountId:ACCOUNT,requestId:'WB23_ATTEMPT_THREE',
 },f.deps);
 assert.equal(expired.status,'voided');
 assert.equal(f.metrics().settleCalls,2);

 // V58: one buff tonic per account raid, verified against the party's own saves.
 const replayOf=(g:ReturnType<typeof fixture>)=>{
  const [content]=[...g.artifacts.values()];
  return JSON.parse(content) as {tonicItemId:string|null;replay:{tonicItemId:string|null;rawBossHpDamage:number;
   events:{type:string;abilityId?:string}[]}};
 };
 const plain=fixture();
 await reserveAuthenticatedWorldBossAccountV26({token:'auth-token-verified',
  selection:selection('WB58_PLAIN')},plain.deps);
 await settleTrustedWorldBossAccountV26({eventId:EVENT,accountId:ACCOUNT,requestId:'WB58_PLAIN'},plain.deps);
 const baseline=replayOf(plain);
 assert.equal(baseline.tonicItemId,null);assert.equal(baseline.replay.tonicItemId,null);
 const vigor=fixture({inventoryTonic:'OATH_VIGOR_TONIC'});
 await fail(()=>reserveAuthenticatedWorldBossAccountV26({token:'auth-token-verified',
  selection:{...selection('WB58_NOT_OWNED'),tonicItemId:'OATH_WARD_TONIC'}},vigor.deps),'tonic_not_owned');
 await fail(()=>reserveAuthenticatedWorldBossAccountV26({token:'auth-token-verified',
  selection:{...selection('WB58_FAKE'),tonicItemId:'SUPER_TONIC'}},vigor.deps),'invalid_selection');
 await reserveAuthenticatedWorldBossAccountV26({token:'auth-token-verified',
  selection:{...selection('WB58_VIGOR'),tonicItemId:'OATH_VIGOR_TONIC'}},vigor.deps);
 const frozenTonic=vigor.history.get('WB58_VIGOR')!.frozen.tonic!;
 assert.deepEqual(frozenTonic.consume,{itemId:'OATH_VIGOR_TONIC',characterId:CHARS[0],
  location:'inventory',quantity:1,expectedGameVersion:2},'Reservation must name the exact stack to consume');
 await settleTrustedWorldBossAccountV26({eventId:EVENT,accountId:ACCOUNT,requestId:'WB58_VIGOR'},vigor.deps);
 const boosted=replayOf(vigor);
 assert.equal(boosted.replay.tonicItemId,'OATH_VIGOR_TONIC');
 assert.ok(boosted.replay.rawBossHpDamage>baseline.replay.rawBossHpDamage,
  'A damage tonic must raise real boss damage: '+boosted.replay.rawBossHpDamage+' vs '+baseline.replay.rawBossHpDamage);
 // Bank fallback and a real, ledger-visible Ward mitigation event.
 const ward=fixture({bankTonic:'OATH_WARD_TONIC'});
 await reserveAuthenticatedWorldBossAccountV26({token:'auth-token-verified',
  selection:{...selection('WB58_WARD'),tonicItemId:'OATH_WARD_TONIC'}},ward.deps);
 assert.equal(ward.history.get('WB58_WARD')!.frozen.tonic!.consume.location,'bank');
 await settleTrustedWorldBossAccountV26({eventId:EVENT,accountId:ACCOUNT,requestId:'WB58_WARD'},ward.deps);
 assert.ok(replayOf(ward).replay.events.some(e=>e.type==='mitigate'&&e.abilityId==='TONIC_WARD'),
  'Ward tonic savings must appear as real replay events');
 // A tampered frozen tonic is refused at settlement and the attempt stays reserved.
 const tampered=fixture({inventoryTonic:'VIGOR_TONIC'});
 await reserveAuthenticatedWorldBossAccountV26({token:'auth-token-verified',
  selection:{...selection('WB58_TAMPER'),tonicItemId:'VIGOR_TONIC'}},tampered.deps);
 tampered.tamper('WB58_TAMPER',x=>{(x.frozen.tonic as {itemId:string}).itemId='OATH_VIGOR_TONIC';});
 await fail(()=>settleTrustedWorldBossAccountV26({eventId:EVENT,accountId:ACCOUNT,requestId:'WB58_TAMPER'},
  tampered.deps),'corrupt_frozen_tonic');
 assert.equal(tampered.history.get('WB58_TAMPER')?.record.status,'reserved');
 console.log('WORLD_BOSS_V58_TONIC='+JSON.stringify({ownedOnly:true,inventoryThenBank:true,
  damageRaised:true,wardEvents:true,tamperRefused:true}));
 console.log('WORLD_BOSS_V26_HIDDEN_ACCOUNT_SETTLEMENT='+JSON.stringify({
  charactersFrozen:2,authored14RoundEngine:true,
  exactLocalGuardLedger:true,oldEngineRejected:true,
  exactlyOnce:true,replayFirst:true,
  closesMonday:true,graceRecovery:true,attemptsAccountWide:3,
  noProductionWrites:true,globalHp:f.metrics().hp,
 }));
}
void main().catch(e=>{console.error(e);throw e;});
