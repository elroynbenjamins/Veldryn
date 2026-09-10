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
console.log('coop phase5 stateful run OK',JSON.stringify({preBoss:graph.preBossNodeCount,visited:bossResult.state.visitedNodeIds.length}));
