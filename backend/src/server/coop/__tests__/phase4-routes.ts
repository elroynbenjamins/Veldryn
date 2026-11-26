import { strict as assert } from 'node:assert';
import { generateCoopRouteGraph, validateCoopRouteGraph } from '../../expeditions/route-generation';

const secret='route-test-secret';
const specialRoomCategory=(kind:string):string|undefined=>
 kind==='shrine'||kind==='forge'||kind==='echo'?'boon':
 kind==='treasure'||kind==='secret'?'artifact':
 kind==='camp'?'campfire':undefined;
let mixedSpecialCategories=0;
for(let seed=0;seed<10_000;seed++){
  const graph=generateCoopRouteGraph(secret,'EXP_001',`run-${seed}`,'content-v1','balance-v1');
  validateCoopRouteGraph(graph);
  assert.equal(graph.preBossNodeCount,5);
  assert.equal(graph.nodes.filter(node=>node.kind==='boss').length,1);
  assert.ok(graph.nodes.every(node=>node.kind!=='event'),'New dungeon routes must not offer resource-only Event Rooms');
  for(let depth=1;depth<=graph.preBossNodeCount;depth++){
   const layer=graph.nodes.filter(node=>node.depth===depth);
   assert.equal(layer.length,3);
   const categories=layer.map(node=>specialRoomCategory(node.kind)).filter(Boolean);
   assert.equal(new Set(categories).size,categories.length,'No duplicate Boon, Artifact or Campfire category in a random room choice layer');
   if(categories.length===2&&new Set(categories).size===2)mixedSpecialCategories++;
  }
  const entryRooms=graph.nodes.filter(node=>node.depth===1);
  const secondRooms=graph.nodes.filter(node=>node.depth===2);
  assert.ok(entryRooms.every(node=>node.kind==='battle'),'Opening room must remain combat');
  assert.equal(secondRooms.filter(node=>node.kind==='battle').length,2,'Second stage retains two meaningful combat choices');
  assert.ok(['treasure','camp','shrine'].includes(String(secondRooms[2].kind)),'Second stage offers a useful alternative');
  assert.equal(new Set(secondRooms.map(node=>node.contentId)).size,3,'Early alternatives must use unique content');
}
// New runs of both modes use the same checkpoint graph, not a pre-entry queue split.
const endurance=generateCoopRouteGraph(secret,'EXP_001','endurance-run','content-v1','balance-v1','endurance');
validateCoopRouteGraph(endurance);
assert.ok(endurance.generatorVersion.endsWith('-endurance-v2')&&endurance.generatorVersion.includes('-unique-special-v1'),'New Endurance runs advertise both checkpoint and distinct-special-room rules');
assert.ok(mixedSpecialCategories>0,'Boon + Artifact and other different special rewards must remain legal alongside Battle');
assert.equal(endurance.preBossNodeCount,42);
assert.equal(endurance.nodes.length,128);
assert.equal(endurance.nodes.filter(node=>node.kind==='boss').length,6,'Five optional checkpoints and one mandatory final boss');
assert.ok(endurance.nodes.every(node=>node.kind!=='event'),'New Endurance runs must exclude Event Rooms');
for(const cleared of [7,14,21,28,35]){
 const options=endurance.nodes.filter(node=>node.depth===cleared+1);
 assert.equal(options.length,3);
 assert.equal(options.filter(node=>node.kind==='boss').length,1);
 assert.equal(options.filter(node=>node.kind!=='boss').length,2);
 assert.deepEqual(options.map(node=>node.kind),['camp','shrine','boss'],'Checkpoint must offer Campfire / Boon / Boss simultaneously');
 assert.deepEqual(options.map(node=>node.modifierId),['checkpoint-camp-v2','checkpoint-boon-v2','checkpoint']);
 assert.ok(options.filter(node=>node.kind!=='boss').every(node=>node.nextNodeIds.length===3),'Continue options lead to another room');
}
assert.deepEqual(generateCoopRouteGraph(secret,'EXP_001','endurance-run','content-v1','balance-v1','endurance'),endurance,'Reconnected runs must retain the checkpoint graph');
const v1SameRun=generateCoopRouteGraph(secret,'EXP_001','endurance-run','content-v1','balance-v1','endurance-v1');
for(let depth=1;depth<=7;depth++){
 const current=endurance.nodes.filter(node=>node.depth===depth);
 const historical=v1SameRun.nodes.filter(node=>node.depth===depth);
 const oldCategories=historical.map(node=>specialRoomCategory(node.kind)).filter(Boolean);
 if(new Set(oldCategories).size===oldCategories.length){
  assert.deepEqual(current,historical,'Non-colliding Endurance rooms retain historical seeded content');
 }else{
  assert.deepEqual(current.slice(0,2),historical.slice(0,2),'A collision only replaces the later conflicting choice');
  assert.notEqual(current[2].kind,historical[2].kind,'Conflicting special room is deterministically re-rolled');
 }
}
const historicalEndurance=generateCoopRouteGraph(secret,'EXP_001','historical-run','content-v1','balance-v1','endurance-v1');
validateCoopRouteGraph(historicalEndurance);
assert.ok(historicalEndurance.generatorVersion.endsWith('-endurance-v1'),'Saved historical Endurance graphs remain supported');
// The stricter validation is versioned; players can resume a saved old graph
// that happened to offer two Boons, without losing their dungeon progress.
const duplicateSpecialGraph=structuredClone(endurance);
duplicateSpecialGraph.nodes=duplicateSpecialGraph.nodes.map(node=>
 node.nodeId==='d4-c1'?{...node,kind:'forge' as const}:
 node.nodeId==='d4-c2'?{...node,kind:'echo' as const}:node);
