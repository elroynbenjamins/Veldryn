import {strict as assert} from 'node:assert';
import {EXPEDITION_ENCOUNTERS} from '../../combat/content/expedition-encounters';
import {launchPlayer} from '../../combat/content/launch-combat';
import {EXPEDITIONS} from '../../expeditions/content/launch-content';
import {initialPersistentRunState,resolveCoopNode} from '../../expeditions/node-resolution';
import {generateCoopRouteGraph} from '../../expeditions/route-generation';

const prefixes:Record<string,readonly string[]>={EXP_001:['ROOT_'],EXP_002:['LANTERN_'],EXP_003:['SUN_OBS_'],EXP_004:['SUN_MIRAGE_']};
for(const [expeditionId,allowed] of Object.entries(prefixes)){
  assert.equal(EXPEDITIONS[expeditionId].coopImplemented,true);
  for(let seed=0;seed<100;seed++){
    const graph=generateCoopRouteGraph('regional-route',expeditionId,`${expeditionId}-${seed}`,'content-v2','regional-v1');
    assert.equal(graph.preBossNodeCount,5);
    for(const node of graph.nodes.filter(node=>node.kind!=='entry'&&node.kind!=='boss'))assert.ok(allowed.some(prefix=>node.contentId.startsWith(prefix)),`${expeditionId} leaked route content: ${node.contentId}`);
    for(const node of graph.nodes.filter(node=>node.kind==='battle'||node.kind==='elite'||node.kind==='boss'))assert.ok(EXPEDITION_ENCOUNTERS[node.contentId],`${expeditionId} has unresolved combat ${node.contentId}`);
  }
}

for(const expeditionId of ['EXP_005','EXP_006','EXP_007','EXP_008']){
  assert.equal(EXPEDITIONS[expeditionId].coopImplemented,false);
  let failure='';try{generateCoopRouteGraph('regional-route',expeditionId,'future-run','content-v2','regional-v1')}catch(error){failure=error instanceof Error?error.message:String(error)}assert.equal(failure,'expedition_not_implemented');
}

const results:Record<string,{clears:number;samples:number;averageCombatSeconds:number}>={};
for(const expeditionId of ['EXP_003','EXP_004']){
  for(const [partyId,classIds] of Object.entries({restoration:['Ironwarden','Wayfinder','Ravager','Dawnkeeper'],utility:['Ironwarden','Hexweaver','Knife Dancer','Stonecaller']})){
    const party=classIds.map(classId=>launchPlayer(classId,45));let clears=0,durationMs=0;const samples=500;
    for(let seed=0;seed<samples;seed++){
      const runId=`regional-balance-${expeditionId}-${partyId}-${seed}`,secret='regional-balance-v1',graph=generateCoopRouteGraph(secret,expeditionId,runId,'content-v2','regional-v1');
      let state=initialPersistentRunState(party),current=graph.entryNodeId,success=true;
      for(let depth=1;depth<=graph.preBossNodeCount;depth++){
        const currentNode=graph.nodes.find(node=>node.nodeId===current)!;const choices=currentNode.nextNodeIds.map(id=>graph.nodes.find(node=>node.nodeId===id)!);const selected=choices.find(node=>node.kind==='camp')??choices[0];
        const result=resolveCoopNode({runId,serverSecret:secret,node:selected,players:party,state});state=result.state;durationMs+=Number(result.summary.durationMs??0);current=selected.nodeId;if(!result.success){success=false;break;}
      }
      if(success){const boss=graph.nodes.find(node=>node.nodeId===graph.bossNodeId)!;const result=resolveCoopNode({runId,serverSecret:secret,node:boss,players:party,state});durationMs+=Number(result.summary.durationMs??0);success=result.success;}
      clears+=success?1:0;
    }
    const clearRate=clears/samples;assert.ok(clearRate>=.85&&clearRate<=.995,`${expeditionId}/${partyId} Tier I clear rate ${clearRate} outside regional launch band`);
    results[`${expeditionId}_${partyId}`]={clears,samples,averageCombatSeconds:Number((durationMs/samples/1000).toFixed(2))};
  }
}
console.log('coop phase13 regional content OK',JSON.stringify(results));
