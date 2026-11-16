/**
 * Hidden V9 transaction-port verification. No real database or player accounts.
 * Real equipment/abilities -> V7 engine; atomic rollback, restart-style
 * replay, cross-guild account binding, 4+4 Seals and 3+3 Orders.
 */
import {assert} from './test-assert';
import {CLASSES} from '../src/content/classes';
import {REGIONAL_COMBAT_FIXTURES,regionalCombatFixture} from '../src/core/regional-combat-fixtures';
import {deriveOnlineCoopLoadout,onlineCoopLoadoutHash} from '../../../backend/online/coop-loadout';
import {verifyPartyEventEquippedCopyOwnershipV4} from '../../../backend/online/party-event-loadout-v4';
import {combatantFromVerifiedSnapshot} from '../../../backend/src/server/combat/snapshot-adapter';
import {deriveRole} from '../../../backend/src/server/coop/role-readiness';
import type {GuildPveV8TrustedActor} from '../../../backend/src/server/combat/guild-pve-shared-v8';
import type {GuildPveNodeIdV8} from '../../../backend/src/server/combat/guild-pve-shared-v8';
import {makeGuildPveReferenceV7,type GuildPveDifficultyV7,type GuildPveStanceV7} from '../../../backend/src/server/combat/guild-pve-broken-forge-v7';
import {
 GUILD_PVE_V9_LIVE,InMemoryGuildPveV9Store,GuildPveV9TransactionService,
 makeGuildPveV9Run,registerGuildPveV9TestRun,
 type GuildPveV9Action,type GuildPveV9TrustedLoader,type GuildPveV9Receipt,
} from '../../../backend/src/server/combat/guild-pve-transaction-v9';

