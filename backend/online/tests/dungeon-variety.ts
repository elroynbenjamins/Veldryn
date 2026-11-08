import assert from 'node:assert/strict';
import {EXPEDITIONS} from '../../src/server/expeditions/content/launch-content';
import {coopContentPool} from '../../src/server/expeditions/content/coop-route-content';
import {generateCoopRouteGraph} from '../../src/server/expeditions/route-generation';
import {COOP_ROOM_MODIFIERS} from '../../src/server/expeditions/coop-room-modifiers';
import {EXPEDITION_ENCOUNTERS} from '../../src/server/combat/content/expedition-encounters';
import {buildExpeditionEncounter} from '../../src/server/combat/expedition-combat-service';
import {launchPlayer} from '../../src/server/combat/content/launch-combat';
import {initialPersistentRunState,resolveCoopNode} from '../../src/server/expeditions/node-resolution';
import {OnlineLiveRuntime} from '../live-runtime';
import type {QModeRun} from '../../src/server/coop/qmode';

const available=Object.values(EXPEDITIONS).filter(item=>item.coopImplemented);
assert(available.length>=6,'There should be several playable dungeon catalogs');
for(const dungeon of available){
 for(const kind of ['battle','elite'] as const){
  const pool=coopContentPool(dungeon.id,kind);
  assert(pool.length>=3,`${dungeon.id} ${kind} needs at least three options`);
  for(const id of pool){
   const factory=EXPEDITION_ENCOUNTERS[id];
   assert(factory,`${dungeon.id} missing real ${kind} combat factory: ${id}`);
   const enemies=factory();
   assert(enemies.length>0&&enemies.every(enemy=>enemy.abilities.length>0),`${id} must have real combat abilities`);
  }
 }
 assert(EXPEDITION_ENCOUNTERS[dungeon.bossId],`${dungeon.id} missing final boss`);
 for(let n=0;n<3;n++){
  const graph=generateCoopRouteGraph('variety-secret',dungeon.id,`variety-${dungeon.id}-${n}`,'content-v1','balance-v1');
  assert.equal(graph.preBossNodeCount,5);
  for(let depth=1;depth<=5;depth++){
   const options=graph.nodes.filter(node=>node.depth===depth);
   assert.equal(options.length,3,'Each tier has three real route choices');
   assert.equal(new Set(options.map(item=>`${item.contentId}:${item.modifierId}`)).size,3,'No duplicate route presentations');
  }
 }
}

const signatures=(ids:string[])=>ids.map(id=>{
 const enemy=EXPEDITION_ENCOUNTERS[id]?.()[0];
 assert(enemy,`Missing elite ${id}`);
 return [enemy.name,...enemy.abilities.map(x=>x.name)].join('|');
});
assert.equal(new Set(signatures(['ROOT_ELITE_BRAMBLE','ROOT_ELITE_WARDEN','ROOT_ELITE_MYCELIUM'])).size,3,
 'Rootbound elites must be mechanically different, not three copies');
assert.equal(new Set(signatures(['LANTERN_ELITE_01','LANTERN_ELITE_02','LANTERN_ELITE_03'])).size,3,
 'Lanternwatch elites must be mechanically different');

const base=buildExpeditionEncounter({encounterId:'ROOT_SCOUTS'});
assert(base.length>=2);
assert.equal(buildExpeditionEncounter({encounterId:'ROOT_SCOUTS',roomModifierId:'steady'})[0].abilities.length,base[0].abilities.length);
for(const id of Object.keys(COOP_ROOM_MODIFIERS)){
 const enemies=buildExpeditionEncounter({encounterId:'ROOT_SCOUTS',roomModifierId:id});
 assert.equal(enemies.length,base.length);
 assert(enemies.every(e=>e.stats.maxHp>0&&e.stats.attackPower>0&&e.stats.defense>0));
 if(id!=='steady')assert.notDeepEqual(enemies,base,`${id} must affect gameplay stats and/or real abilities`);
 if(['thorned','volatile','warded','attrition'].includes(id))assert(enemies[0].abilities.length>base[0].abilities.length,`${id} must add a real simulated ability`);
}
assert.equal(buildExpeditionEncounter({encounterId:'ROOT_SCOUTS',roomModifierId:'unknown'})[0].abilities.length,base[0].abilities.length,'Old route modifiers fail safely');

const players=[launchPlayer('Ironwarden',25),launchPlayer('Wayfinder',25),launchPlayer('Ravager',25),launchPlayer('Dawnkeeper',25)];
const starting=initialPersistentRunState(players);
const node=(kind:'risk'|'event'|'treasure',contentId:string)=>({
 nodeId:`test-${kind}`,depth:3,kind,contentId,modifierId:'steady',risk:1,rewardTag:kind,nextNodeIds:['boss'],
});
const risk=resolveCoopNode({runId:'risk-test',serverSecret:'risk-secret',node:node('risk','ROOT_RISK_OVERGROWTH'),players,state:starting});
assert(risk.success);assert.equal(risk.state.resources,2);
assert.equal(risk.state.curses.length,1);
assert(Number(risk.summary.damagedHp)>0,'Risk must hurt the party, not only add an unused curse');
assert(players.every(player=>(risk.state.actors[player.id]?.hp??Infinity)<player.stats.maxHp),'Real HP loss on risk path');
const event=resolveCoopNode({runId:'event-test',serverSecret:'event-secret',node:node('event','ROOT_EVENT_WHISPER'),players,state:starting});
assert.equal(event.state.resources,1);
assert.equal(event.state.boons.length,1,'Event grants a lasting run boon, not only shop resources');
const cache=resolveCoopNode({runId:'cache-test',serverSecret:'cache-secret',node:node('treasure','ROOT_CACHE_BURIED'),players,state:starting});
assert.equal(cache.state.artifacts.length,1);