assert.throws(()=>validateCoopRouteGraph(duplicateSpecialGraph),/duplicate_special_room_choice/,'Fresh graph validation rejects different Boon room kinds offered together');
const historicalDuplicateGraph=structuredClone(duplicateSpecialGraph);
historicalDuplicateGraph.generatorVersion='coop-route-v3-endurance-v2';
validateCoopRouteGraph(historicalDuplicateGraph);
// Exercise a spread of runs: every optional boss must preserve the same frozen
// boss variant, and both continuation rooms must feed into the next layer.
for(let seed=0;seed<40;seed++){
 const graph=generateCoopRouteGraph(secret,'EXP_001',`endurance-seed-${seed}`,'content-v1','balance-v1','endurance');
 validateCoopRouteGraph(graph);
 const finalBoss=graph.nodes.find(node=>node.nodeId===graph.bossNodeId)!;
 for(const cleared of [7,14,21,28,35]){
  const current=graph.nodes.find(node=>node.nodeId===`d${cleared}-c0`)!;
  const choices=current.nextNodeIds.map(id=>graph.nodes.find(node=>node.nodeId===id)!);
  assert.equal(choices.length,3);
  assert.equal(choices.filter(node=>node.kind==='boss').length,1);
  assert.equal(choices.find(node=>node.kind==='boss')?.contentId,finalBoss.contentId,'Continued runs cannot reroll boss identity');
  assert.ok(choices.filter(node=>node.kind!=='boss').every(node=>node.nextNodeIds.length===3));
 }
}

const tampered=structuredClone(endurance);
tampered.nodes=tampered.nodes.map(node=>node.nodeId==='d8-c2'?{...node,kind:'battle' as const}:node);
assert.throws(()=>validateCoopRouteGraph(tampered),/checkpoint|boss|invalid|graph|insufficient_route_choices/i,'Checkpoint boss cannot be bypassed by client graph tampering');
const checkpointTamper=structuredClone(endurance);
checkpointTamper.nodes=checkpointTamper.nodes.map(node=>node.nodeId==='d8-c1'?{...node,kind:'battle' as const}:node);
assert.throws(()=>validateCoopRouteGraph(checkpointTamper),/checkpoint_recovery_boon_choices_invalid/,'Cannot replace mandatory boon route at a v2 checkpoint');
const sameA=generateCoopRouteGraph(secret,'EXP_001','same-run','content-v1','balance-v1');
const sameB=generateCoopRouteGraph(secret,'EXP_001','same-run','content-v1','balance-v1');
assert.deepEqual(sameA,sameB);
const prefixes=new Set(Array.from({length:100},(_,seed)=>JSON.stringify(generateCoopRouteGraph(secret,'EXP_001',`different-${seed}`,'content-v1','balance-v1').nodes.slice(1,4).map(node=>[node.contentId,node.modifierId]))));
assert.ok(prefixes.size>1,'run ID must influence node generation');
const earlyKinds=new Set(Array.from({length:256},(_,seed)=>generateCoopRouteGraph(secret,'EXP_001',`early-variation-${seed}`,'content-v1','balance-v1').nodes.find(node=>node.nodeId==='d2-c2')?.kind));
assert.ok(earlyKinds.size>=3,'Randomized second-room utility must vary across runs');
const legacy=structuredClone(sameA);
const earlyLegacy=legacy.nodes.filter(node=>node.depth===2);
const used=new Set(earlyLegacy.map(node=>node.contentId));
const replacement=['ROOT_SCOUTS','ROOT_GUARDIANS','ROOT_VINES','ROOT_STALKERS','ROOT_SENTINELS'].find(id=>!used.has(id));
if(!replacement)throw new Error('Test fixture should have an unused battle formation');
legacy.nodes=legacy.nodes.map(node=>node.nodeId==='d2-c2'?{...node,kind:'battle' as const,contentId:replacement}:node);
validateCoopRouteGraph(legacy); // Historical three-combat openings must remain resumable.
const savedEventGraph=structuredClone(sameA);
savedEventGraph.nodes=savedEventGraph.nodes.map(node=>node.nodeId==='d2-c2'?{...node,kind:'event' as const,contentId:'ROOT_EVENT_WHISPER',rewardTag:'event'}:node);
validateCoopRouteGraph(savedEventGraph); // Do not invalidate previously saved Event Room choices.

console.log('coop phase4 routes OK',JSON.stringify({seeds:10_000,distinctFirstLayers:prefixes.size,mixedSpecialCategories}));
