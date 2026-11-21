import { strict as assert } from 'node:assert';
import { launchPlayer } from '../../combat/content/launch-combat';
import { generateCoopRouteGraph } from '../../expeditions/route-generation';
import { initialPersistentRunState, resolveCoopNode } from '../../expeditions/node-resolution';

const runId='stateful-rootbound-1'; const secret='stateful-secret';
const graph=generateCoopRouteGraph(secret,'EXP_001',runId,'content-v1','balance-v1');
const players=['Ironwarden','Wayfinder','Ravager','Stonecaller'].map(classId=>launchPlayer(classId,25));
let state=initialPersistentRunState(players); let current='entry';
for(let depth=1;depth<=graph.preBossNodeCount;depth++){
 const node=graph.nodes.find(item=>item.nodeId===current)!;
 const options=node.nextNodeIds.map(id=>graph.nodes.find(item=>item.nodeId===id)!);
 const selected=options.find(option=>option.kind==='camp')??options[0];
 const beforeHp=Object.values(state.actors).reduce((sum,actor)=>sum+actor.hp,0);
 const result=resolveCoopNode({runId,serverSecret:secret,node:selected,players,state});
 assert.equal(result.success,true,`node failed: ${selected.nodeId}`); state=result.state;
 if(selected.kind==='camp')assert.ok(Object.values(state.actors).reduce((sum,actor)=>sum+actor.hp,0)>=beforeHp);
 current=selected.nodeId;
}
const boss=graph.nodes.find(node=>node.nodeId==='boss')!;
const bossResult=resolveCoopNode({runId,serverSecret:secret,node:boss,players,state});
assert.equal(bossResult.success,true);
assert.equal(bossResult.state.visitedNodeIds.length,graph.preBossNodeCount+1);
assert.equal(new Set(bossResult.state.visitedNodeIds).size,bossResult.state.visitedNodeIds.length);
assert.ok(Object.values(bossResult.state.actors).some(actor=>actor.hp<players.find(player=>bossResult.state.actors[player.id]===actor)!.stats.maxHp),'damage must carry between rooms');
let duplicate='';try{resolveCoopNode({runId,serverSecret:secret,node:boss,players,state:bossResult.state});}catch(error){duplicate=error instanceof Error?error.message:String(error);}
assert.equal(duplicate,'node_already_resolved');

const checkpointGraph=generateCoopRouteGraph(secret,'EXP_001','checkpoint-healing-test','content-v1','balance-v1','endurance');
const checkpointCamp=checkpointGraph.nodes.find(node=>node.nodeId==='d8-c0')!;
assert.equal(checkpointCamp.kind,'camp');
const wounded=initialPersistentRunState(players);
const hurt=players[0],fallen=players[1];
wounded.actors[hurt.id]={...wounded.actors[hurt.id],hp:hurt.stats.maxHp*.10};
wounded.actors[fallen.id]={...wounded.actors[fallen.id],hp:0,downed:true};
const newCamp=resolveCoopNode({runId:'checkpoint-healing-v2',serverSecret:secret,node:checkpointCamp,players,state:wounded,campfireBalanceVersion:2});
const oldCamp=resolveCoopNode({runId:'checkpoint-healing-v1',serverSecret:secret,node:checkpointCamp,players,state:wounded});
const close=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<1e-6,`Expected ${expected}, got ${actual}`);
close(newCamp.state.actors[hurt.id].hp,hurt.stats.maxHp*.30);
close(newCamp.state.actors[fallen.id].hp,fallen.stats.maxHp*.15);
assert.equal(newCamp.state.actors[fallen.id].downed,false);
close(oldCamp.state.actors[hurt.id].hp,hurt.stats.maxHp*.40);
close(oldCamp.state.actors[fallen.id].hp,fallen.stats.maxHp*.25);

console.log('coop phase5 stateful run OK',JSON.stringify({preBoss:graph.preBossNodeCount,visited:bossResult.state.visitedNodeIds.length}));