// Preserve a representative published Sunscar party's viable clear rate when
// adjusting room modifiers. These deterministic samples are regression checks,
// not actual player completion data.
function sunscarPublishedClearRate():number{
 const {createCharacter,newGame}=require('../../../apps/mobile/src/core/game') as typeof import('../../../apps/mobile/src/core/game');
 const {noviceItemId,noviceSetFor}=require('../../../apps/mobile/src/content/novice-sets') as typeof import('../../../apps/mobile/src/content/novice-sets');
 const {deriveOnlineCoopLoadout}=require('../coop-loadout') as typeof import('../coop-loadout');
 const {resolveAndFreezeLoadout}=require('../../src/server/coop/loadout-snapshots') as typeof import('../../src/server/coop/loadout-snapshots');
 const {MemoryQModeRunRepository,QModeService}=require('../../src/server/coop/qmode') as typeof import('../../src/server/coop/qmode');
 const roster=(['IRONWARDEN','WAYFINDER','RAVAGER','DAWNKEEPER'] as const).map((classId,index)=>{
  const state=createCharacter(newGame(0),classId,'Balance Test');
  state.character!.id=`character-${index}`;state.character!.level=100;
  state.character!.equipment=Object.fromEntries(noviceSetFor(classId).slots.map(slot=>[slot,noviceItemId(classId,slot)]));
  const record=deriveOnlineCoopLoadout(`account-${index}`,state,1);
  return resolveAndFreezeLoadout({accountId:record.accountId,characterId:record.characterId,loadoutId:'current',expectedRevision:1,minLevel:15,syncLevel:45,repository:{getOwnedLoadout:()=>record}});
 });
 let clears=0;
 for(let seed=0;seed<100;seed++){
  const id=`EXP_003-IRONWARDEN-DAWNKEEPER-WAYFINDER-${seed}`;
  const service=new QModeService(new MemoryQModeRunRepository(),'published-loadout-balance-v1');
  let run=service.create({requestId:id,runId:id,controllerAccountId:roster[0].accountId,controllerSnapshot:roster[0],expeditionId:'EXP_003',tier:1,contentVersion:'online-coop-loadout-v1',balanceVersion:'online-coop-loadout-v1',nowMs:1000,profiles:roster.slice(1).map((snapshot,index)=>({profileId:'echo-'+index,sourceAccountId:snapshot.accountId,optedIn:true,publishedAtMs:0,contentVersion:'online-coop-loadout-v1',blockedAccountIds:[],snapshot}))});
  for(let room=0;room<6&&run.phase==='awaiting_choice';room++){
   const current=run.graph.nodes.find(node=>node.nodeId===run.currentNodeId)!;
   const choices=current.nextNodeIds.map(optionId=>run.graph.nodes.find(node=>node.nodeId===optionId)!);
   run=service.choose({runId:id,controllerAccountId:roster[0].accountId,optionNodeId:(choices.find(node=>node.kind==='camp')??choices[0]).nodeId});
  }
  if(run.phase==='completed')clears++;
 }
 return clears;
}
const sunscarClears=sunscarPublishedClearRate();
console.log('Sunscar publishable clear-rate guard:',sunscarClears,'of 100');
assert(sunscarClears>=85,'Real modifiers cannot undercut the published Sunscar clear-rate floor');

async function verifyLiveVoteAuthority(){
const multiRun={currentNodeId:'entry',graph:{nodes:[{nodeId:'entry',nextNodeIds:['d1-c0','d1-c1','d1-c2']}]}} as unknown as QModeRun;
const state={stateVersion:4,eventCursor:0,privateState:{run:multiRun,seed:'test'},clientProjection:{mode:'live'},serverNow:1000};
const request={requestId:'vote-bypass-attempt',decisionId:'entry',decisionRevision:4,optionId:'d1-c0'};
const calls:string[]=[];
const runtime=new OnlineLiveRuntime({
 randomId:()=> 'unused',
 rpc:async(name:string)=>{
  calls.push(name);
  if(name==='read_online_coop_receipt_server_v1')return null;
  if(name==='load_coop_runtime_server_v1')return state;
  throw new Error('unexpected RPC: '+name);
 },
} as unknown as ConstructorParameters<typeof OnlineLiveRuntime>[0]);
await assert.rejects(runtime.choose('account','run',request),/live_vote_required/,'Direct /choose cannot bypass group voting');
assert(!calls.includes('queue_online_live_node_server_v1'),'A bypass attempt must not schedule combat');
const singleState={...state,privateState:{...state.privateState,run:{...multiRun,graph:{nodes:[{nodeId:'entry',nextNodeIds:['boss']}]}}}};
const singleRuntime=new OnlineLiveRuntime({
 randomId:()=> 'unused',
 rpc:async(name:string)=>{
  if(name==='read_online_coop_receipt_server_v1')return null;
  if(name==='load_coop_runtime_server_v1')return singleState;
  throw new Error('unexpected RPC: '+name);
 },
} as unknown as ConstructorParameters<typeof OnlineLiveRuntime>[0]);
await assert.rejects(singleRuntime.choose('account','run',request),/invalid_option/,'Single boss option must exactly match server route');
}
void verifyLiveVoteAuthority().then(()=>console.log('PASS dungeon route diversity, elite roles, real modifiers and fail-closed Live voting')).catch(error=>{console.error(error);process.exitCode=1;});