const START=Date.UTC(2026,10,16,0);
const DAY=86400000;
const CYCLE='GX_V9_CYCLE_NOV16';
const BASE=REGIONAL_COMBAT_FIXTURES.find(x=>x.regionId==='IRONWOOD')!;
const reference=(attack:number)=>makeGuildPveReferenceV7('T2',{
 attack,defense:650,maxHp:4500
});
const profiles=new Map<string,GuildPveV8TrustedActor>();
const identity=(n:number,variant='A')=>'GX_V9_A'+n+'_CHAR_'+variant;
const owner=(n:number)=>'GX_V9_A'+n;
for(let i=0;i<20;i++)for(const variant of (i===0?['A','B']:['A'])){
 const cls=CLASSES[i%CLASSES.length],account=owner(i),characterId=identity(i,variant);
 const state=regionalCombatFixture({...BASE,tier:'T2',level:15},'prepared',cls.id);
 state.character={...state.character!,id:characterId};
 verifyPartyEventEquippedCopyOwnershipV4(state);
 const record=deriveOnlineCoopLoadout(account,state,1);
 assert.equal(record.legalEquipment,true);
 const actor=combatantFromVerifiedSnapshot({
  ...record.stats,role:deriveRole(cls.id),level:record.combatScalingLevel??record.characterLevel
 },record.abilities);
 profiles.set(account+':'+characterId,{
  actor,characterId,gameRevision:1,sourceHash:onlineCoopLoadoutHash(record),
 });
}
const loader:GuildPveV9TrustedLoader={
 async resolveOwnedActor(account,characterId){
  const a=profiles.get(account+':'+characterId);
  if(!a)throw Error('guild_pve_v9_character_not_owned');
  return a;
 }
};
const runAction=(guildId:string,account:number,nodeId:GuildPveNodeIdV8,
 requestId:string,kind:'battle'|'exploration'='battle',
 stance:GuildPveStanceV7='Assault',variant='A'):GuildPveV9Action=>({
 cycleId:CYCLE,guildId,characterId:identity(account,variant),nodeId,
 requestId,kind,...(kind==='battle'?{stance}:{}),
});
const trusted=(n:number,now=START+DAY)=>({principalAccountId:owner(n),nowUtcMs:now});
const fail=async(f:()=>Promise<unknown>,s:string)=>{
 let caught=false;try{await f()}catch(e){caught=String(e).includes(s)}
 assert.ok(caught,'expected '+s);
};
const NODES:GuildPveNodeIdV8[]=['C1-04','C1-06','C2-01','C2-05','C2-06','C3-01','C3-06'];
const getRun=(store:InMemoryGuildPveV9Store,guildId:string)=>{
 const state=store.inspect();
 const run=Object.values(state.guildRuns).find(r=>r.guildId===guildId);
 assert.ok(run,'missing registered guild '+guildId);
 return run!;
};
const ready=(run:ReturnType<typeof getRun>,id:GuildPveNodeIdV8)=>{
 const def={
  'C1-04':['C1-01'],'C1-06':['C1-04'],
  'C2-01':['C1-06'],'C2-05':['C2-01'],
  'C2-06':['C2-05'],'C3-01':['C2-06'],
  'C3-06':['C3-01','C1-06','C2-06'],
 } as const;
 return def[id as keyof typeof def]?.every(x=>run.nodes[x].cleared)??false;
};
async function register(store:InMemoryGuildPveV9Store,guildId:string,
 members:number[],attack=1000,difficulty:GuildPveDifficultyV7='Scout'){
 await registerGuildPveV9TestRun(store,makeGuildPveV9Run({
  guildId,cycleId:CYCLE,startMs:START,difficulty,reference:reference(attack),
  accountIds:members.map(owner),
 }));
}
async function main(){
 assert.equal(GUILD_PVE_V9_LIVE,false);
 assert.equal(profiles.size,21);
 const store=new InMemoryGuildPveV9Store();
 await register(store,'GX_V9_MAIN',[0,1,2,3],1000);
 const service=new GuildPveV9TransactionService(store,loader);
 await fail(()=>service.commit(trusted(0),runAction('GX_V9_MAIN',0,'C3-06','REQ_LOCK_001')),
  'node_locked');
 const exp=await service.commit(trusted(0),
  runAction('GX_V9_MAIN',0,'C1-02','REQ_EXP_001','exploration'));
 assert.equal(exp.status,'committed');assert.equal(exp.costOrders,1);
 assert.equal(exp.rewardMinted,false);assert.equal(exp.databasePersisted,false);
 assert.equal(getRun(store,'GX_V9_MAIN').members[owner(0)].ordersSpent,1);
 const original=await service.commit(trusted(0),runAction('GX_V9_MAIN',0,'C1-04','REQ_BATTLE_001'));
 assert.equal(original.status,'committed');
 assert.equal(original.costSeals,1);
 assert.ok(original.combat?.castWarnings);
 const after=store.inspect();
 const restarted=new GuildPveV9TransactionService(store,loader);
 const replay=await restarted.commit(trusted(0,START+15*DAY),
  runAction('GX_V9_MAIN',0,'C1-04','REQ_BATTLE_001'));
 assert.deepEqual(replay,original,'same receipt across service object recreation');
 assert.deepEqual(store.inspect(),after,'replay must not modify any state');
 await fail(()=>restarted.commit(trusted(0),
  runAction('GX_V9_MAIN',0,'C1-04','REQ_BATTLE_001','battle','Guard')),
  'idempotency_key_conflict');
 await fail(()=>restarted.commit(trusted(0),
  runAction('GX_V9_MAIN',0,'C1-04','REQ_BATTLE_001','battle','Assault','B')),
  'idempotency_key_conflict');
 await fail(()=>restarted.commit(trusted(0,START+14*DAY),
  runAction('GX_V9_MAIN',0,'C1-04','REQ_CLOSED_NEW')),
  'run_not_active');
 await fail(()=>restarted.commit(trusted(1),runAction('GX_V9_MAIN',1,'C1-04',
  'REQ_IMPERSONATE_001','battle','Assault','B')),'character_not_owned');

 // In-memory "DB" transaction injects a fault AFTER V7 combat but BEFORE
 // atomic candidate state promotion; an abort cannot debit or save a receipt.
 const pre=store.inspect();
 store.abortNextTransactionBeforeCommit();
 await fail(()=>restarted.commit(trusted(1),
  runAction('GX_V9_MAIN',1,'C1-04','REQ_ABORT_001')),
  'injected_commit_abort');
 assert.deepEqual(store.inspect(),pre,'aborted transaction must roll back HP and Seal');
 const recovered=await restarted.commit(trusted(1),
  runAction('GX_V9_MAIN',1,'C1-04','REQ_ABORT_001'));
 assert.equal(recovered.status,'committed');
 assert.equal(getRun(store,'GX_V9_MAIN').members[owner(1)].sealsSpent,1);

 // Concurrency: one valid attack removes a tiny shared target; another
 // authentic account gets a persisted stale receipt at zero cost.
 const race=new InMemoryGuildPveV9Store();
 await register(race,'GX_V9_RACE',[0,1],1);
 const serviceA=new GuildPveV9TransactionService(race,loader);
 const serviceB=new GuildPveV9TransactionService(race,loader);
 const [ra,rb]=await Promise.all([
  serviceA.commit(trusted(0),runAction('GX_V9_RACE',0,'C1-04','REQ_RACE_A')),
  serviceB.commit(trusted(1),runAction('GX_V9_RACE',1,'C1-04','REQ_RACE_B')),
 ]);
 assert.equal(ra.status,'committed');assert.equal(rb.status,'stale');
 assert.equal(ra.costSeals,1);assert.equal(rb.costSeals,0);
 assert.equal(getRun(race,'GX_V9_RACE').nodes['C1-04'].hp,0);
 assert.equal(getRun(race,'GX_V9_RACE').members[owner(1)].sealsSpent,0);
 const rbRetry=await serviceA.commit(trusted(1,START+15*DAY),
  runAction('GX_V9_RACE',1,'C1-04','REQ_RACE_B'));
 assert.deepEqual(rbRetry,rb);

 // Two separate guild runs, one cycle: only the first successful action
 // binds the account. The attempted second action cannot debit either run.
 const cross=new InMemoryGuildPveV9Store();
 await register(cross,'GX_V9_GUILD1',[0],1);
 await register(cross,'GX_V9_GUILD2',[0],1);
 const both=new GuildPveV9TransactionService(cross,loader);
 await both.commit(trusted(0),runAction('GX_V9_GUILD1',0,'C1-04','REQ_GUILD_1'));
 await fail(()=>both.commit(trusted(0),runAction('GX_V9_GUILD2',0,'C1-04','REQ_GUILD_2')),
  'already_bound_to_other_guild');
 assert.equal(getRun(cross,'GX_V9_GUILD2').members[owner(0)].sealsSpent,0);
 assert.equal(Object.keys(cross.inspect().cycleBindings).length,1);

 // With durable-backed service, 4+4 attempt quota is still per ACCOUNT
 // even when one account switches from character A to B.
 const alt=new InMemoryGuildPveV9Store();
 await register(alt,'GX_V9_ALT',[0],5000);
 const altSrv=new GuildPveV9TransactionService(alt,loader);
 for(let i=0;i<4;i++){
  const a=await altSrv.commit(trusted(0),runAction('GX_V9_ALT',0,'C1-04',
   'REQ_ALT_W1_'+i,'battle',i%2===0?'Guard':'Assault',i%2===0?'B':'A'));
  assert.equal(a.costSeals,1);
 }
 await fail(()=>altSrv.commit(trusted(0),runAction('GX_V9_ALT',0,'C1-04','REQ_ALT_5')),
  'no_assault_seals');
 const day8=await altSrv.commit(trusted(0,START+8*DAY),
  runAction('GX_V9_ALT',0,'C1-04','REQ_ALT_W2','battle','Rally','B'));
 assert.equal(day8.costSeals,1);
 assert.equal(getRun(alt,'GX_V9_ALT').members[owner(0)].sealsSpent,5);

 // Test 3+3 Orders with synthetic low HP mandatory nodes and 4+4 Seals.
 const orders=new InMemoryGuildPveV9Store();
 await register(orders,'GX_V9_ORDERS',[0],1);
 const orderSrv=new GuildPveV9TransactionService(orders,loader);
 for(const [i,node] of (['C1-04','C1-06','C2-01','C2-05'] as GuildPveNodeIdV8[]).entries()){
  const r=await orderSrv.commit(trusted(0),runAction('GX_V9_ORDERS',0,node,'REQ_ORDER_B1_'+i));
  assert.equal(r.status,'committed');
 }
 for(const [i,node] of (['C1-02','C1-05','C2-02'] as GuildPveNodeIdV8[]).entries()){
  const r=await orderSrv.commit(trusted(0),
   runAction('GX_V9_ORDERS',0,node,'REQ_ORDER_E1_'+i,'exploration'));
  assert.equal(r.costOrders,1);
 }
 await fail(()=>orderSrv.commit(trusted(0),
  runAction('GX_V9_ORDERS',0,'C2-03','REQ_ORDER_LIMIT','exploration')),
  'no_exploration_orders');
 for(const [i,node] of (['C2-06','C3-01','C3-06'] as GuildPveNodeIdV8[]).entries()){
  const r=await orderSrv.commit(trusted(0,START+8*DAY),
   runAction('GX_V9_ORDERS',0,node,'REQ_ORDER_B2_'+i));
  assert.equal(r.costSeals,1);
 }
 for(const [i,node] of (['C2-03','C3-02','C3-04'] as GuildPveNodeIdV8[]).entries()){
  const r=await orderSrv.commit(trusted(0,START+8*DAY),
   runAction('GX_V9_ORDERS',0,node,'REQ_ORDER_E2_'+i,'exploration'));
  assert.equal(r.costOrders,1);
 }
 const fin=getRun(orders,'GX_V9_ORDERS');
 assert.equal(fin.nodes['C3-06'].cleared,true);
 assert.equal(fin.members[owner(0)].ordersSpent,6);
 assert.equal(fin.members[owner(0)].sealsSpent,7);
 for(const n of ['C1-04','C2-01','C2-05','C3-01'] as GuildPveNodeIdV8[])
  assert.equal(fin.nodes[n].phaseTriggers.length,0);
 for(const n of ['C1-06','C2-06','C3-06'] as GuildPveNodeIdV8[])
  assert.equal(fin.nodes[n].phaseTriggers.length,2);

 // Reference cohorts: compare a planned 75% turnout, six accepted Seals
 // per attending account if the run hasn't already cleared its route.
 const matrix=[] as Array<{members:number;tier:string;attending:number;
  attempts:number;finished:boolean;mandatory:number;guildRevision:number;
  pressure:number;totalCreditedHp:number;replayReceipts:number}>;
 for(const size of [1,2,3,4,8,12,20])
 for(const tier of ['Scout','Veteran','Mythic'] as const){
  const roster=Array.from({length:size},(_,i)=>i);
  const attendees=roster.slice(0,Math.ceil(size*.75));
  const s=new InMemoryGuildPveV9Store();
  const guild='GX_V9_GRID_'+size+'_'+tier;
  await register(s,guild,roster,1000,tier);
  const srv=new GuildPveV9TransactionService(s,loader);
  let attempts=0,totalCreditedHp=0;
  for(const week of [0,1]){
   for(let round=0;round<3;round++)for(const acc of attendees){
    const snapshot=getRun(s,guild);
    const target=NODES.find(id=>!snapshot.nodes[id].cleared&&ready(snapshot,id));
    if(!target)continue;
    const stance=(attempts%3===0?'Assault':attempts%3===1?'Guard':'Rally') as GuildPveStanceV7;
    const r=await srv.commit(trusted(acc,START+(week?8:1)*DAY),
     runAction(guild,acc,target,'GRID_'+size+'_'+tier+'_'+week+'_'+round+'_'+acc,
      'battle',stance));
    if(r.status==='committed'){attempts++;totalCreditedHp+=r.creditedHp;}
   }
  }
  const final=getRun(s,guild);
  matrix.push({members:size,tier,attending:attendees.length,attempts,
   finished:final.nodes['C3-06'].cleared,
   mandatory:NODES.filter(id=>final.nodes[id].cleared).length,
   guildRevision:final.revision,pressure:final.pressure,
   totalCreditedHp:Number(totalCreditedHp.toFixed(2)),
   replayReceipts:Object.keys(s.inspect().receipts).length});
 }
 assert.equal(matrix.length,21);
 console.log('GUILD_PVE_V9_META='+JSON.stringify({
  hidden:true,realCombat:true,liveDb:false,supabaseSchemaChanged:false,
  activePlayersRead:0,rewardMinted:0,inventorySpent:0,
  transactionalPort:true,mockRollback:true,mockMultiServiceReplay:true,
  productionDurability:false,matrixCases:matrix.length,
 }));
 for(const m of matrix)console.log('GUILD_PVE_V9_MATRIX='+JSON.stringify(m));
}
void main().catch(e=>{console.error(e);throw e;});
