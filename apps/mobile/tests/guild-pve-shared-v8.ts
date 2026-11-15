/**
 * V8 hidden Guild PvE shared run fixture.
 * Real engine via verified source-derived equipment/ability snapshots.
 * Isolated in-memory guild model: NO live auth, DB, inventory or payouts.
 */
import {assert} from './test-assert';
import {CLASSES} from '../src/content/classes';
import {regionalCombatFixture,REGIONAL_COMBAT_FIXTURES} from '../src/core/regional-combat-fixtures';
import {deriveOnlineCoopLoadout,onlineCoopLoadoutHash} from '../../../backend/online/coop-loadout';
import {verifyPartyEventEquippedCopyOwnershipV4} from '../../../backend/online/party-event-loadout-v4';
import {combatantFromVerifiedSnapshot} from '../../../backend/src/server/combat/snapshot-adapter';
import {deriveRole} from '../../../backend/src/server/coop/role-readiness';
import {
 GuildPveV8InMemoryGuild,GuildPveV8CycleBindings,
 GUILD_PVE_V8_LIVE,GUILD_PVE_V8_MANIFEST,verifyGuildPveV8Manifest,
 type GuildPveV8TrustedActor,type GuildPveNodeIdV8,
} from '../../../backend/src/server/combat/guild-pve-shared-v8';
import {makeGuildPveReferenceV7,
 type GuildPveDifficultyV7,type GuildPveStanceV7,
} from '../../../backend/src/server/combat/guild-pve-broken-forge-v7';

const START=Date.UTC(2026,10,16,0,0,0);
const DAY=86400000;
const T2=REGIONAL_COMBAT_FIXTURES.find(x=>x.regionId==='IRONWOOD')!;
const byIdentity=new Map<string,GuildPveV8TrustedActor>();
function id(account:string,kind='A'){return account+'_CHAR_'+kind;}
function setup(account:string,clsIndex:number,kind='A'){
 const cls=CLASSES[clsIndex%CLASSES.length];
 const char=id(account,kind);
 const state=regionalCombatFixture({...T2,tier:'T2',level:15},'prepared',cls.id);
 state.character={...state.character!,id:char};
 verifyPartyEventEquippedCopyOwnershipV4(state);
 const record=deriveOnlineCoopLoadout(account,state,1);
 assert.ok(record.legalEquipment);
 const actor=combatantFromVerifiedSnapshot({...record.stats,role:deriveRole(cls.id),
  level:record.combatScalingLevel??record.characterLevel},record.abilities);
 assert.equal(actor.id,char);
 const row:GuildPveV8TrustedActor={actor,sourceHash:onlineCoopLoadoutHash(record),
  characterId:char,gameRevision:1};
 byIdentity.set(account+':'+char,row);
 return row;
}
for(let j=0;j<20;j++)setup('GX8_FX_'+j,j);
setup('GX8_FX_0',0,'B');
const loader={async loadOwnedActor({accountId,characterId}:{accountId:string;characterId:string}){
 const result=byIdentity.get(accountId+':'+characterId);
 if(!result)throw Error('guild_pve_v8_character_not_owned');
 return result;
}};
const fight=(accountId:string,nodeId:GuildPveNodeIdV8,requestId:string,
 stance:GuildPveStanceV7='Assault',kind='A')=>({
 kind:'battle' as const,accountId,characterId:id(accountId,kind),requestId,nodeId,stance
});
const explore=(accountId:string,nodeId:GuildPveNodeIdV8,requestId:string)=>({
 kind:'exploration' as const,accountId,characterId:id(accountId),requestId,nodeId
});
const reference=(attack=1000)=>makeGuildPveReferenceV7('T2',{
 attack,defense:650,maxHp:4500
});
const create=(guildId:string,members:string[],opts:{
 attack?:number;eventId?:string;difficulty?:GuildPveDifficultyV7;
 bindings?:GuildPveV8CycleBindings
}={})=>new GuildPveV8InMemoryGuild({
 eventId:opts.eventId??'GXV8_EVENT_20261116',guildId,startUtcMs:START,
 difficulty:opts.difficulty??'Scout',accountIds:members,
 reference:reference(opts.attack??1000),
 loader,bindings:opts.bindings??new GuildPveV8CycleBindings(),
});
const err=async(fn:()=>Promise<unknown>,code:string)=>{
 let caught=false;try{await fn();}catch(e){caught=String(e).includes(code);}
 assert.ok(caught,'expected '+code);
};
const node=(g:GuildPveV8InMemoryGuild,id:GuildPveNodeIdV8,now=START)=>g.snapshot(now).nodes.find(x=>x.id===id)!;
const members=(n:number)=>Array.from({length:n},(_,i)=>'GX8_FX_'+i);
const REQUIRED:GuildPveNodeIdV8[]=['C1-04','C1-06','C2-01','C2-05','C2-06','C3-01','C3-06'];

