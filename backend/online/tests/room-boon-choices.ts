import assert from 'node:assert/strict';
import {initialPersistentRunState,resolveCoopNode} from '../../src/server/expeditions/node-resolution';
import type {CoopRouteNode} from '../../src/shared/coop-types';
import {MemoryQModeRunRepository,QModeService,type QModeRun} from '../../src/server/coop/qmode';
import {applyRoomBoon,roomBoonOffers,ROOM_BOON_CHOICES} from '../../src/server/coop/room-boon-choices';
import type {CombatantDefinition} from '../../src/server/combat/types';

const actor:CombatantDefinition={
 id:'test-tank',name:'Tank',classId:'IRONWARDEN',team:'players',role:'tank',level:20,
 stats:{maxHp:100,attackPower:40,healingPower:20,defense:30,accuracy:10,evasion:10,critChance:.05,critMultiplier:1.5,haste:0},
 basicAttackMs:1800,basicAttackCoeff:1,abilities:[],
};
const state=initialPersistentRunState([actor]);
const run={
 id:'test-run',requestId:'room-boon-test',controllerAccountId:'account',expeditionId:'EXP_001',tier:1,
 graph:{contentVersion:'v1',nodes:[
  {nodeId:'shrine',depth:3,kind:'shrine',contentId:'SHRINE_SAMPLE',nextNodeIds:['camp']},
  {nodeId:'camp',depth:4,kind:'camp',contentId:'CAMP_SAMPLE',nextNodeIds:[]},
 ]},
 currentNodeId:'shrine',phase:'awaiting_choice',players:[actor],
 persistentState:{...state,actors:{...state.actors,[actor.id]:{...state.actors[actor.id],hp:30,downed:true}},visitedNodeIds:['shrine']},
 qmodePressureVersion:1,echoSourceAccountIds:[],
 lastResolution:{nodeId:'shrine',result:{success:true,state,summary:{kind:'shrine'}}},
} as unknown as QModeRun;
const secret='stable-run-secret';
const offered=roomBoonOffers(run,secret);
assert.equal(offered.length,3);
assert.deepEqual(offered,roomBoonOffers(run,secret),'offers remain stable for retries and reconnects');
assert.equal(new Set(offered.map(row=>row.id)).size,3,'no duplicate boons');
const roomNode=(kind:CoopRouteNode['kind']):CoopRouteNode=>({nodeId:`utility-${kind}`,depth:5,kind,contentId:`TEST_${kind.toUpperCase()}`,modifierId:'steady',risk:1,rewardTag:kind,nextNodeIds:[]});
for(const kind of ['camp','treasure','secret','event','risk','merchant'] as const){
 const copy=structuredClone(run),node=roomNode(kind);
 copy.graph.nodes=[...copy.graph.nodes,node];copy.currentNodeId=node.nodeId;
 copy.lastResolution={nodeId:node.nodeId,result:{success:true,state,summary:{kind}}};
 assert.deepEqual(roomBoonOffers(copy,secret),[],`${kind} must not grant a bonus boon after its own rewards`);
}
for(const kind of ['forge','echo'] as const){
 const copy=structuredClone(run),node=roomNode(kind);
 copy.graph.nodes=[...copy.graph.nodes,node];copy.currentNodeId=node.nodeId;
 copy.lastResolution={nodeId:node.nodeId,result:{success:true,state,summary:{kind}}};
 assert.equal(roomBoonOffers(copy,secret).length,3,`${kind} is a dedicated boon room`);
}
for(const kind of ['camp','treasure','event'] as const){
 const result=resolveCoopNode({runId:'reward-test',serverSecret:secret,node:roomNode(kind),players:[actor],state:initialPersistentRunState([actor]),enemyDamageProfile:'qmode-v1'});
 assert.equal(result.state.boons.length,0,`${kind} rewards cannot include a hidden combat buff`);
 if(kind==='camp')assert.equal(result.state.actors[actor.id].hp,100,'camp only heals the party');
 if(kind==='treasure')assert.equal(result.state.artifacts.length,1,'treasure retains its artifact reward');
 if(kind==='event')assert.equal(result.state.resources,1,'event retains its resource reward');
}
assert.deepEqual(roomBoonOffers({...run,qmodePressureVersion:undefined},secret),[],'Live cannot be controlled by Q-Mode boon selection');
assert.deepEqual(roomBoonOffers({...run,phase:'completed'},secret),[],'terminal runs cannot offer boons');
for(const offer of ROOM_BOON_CHOICES){
 const copy=structuredClone(run);
 applyRoomBoon(copy,offer.id);
 assert.equal(copy.chosenRoomBoons?.shrine,offer.id);
 assert.deepEqual(roomBoonOffers(copy,secret),[],'a selected room cannot offer a second boon');
 if(offer.id==='ROOM_BOON_STRIKE'||offer.id==='ROOM_BOON_WARD')assert.ok(copy.persistentState.boons.includes(offer.id),'combat boon persists');
 if(offer.id==='ROOM_BOON_SUPPLY')assert.equal(copy.persistentState.resources,2,'supply boon grants spendable supplies');
 if(offer.id==='ROOM_BOON_RECOVERY')assert.equal(copy.persistentState.actors[actor.id].hp,50,'recovery restores actual health');
}
const repository=new MemoryQModeRunRepository();repository.save(run);
const service=new QModeService(repository,secret);
assert.throws(()=>service.choose({runId:run.id,controllerAccountId:'account',optionNodeId:'camp',boonId:'BOON_FAKE'}),/invalid_boon_choice/,'unoffered choices must be rejected');
const selected=service.choose({runId:run.id,controllerAccountId:'account',optionNodeId:'camp',boonId:offered[0].id});
assert.equal(selected.currentNodeId,'camp');
assert.equal(selected.chosenRoomBoons?.shrine,offered[0].id,'selected boon must be committed with the next node');
const oldRepository=new MemoryQModeRunRepository();oldRepository.save(run);
const oldClient=new QModeService(oldRepository,secret).choose({runId:run.id,controllerAccountId:'account',optionNodeId:'camp'});
assert.equal(oldClient.chosenRoomBoons?.shrine,offered[0].id,'older supported clients get a deterministic default');
console.log('PASS deterministic, server-validated and backwards-compatible room boon choices');
