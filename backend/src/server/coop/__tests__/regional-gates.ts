import { strict as assert } from 'node:assert';
import { launchPlayer } from '../../combat/content/launch-combat';
import { EXPEDITIONS } from '../../expeditions/content/launch-content';
import { generateCoopRouteGraph } from '../../expeditions/route-generation';
import { initialPersistentRunState, resolveCoopNode } from '../../expeditions/node-resolution';

const cases=[['EXP_005',70],['EXP_006',70],['EXP_007',94],['EXP_008',94]] as const;
const results:Record<string,number>={};
for(const [expeditionId,level] of cases){
 assert.equal(EXPEDITIONS[expeditionId].coopImplemented,true);
 const party=['Ironwarden','Wayfinder','Ravager','Dawnkeeper'].map(classId=>launchPlayer(classId,level));let clears=0;
 for(let seed=0;seed<100;seed++){
  const runId=`regional-gate-${expeditionId}-${seed}`,secret='regional-gate-v1',graph=generateCoopRouteGraph(secret,expeditionId,runId,'content-v3','regional-v2');let state=initialPersistentRunState(party),current=graph.entryNodeId,success=true;
  for(let depth=1;depth<=graph.preBossNodeCount;depth++){const currentNode=graph.nodes.find(node=>node.nodeId===current)!;const choices=currentNode.nextNodeIds.map(id=>graph.nodes.find(node=>node.nodeId===id)!);const selected=choices.find(node=>node.kind==='camp')??choices.find(node=>node.kind==='battle')??choices[0];const result=resolveCoopNode({runId,serverSecret:secret,node:selected,players:party,state});state=result.state;current=selected.nodeId;if(!result.success){success=false;break;}}
  if(success){const boss=graph.nodes.find(node=>node.nodeId===graph.bossNodeId)!;success=resolveCoopNode({runId,serverSecret:secret,node:boss,players:party,state}).success;}
  if(success)clears++;
 }
 results[expeditionId]=clears;assert.ok(clears>=75,`${expeditionId} clear rate ${clears}% below regional gate`);
}
console.log('regional gate tests passed',JSON.stringify(results));
