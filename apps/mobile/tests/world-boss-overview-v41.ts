/** V41 read-only account board: no routes, wallets or public access. */
import {assert} from './test-assert';
import {makeWorldBossWarCampSnapshotV11} from
 '../../../backend/src/server/combat/world-boss-war-camp-v11';
import {WORLD_BOSS_V41_OVERVIEW_LIVE,createWorldBossOverviewPgV41,
 readAuthenticatedWorldBossOverviewV41,verifyWorldBossOverviewV41,
 type WorldBossOverviewRowV41} from
 '../../../backend/online/world-boss-overview-v41';

const EVENT='30000000-0000-4000-8000-000000000041';
const ACCOUNT='10000000-0000-4000-8000-000000000041';
const OTHER='10000000-0000-4000-8000-000000000042';
const START=Date.UTC(2026,10,16);
const DAY=86400000;
const TODAY=START+DAY+8*3600000;
const fail=async(fn:()=>Promise<unknown>,fragment:string)=>{
 let message='';try{await fn();}catch(e){message=String(e);}
 assert.ok(message.includes(fragment),'expected '+fragment+' got '+message);
};
const baseline:WorldBossOverviewRowV41={
 schema:'world-boss-overview-v41',eventId:EVENT,accountId:ACCOUNT,bossId:'hollowroot',
 status:'active',phase:'preparation',startsAtUtcMs:START,
 endsAtUtcMs:START+7*DAY,readAtUtcMs:TODAY,
 maxHp:100000,remainingHp:91000,eventRevision:4,
 attemptsUsed:0,attemptsReserved:0,attemptsCommitted:0,
 donationsUsed:1,
 warCamp:{
  eventId:EVENT,revision:2,
  contributions:{fortifications:1,fieldProvisions:1,siegecraft:0},
  goals:{
   fortifications:{tier1At:1,tier2At:3},
   fieldProvisions:{tier1At:1,tier2At:3},
   siegecraft:{tier1At:1,tier2At:3},
  },
  frozen:false,snapshot:null,
 },
 rewards:{balance:25,walletRevision:2,claimedThisEvent:5,eventCap:100},
};
async function main(){
 assert.equal(WORLD_BOSS_V41_OVERVIEW_LIVE,false);
 const progress=verifyWorldBossOverviewV41(baseline,EVENT,ACCOUNT);
 assert.equal(progress.canDonate,true);
 assert.equal(progress.canAttack,false);
 assert.equal(progress.attemptsRemaining,3);
 assert.equal(progress.donationsRemaining,1);
 // Earned event Sigils and spendable balance are deliberately independent.
 const spent={...baseline,rewards:{...baseline.rewards,balance:0}};
 assert.equal(verifyWorldBossOverviewV41(spent,EVENT,ACCOUNT).rewards.claimedThisEvent,5);
 const camp=makeWorldBossWarCampSnapshotV11({
  eventId:EVENT,revision:2,
  levels:{fortifications:1,fieldProvisions:1,siegecraft:0},
 });
 const battle:WorldBossOverviewRowV41={...baseline,
  readAtUtcMs:START+5*DAY+12*3600000,phase:'raid',
  attemptsUsed:2,attemptsCommitted:1,attemptsReserved:1,
  warCamp:{...baseline.warCamp,frozen:true,snapshot:camp},
 };
 const b=verifyWorldBossOverviewV41(battle,EVENT,ACCOUNT);
 assert.equal(b.canAttack,true);
 assert.equal(b.canDonate,false);
 assert.equal(b.attemptsRemaining,1);
 assert.equal(verifyWorldBossOverviewV41({...battle,remainingHp:0},
  EVENT,ACCOUNT).canAttack,false);
 const tampered=[
  {...baseline,schema:'unknown' as never},
  {...baseline,accountId:OTHER},
  {...baseline,attemptsUsed:3},
  {...baseline,donationsUsed:3},
  {...baseline,phase:'raid'},
  {...baseline,maxHp:-1},
  {...baseline,rewards:{...baseline.rewards,claimedThisEvent:101}},
  {...baseline,warCamp:{...baseline.warCamp,revision:20}},
 ];
 for(const row of tampered){
  let failed=false;try{verifyWorldBossOverviewV41(row as WorldBossOverviewRowV41,EVENT,ACCOUNT);}
  catch{failed=true;}
  assert.equal(failed,true,'invalid projection must fail closed');
 }
 const unanchored={...baseline,startsAtUtcMs:START+3600000};
 await fail(async()=>verifyWorldBossOverviewV41(unanchored,EVENT,ACCOUNT),'invalid_calendar');
 let called=0;
 const repository=createWorldBossOverviewPgV41({
  async query<T extends object>(statement:string,parameters:readonly unknown[]){
   called++;
   assert.equal(statement,
    'SELECT private.world_boss_v41_overview($1::uuid,$2::uuid) AS state');
   assert.deepEqual(parameters,[EVENT,ACCOUNT]);
   assert.ok(!statement.includes(ACCOUNT));
   return {rows:[{state:baseline} as unknown as T]};
  },
 });
 const deps={authenticate:async(token:string)=>
   token==='server-verified-token'?ACCOUNT:null,db:repository};
 const own=await readAuthenticatedWorldBossOverviewV41({
  token:'server-verified-token',eventId:EVENT},deps);
 assert.equal(own.remainingHp,91000);
 assert.equal(called,1);
 await fail(()=>readAuthenticatedWorldBossOverviewV41({
  token:'invalid-login-token',eventId:EVENT},deps),'auth_required');
 await fail(()=>readAuthenticatedWorldBossOverviewV41({
  token:'server-verified-token',eventId:'bad'},deps),'invalid');
 console.log('WORLD_BOSS_V41_PRIVATE_OVERVIEW=PASS');
}
void main().catch(error=>{console.error(error);throw error;});