async function main(){
 assert.equal(GUILD_PVE_V8_LIVE,false);
 assert.equal(verifyGuildPveV8Manifest(),18);
 assert.equal(GUILD_PVE_V8_MANIFEST.filter(x=>x.required&&x.boss).length,7);
 const g=create('GXV8_BASIC',members(4),{attack:1000});
 assert.equal(node(g,'C1-01').state,'cleared');
 assert.equal(node(g,'C1-06').state,'locked');
 assert.equal(node(g,'C3-06').state,'locked');
 await err(()=>g.commit(fight(members(4)[0],'C3-06','BLOCKED_TRY_001'),START),'node_locked');
 const o=await g.commit(explore('GX8_FX_0','C1-02','EXPLORE_TEST_001'),START);
 assert.equal(o.costOrders,1);
 assert.equal(o.result,null);
 assert.equal(node(g,'C1-02').state,'cleared');
 assert.equal(node(g,'C1-05').state,'ready');
 const repeat=await g.commit(explore('GX8_FX_0','C1-02','EXPLORE_TEST_001'),START+DAY);
 assert.deepEqual(repeat,o);
 const stale=await g.commit(explore('GX8_FX_1','C1-02','EXPLORE_TEST_002'),START);
 assert.equal(stale.status,'stale');
 assert.equal(stale.costOrders,0);

 const one=await g.commit(fight('GX8_FX_0','C1-04','COMBAT_BASIC_001'),START);
 assert.equal(one.status,'committed');
 assert.equal(one.costSeals,1);
 assert.ok(one.creditedHp>=0);
 assert.ok(one.result?.castWarnings);
 assert.equal(one.rewardGranted,false);
 assert.equal(one.serverPersisted,false);
 const original=g.snapshot(START);
 original.nodes[0].name='TAMPER';
 assert.notEqual(node(g,'C1-01').name,'TAMPER','snapshot should be cloned');
 assert.equal(g.snapshot(START).members.GX8_FX_0.orders,1);
 assert.equal(g.snapshot(START).members.GX8_FX_0.seals,1);
 const rerun=await g.commit(fight('GX8_FX_0','C1-04','COMBAT_BASIC_001'),START+15*DAY);
 assert.deepEqual(rerun,one,'duplicate after close is readable and no extra debit');
 await err(()=>g.commit({...fight('GX8_FX_0','C1-04','COMBAT_BASIC_001'),stance:'Guard'},START),
  'idempotency_key_reused');
 await err(()=>g.commit(fight('GX8_FX_1','C1-04','CLOSED_NEW_001'),START+14*DAY),
  'outside_active_window');
 // Same key across characters never acts as a second account-wide retry.
 await err(()=>g.commit(fight('GX8_FX_0','C1-04','COMBAT_BASIC_001','Assault','B'),START),
  'idempotency_key_reused');

 // Two identical asynchronous requests resolve once; second different account
 // finds the already-cleared target and is not charged.
 const tiny=create('GXV8_RACE',members(4),{attack:1});
 const [a,b]=await Promise.all([
  tiny.commit(fight('GX8_FX_0','C1-04','RACE_ATK_A'),START+DAY),
  tiny.commit(fight('GX8_FX_1','C1-04','RACE_ATK_B'),START+DAY),
 ]);
 assert.equal(a.status,'committed');
 assert.equal(b.status,'stale');
 assert.equal(a.costSeals,1);
 assert.equal(b.costSeals,0);
 assert.equal(tiny.snapshot(START).members.GX8_FX_0.seals,1);
 assert.equal(tiny.snapshot(START).members.GX8_FX_1.seals,0);
 assert.equal(node(tiny,'C1-04').state,'cleared');
 assert.deepEqual((await tiny.commit(fight('GX8_FX_0','C1-04','RACE_ATK_A'),START)),a);

 // Deliberately tiny reference HP for deterministic graph and Order budget
 // validation ONLY. This is NOT an intended single-member live clear rate.
 const orderRun=create('GXV8_ORDER_CAP',['GX8_FX_0'],{attack:1});
 for(const [i,nodeId] of (['C1-04','C1-06','C2-01','C2-05'] as GuildPveNodeIdV8[]).entries()){
  const o=await orderRun.commit(fight('GX8_FX_0',nodeId,'ORDER_PATH_W1_'+i),START+DAY);
  assert.equal(o.costSeals,1);
  assert.equal(node(orderRun,nodeId).state,'cleared');
 }
 for(const [i,nodeId] of (['C1-02','C1-05','C2-02'] as GuildPveNodeIdV8[]).entries()){
  const o=await orderRun.commit(explore('GX8_FX_0',nodeId,'ORDER_CAP_W1_'+i),START+DAY);
  assert.equal(o.costOrders,1);
 }
 assert.equal(orderRun.snapshot(START).members.GX8_FX_0.orders,3);
 await err(()=>orderRun.commit(explore('GX8_FX_0','C2-03','ORDER_CAP_W1_BLOCK'),
  START+DAY),'orders_exhausted');
 for(const [i,nodeId] of (['C2-06','C3-01','C3-06'] as GuildPveNodeIdV8[]).entries()){
  const o=await orderRun.commit(fight('GX8_FX_0',nodeId,'ORDER_PATH_W2_'+i),
   START+8*DAY);
  assert.equal(o.costSeals,1);
  assert.equal(node(orderRun,nodeId,START+8*DAY).state,'cleared');
 }
 for(const [i,nodeId] of (['C2-03','C3-02','C3-04'] as GuildPveNodeIdV8[]).entries()){
  const o=await orderRun.commit(explore('GX8_FX_0',nodeId,'ORDER_CAP_W2_'+i),
   START+8*DAY);
  assert.equal(o.costOrders,1);
 }
 const orderState=orderRun.snapshot(START+8*DAY);
 assert.equal(orderState.members.GX8_FX_0.seals,7);
 assert.equal(orderState.members.GX8_FX_0.orders,6);
 assert.equal(node(orderRun,'C3-06',START+8*DAY).state,'cleared');
 for(const id of ['C1-04','C2-01','C2-05','C3-01'] as GuildPveNodeIdV8[])
  assert.equal(node(orderRun,id,START+8*DAY).transitions.length,0,
   'a skirmish has no invented guardian phase triggers');
 for(const id of ['C1-06','C2-06','C3-06'] as GuildPveNodeIdV8[])
  assert.equal(node(orderRun,id,START+8*DAY).transitions.length,2,
   'a three-phase guardian passes both thresholds once');

 // First successful action binds an account to this guild for the whole cycle;
 // a different guild using the same shared *in-memory* registry must reject it.
 const bindings=new GuildPveV8CycleBindings();
 const g1=create('GXV8_GUILD_A',['GX8_FX_2'],{bindings,attack:1});
 const g2=create('GXV8_GUILD_B',['GX8_FX_2'],{bindings,attack:1});
 await g1.commit(fight('GX8_FX_2','C1-04','GUILD_BIND_A'),START);
 await err(()=>g2.commit(fight('GX8_FX_2','C1-04','GUILD_BIND_B'),START),
  'already_bound_to_other_guild');
 assert.equal(g2.snapshot(START).members.GX8_FX_2.seals,0);
 assert.equal(bindings.get('GXV8_EVENT_20261116','GX8_FX_2'),'GXV8_GUILD_A');

 // Deliberately overtuned guardian threat means four valid but failed
 // individual attacks can exhaust week one; alternate character shares quota.
 const alt=create('GXV8_ALTS',['GX8_FX_0'],{attack:5000});
 for(let i=0;i<4;i++){
  const receipt=await alt.commit(fight('GX8_FX_0','C1-04','ALT_WEEK1_'+i,
   i%3===0?'Rally':i%2===0?'Guard':'Assault',i%2===0?'B':'A'),START+DAY);
  assert.equal(receipt.costSeals,1,'valid committed losses still spend attempts');
 }
 await err(()=>alt.commit(fight('GX8_FX_0','C1-04','ALT_WEEK1_BLOCK_5','Assault','B'),
  START+DAY),'seals_exhausted');
 assert.equal(alt.snapshot(START).members.GX8_FX_0.seals,4);
 const week2=await alt.commit(fight('GX8_FX_0','C1-04','ALT_WEEK2_5','Assault','B'),
  START+8*DAY);
 assert.equal(week2.costSeals,1);
 assert.equal(alt.snapshot(START+8*DAY).members.GX8_FX_0.seals,5);

 const results=[] as Array<{members:number;tier:string;attempts:number;
  creditedHp:number;clearedMandatory:number;finished:boolean;phaseTransitions:number;
  pressure:number;supportFightCount:number;stale:number}>;
 for(const n of [1,2,3,4,8,12,20])for(const tier of ['Scout','Veteran','Mythic'] as const){
  const group=members(n);
  const run=create('GXV8_MATRIX_'+n+'_'+tier,group,{attack:1000,difficulty:tier});
  let attempts=0,creditedHp=0,transitions=0,guardOrRally=0,staleEvents=0;
  for(let half=0;half<2;half++){
   const t=START+DAY*(half===0?1:8);
   // Round robin with an account having four extra Seals only after Day 8.
   let guard=0;
   while(guard++<n*4){
    const state=run.snapshot(t);
    const available=group.find(id=>state.members[id].seals<(half===0?4:8));
    const target=REQUIRED.find(id=>node(run,id,t).state==='ready');
    if(!available||!target)break;
    const stance=attempts%3===1?'Guard':attempts%3===2?'Rally':'Assault';
    const result=await run.commit(fight(available,target,
     'MATRIX_'+n+'_'+tier+'_'+attempts,stance),t);
    if(result.status==='stale')staleEvents++;
    creditedHp+=result.creditedHp;
    transitions+=result.transitions.length;
    if(stance!=='Assault')guardOrRally++;
    attempts++;
   }
  }
  const snap=run.snapshot(START+10*DAY);
  const clear=REQUIRED.filter(id=>node(run,id,START+10*DAY).state==='cleared').length;
  assert.ok(attempts<=n*8);
  assert.ok(snap.pressure>=0&&snap.pressure<=100);
  assert.equal(snap.receipts,attempts);
  assert.equal(snap.rewardGranted,false);
  assert.equal(snap.serverPersisted,false);
  assert.ok(creditedHp>=0);
  assert.ok(transitions<=6,'only three guardians have two phase boundaries');
  if(clear===7)assert.equal(transitions,6,'full clear must trigger six guardian transitions');
  results.push({members:n,tier,attempts,creditedHp:Number(creditedHp.toFixed(2)),
   clearedMandatory:clear,finished:node(run,'C3-06').state==='cleared',
   phaseTransitions:transitions,pressure:snap.pressure,
   supportFightCount:guardOrRally,stale:staleEvents});
 }
 assert.equal(results.length,21);
 console.log('GUILD_PVE_V8_METADATA='+JSON.stringify({
  sharedRunModel:true,inMemoryOnly:true,realEngineV7Preview:true,
  authenticatedLiveDb:false,rosterCounts:[1,2,3,4,8,12,20],
  difficultyModes:['Scout','Veteran','Mythic'],scenarios:results.length,
  fullCampaignClearNotGuaranteed:true,phaseMechanicsCrossAttemptOnly:true,
  accountBoundSeals:true,resourceAndVotingNodesNotImplemented:true,
  rewardGranted:0,productionWrites:0,liveFeatureEnabled:false,
 }));
 for(const row of results)console.log('GUILD_PVE_V8_MATRIX='+JSON.stringify(row));
}
void main().catch(e=>{console.error(e);throw e;});
