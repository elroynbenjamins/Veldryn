import { strict as assert } from 'node:assert';
import { generateCoopRouteGraph, validateCoopRouteGraph } from '../../expeditions/route-generation';

const secret='route-test-secret';
for(let seed=0;seed<10_000;seed++){
  const graph=generateCoopRouteGraph(secret,'EXP_001',`run-${seed}`,'content-v1','balance-v1');
  validateCoopRouteGraph(graph);
  assert.equal(graph.preBossNodeCount,5);
  assert.equal(graph.nodes.filter(node=>node.kind==='boss').length,1);
  for(let depth=1;depth<=graph.preBossNodeCount;depth++)assert.equal(graph.nodes.filter(node=>node.depth===depth).length,3);
}
const sameA=generateCoopRouteGraph(secret,'EXP_001','same-run','content-v1','balance-v1');
const sameB=generateCoopRouteGraph(secret,'EXP_001','same-run','content-v1','balance-v1');
assert.deepEqual(sameA,sameB);
const prefixes=new Set(Array.from({length:100},(_,seed)=>JSON.stringify(generateCoopRouteGraph(secret,'EXP_001',`different-${seed}`,'content-v1','balance-v1').nodes.slice(1,4).map(node=>[node.contentId,node.modifierId]))));
assert.ok(prefixes.size>1,'run ID must influence node generation');
console.log('coop phase4 routes OK',JSON.stringify({seeds:10_000,distinctFirstLayers:prefixes.size}));
