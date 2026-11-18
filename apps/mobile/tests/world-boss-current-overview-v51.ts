/** V51 hidden current-cycle private Auth/DB selection, no HTTP or live state. */
import {assert} from './test-assert';
import {
 WORLD_BOSS_V51_AUTHENTICATED_OVERVIEW_LIVE,
 readAuthenticatedCurrentWorldBossOverviewV51,
 createWorldBossCurrentEventPgV51,
 type WorldBossCurrentOverviewDepsV51,
} from '../../../backend/online/world-boss-current-overview-v51';
import type {WorldBossOverviewRowV41} from '../../../backend/online/world-boss-overview-v41';
import {WORLD_BOSS_V52_READ_ROUTE_LIVE,handleWorldBossStatusReadV52} from
 '../../../backend/online/world-boss-current-read-route-v52';

const DAY=86400000;
const LAUNCH=Date.UTC(2026,10,16);
const NOW=LAUNCH+DAY+3600000;
const EVENT='30000000-0000-4000-8000-000000000051';
const ACCOUNT='10000000-0000-4000-8000-000000000051';
const OTHER='10000000-0000-4000-8000-000000000052';
const token='server-verified-token-for-v51';
const event=(index=0)=>({
 eventId:EVENT,bossId:index===0?'hollowroot' as const:'sunscar' as const,
 startsAtUtcMs:LAUNCH+index*14*DAY,
 cycleEndsAtUtcMs:LAUNCH+(index+1)*14*DAY,
});
const row=(start=LAUNCH,readAt=NOW,boss:'hollowroot'|'sunscar'='hollowroot'):
 WorldBossOverviewRowV41=>({
 schema:'world-boss-overview-v41',eventId:EVENT,accountId:ACCOUNT,bossId:boss,
 status:'active',phase:'preparation',startsAtUtcMs:start,endsAtUtcMs:start+7*DAY,
 readAtUtcMs:readAt,maxHp:100000,remainingHp:75000,eventRevision:2,
 attemptsUsed:1,attemptsReserved:0,attemptsCommitted:1,donationsUsed:1,
 warCamp:{eventId:EVENT,revision:2,
  contributions:{fortifications:1,fieldProvisions:1,siegecraft:0},
  goals:{fortifications:{tier1At:1,tier2At:3},
   fieldProvisions:{tier1At:1,tier2At:3},
   siegecraft:{tier1At:1,tier2At:3}},
  frozen:false,snapshot:null},
 rewards:{balance:4,walletRevision:2,claimedThisEvent:5,eventCap:100},
});
const rejection=async(job:()=>Promise<unknown>,part:string)=>{
 let message='';try{await job()}catch(error){message=String(error);}
 assert.ok(message.includes(part),'expected '+part+' got '+message);
};
async function main(){
 assert.equal(WORLD_BOSS_V51_AUTHENTICATED_OVERVIEW_LIVE,false);
 let authCount=0,selectionCount=0,overviewCount=0;
 const deps:WorldBossCurrentOverviewDepsV51={
  authenticate:async(value)=>{authCount++;return value===token?ACCOUNT:null;},
  launchMondayUtcMs:LAUNCH,serverNowUtcMs:()=>NOW,
  events:{async findByCycleStart(start){
   selectionCount++;assert.equal(start,LAUNCH);return event();}},
  overview:{async read(id,who){
   overviewCount++;assert.equal(id,EVENT);assert.equal(who,ACCOUNT);
   return row();
  }},
 };
 // Caller cannot choose event ID, account ID, region or internal clock.
 const result=await readAuthenticatedCurrentWorldBossOverviewV51(
  {token,eventId:'forged',accountId:OTHER,bossId:'frostmarch'} as {token:string},deps);
 assert.ok(result);
 assert.equal(result.eventId,EVENT);
 assert.equal(result.accountId,ACCOUNT);
 assert.equal(result.bossId,'hollowroot');
 assert.equal(Object.hasOwn(result,'canAttack'),false);
 assert.equal(Object.hasOwn(result,'canDonate'),false);
 assert.equal(Object.hasOwn(result,'attemptsRemaining'),false);
 assert.equal(Object.hasOwn(result,'donationsRemaining'),false);
 assert.equal(authCount,1);assert.equal(selectionCount,1);assert.equal(overviewCount,1);

 await rejection(()=>readAuthenticatedCurrentWorldBossOverviewV51({token:'bad'},deps),
  'invalid_auth_reader');
 await rejection(()=>readAuthenticatedCurrentWorldBossOverviewV51(
  {token:'invalid-session-token'},deps),'auth_required');
 assert.equal(selectionCount,1,'authentication must precede event lookup');
 assert.equal(overviewCount,1);

 // Missing event and time before launch fail closed without claiming a boss.
 assert.equal(await readAuthenticatedCurrentWorldBossOverviewV51({token},{
  ...deps,events:{findByCycleStart:async()=>null}}),null);
 assert.equal(await readAuthenticatedCurrentWorldBossOverviewV51({token},{
  ...deps,serverNowUtcMs:()=>LAUNCH-1,
  events:{findByCycleStart:async()=>{throw Error('prelaunch leaked event');}}}),null);

 await rejection(()=>readAuthenticatedCurrentWorldBossOverviewV51({token},{
  ...deps,events:{findByCycleStart:async()=>({...event(),bossId:'sunscar'})},
 }), 'noncanonical_event');
 await rejection(()=>readAuthenticatedCurrentWorldBossOverviewV51({token},{
  ...deps,events:{findByCycleStart:async()=>({...event(),startsAtUtcMs:LAUNCH+DAY})},
 }), 'noncanonical_event');
 await rejection(()=>readAuthenticatedCurrentWorldBossOverviewV51({token},{
  ...deps,events:{findByCycleStart:async()=>({...event(),eventId:'not-a-uuid'})},
 }), 'invalid_private_event');
 await rejection(()=>readAuthenticatedCurrentWorldBossOverviewV51({token},{
  ...deps,overview:{read:async()=>({...row(),accountId:OTHER})},
 }), 'invalid_server_overview');
 await rejection(()=>readAuthenticatedCurrentWorldBossOverviewV51({token},{
  ...deps,overview:{read:async()=>({...row(),bossId:'frostmarch'})},
 }), 'stale_or_foreign_cycle');
 await rejection(()=>readAuthenticatedCurrentWorldBossOverviewV51({token},{
  ...deps,overview:{read:async()=>({...row(),readAtUtcMs:NOW-121000})},
 }), 'stale_or_foreign_cycle');
 await rejection(()=>readAuthenticatedCurrentWorldBossOverviewV51({token},{
  ...deps,serverNowUtcMs:()=>Number.NaN,
 }), 'invalid_server_clock');

 // The second cycle belongs to Solbrand, not a second simultaneous boss.
 const second=LAUNCH+14*DAY;
 const secondNow=second+DAY+3600000;
 const s=await readAuthenticatedCurrentWorldBossOverviewV51({token},{
  ...deps,serverNowUtcMs:()=>secondNow,
  events:{async findByCycleStart(start){
   assert.equal(start,second);return event(1);
  }},
  overview:{async read(){return row(second,secondNow,'sunscar');}},
 });
 assert.equal(s?.bossId,'sunscar');

 // Private selector uses one exact trusted timestamp, parameter binding and
 // LIMIT 2 to fail closed if a future schema permits duplicate event starts.
 const lookups:string[]=[];
 const database=createWorldBossCurrentEventPgV51({
  async query<T extends object>(sql:string,values:readonly unknown[]){
   lookups.push(sql);
   assert.ok(sql.includes('FROM private.world_boss_events_v17'));
   assert.ok(sql.includes('LIMIT 2'));
   assert.ok(sql.includes('WHERE starts_at > $1::timestamptz'));
   assert.ok(sql.includes('AND starts_at < $2::timestamptz'));
   assert.ok(sql.includes('$3::double precision'));
   assert.ok(!sql.includes('interval'), 'UTC bounds must ignore local DST');
   assert.deepEqual(values,[new Date(LAUNCH-14*DAY).toISOString(),
    new Date(LAUNCH+14*DAY).toISOString(),14*DAY]);
   return {rows:[event() as unknown as T]};
  },
 });
 assert.equal((await database.findByCycleStart(LAUNCH))?.eventId,EVENT);
 assert.equal(lookups.length,1);
 const duplicates=createWorldBossCurrentEventPgV51({
  async query<T extends object>(){return {rows:[event(),event()] as unknown as T[]};},
 });
 await rejection(()=>duplicates.findByCycleStart(LAUNCH),'duplicate_global_event');
 await rejection(()=>database.findByCycleStart(LAUNCH+DAY),'invalid_cycle_start');
 // DST-sensitive sessions must not alter either boundary. Query parameters
 // are computed solely from the trusted UTC cycle start, not PG timezone.
 const springMonday=Date.UTC(2027,2,29);
 const springDb=createWorldBossCurrentEventPgV51({
  async query<T extends object>(_sql:string,values:readonly unknown[]){
   assert.deepEqual(values,[new Date(springMonday-14*DAY).toISOString(),
    new Date(springMonday+14*DAY).toISOString(),14*DAY]);
   return {rows:[] as T[]};
  },
 });
 assert.equal(await springDb.findByCycleStart(springMonday),null);


 assert.equal(WORLD_BOSS_V52_READ_ROUTE_LIVE,false);
 const good=await handleWorldBossStatusReadV52(
  {method:'GET',authorization:'Bearer '+token,query:null},deps);
 assert.equal(good.status,200);
 assert.equal(good.body&&'bossId' in good.body?good.body.bossId:null,'hollowroot');
 assert.equal(good.headers['Cache-Control'],'private, no-store, max-age=0');
 assert.equal(good.headers.Vary,'Authorization');
 assert.equal(Object.hasOwn(good.body??{},'canAttack'),false);
 const noEvent=await handleWorldBossStatusReadV52(
  {method:'GET',authorization:'Bearer '+token,query:null},{
   ...deps,events:{findByCycleStart:async()=>null}});
 assert.equal(noEvent.status,204);
 assert.equal(noEvent.body,null);
 const invalidLogin=await handleWorldBossStatusReadV52(
  {method:'GET',authorization:'Bearer invalid-auth-credential',query:null},deps);
 assert.equal(invalidLogin.status,401);
 const emptyLogin=await handleWorldBossStatusReadV52(
  {method:'GET',authorization:null,query:null},deps);
 assert.equal(emptyLogin.status,401);
 const wrongMethod=await handleWorldBossStatusReadV52(
  {method:'POST',authorization:'Bearer '+token,query:null},deps);
 assert.equal(wrongMethod.status,405);
 const arbitraryEvent=await handleWorldBossStatusReadV52(
  {method:'GET',authorization:'Bearer '+token,query:'eventId='+EVENT},deps);
 assert.equal(arbitraryEvent.status,400);
 const arbitraryAccount=await handleWorldBossStatusReadV52(
  {method:'GET',authorization:'Bearer '+token,query:'accountId='+OTHER},deps);
 assert.equal(arbitraryAccount.status,400);
 const unavailable=await handleWorldBossStatusReadV52(
  {method:'GET',authorization:'Bearer '+token,query:null},{
   ...deps,events:{findByCycleStart:async()=>{throw Error('secret sql '+OTHER);}}});
 assert.equal(unavailable.status,503);
 assert.equal(JSON.stringify(unavailable).includes(OTHER),false);
 assert.equal(JSON.stringify(unavailable).includes(token),false);
 console.log('WORLD_BOSS_V52_UNMOUNTED_GET_READONLY_HANDLER=PASS');

 console.log('WORLD_BOSS_V51_OWNER_SCOPED_READONLY_CYCLE=PASS');
}
void main().catch(error=>{console.error(error);throw error;});
