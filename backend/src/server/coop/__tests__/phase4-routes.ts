import { strict as assert } from 'node:assert';
import { generateCoopRouteGraph, validateCoopRouteGraph } from '../../expeditions/route-generation';

const secret='route-test-secret';
for(let seed=0;seed<10_000;seed++){
  const graph=generateCoopRouteGraph(secret,'EXP_001',`run-${seed}`,'content-v1','balance-v1');
  validateCoopRouteGraph(graph);
  assert.equal(graph.preBossNodeCount,5);
  assert.equal(graph.nodes.filter(node=>node.kind==='boss').length,1);
  for(let depth=1;depth<=graph.preBossNodeCount;depth++)assert.equal(graph.nodes.filter(node=>node.depth===depth).length,3);
  const entryRooms=graph.nodes.filter(node=>node.depth===1);
  const secondRooms=graph.nodes.filter(node=>node.depth===2);
  assert(entryRooms.every(node=>node.kind==='battle'),'Opening room must remain combat');
  assert.equal(secondRooms.filter(node=>node.kind==='battle').length,2,'Second stage retains two meaningful combat choices');
  assert(['event','treasure','camp','shrine'].includes(String(secondRooms[2].kind)),'Second stage offers a useful alternative');
  assert.equal(new Set(secondRooms.map(node=>node.contentId)).size,3,'Early alternatives must use unique content');
}
const sameA=generateCoopRouteGraph(secret,'EXP_001','same-run','content-v1','balance-v1');
const sameB=generateCoopRouteGraph(secret,'EXP_001','same-run','content-v1','balance-v1');
assert.deepEqual(sameA,sameB);
const prefixes=new Set(Array.from({length:100},(_,seed)=>JSON.stringify(generateCoopRouteGraph(secret,'EXP_001',`different-${seed}`,'content-v1','balance-v1').nodes.slice(1,4).map(node=>[node.contentId,node.modifierId]))));
assert.ok(prefixes.size>1,'run ID must influence node generation');
const earlyKinds=new Set(Array.from({length:256},(_,seed)=>generateCoopRouteGraph(secret,'EXP_001',`early-variation-${seed}`,'content-v1','balance-v1').nodes.find(node=>node.nodeId==='d2-c2')?.kind));
assert(earlyKinds.size>=3,'Randomized second-room utility must vary across runs');
const legacy=structuredClone(sameA);
const earlyLegacy=legacy.nodes.filter(node=>node.depth===2);
const used=new Set(earlyLegacy.map(node=>node.contentId));
const replacement=['ROOT_SCOUTS','ROOT_GUARDIANS','ROOT_VINES','ROOT_STALKERS','ROOT_SENTINELS'].find(id=>!used.has(id));
assert(replacement,'Test fixture should have an unused battle formation');
legacy.nodes=legacy.nodes.map(node=>node.nodeId==='d2-c2'?{...node,kind:'battle' as const,contentId:replacement}:node);
validateCoopRouteGraph(legacy); // Historical three-combat openings must remain resumable.

console.log('coop phase4 routes OK',JSON.stringify({seeds:10_000,distinctFirstLayers:prefixes.size}));
