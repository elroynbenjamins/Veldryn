import {strict as assert} from 'node:assert';
import {EXPEDITIONS} from '../../expeditions/content/launch-content';
import {generateCoopRouteGraph,generateRoute} from '../../expeditions/route-generation';
import {COOP_ROGUELITE_CONFIG} from '../config';

assert.equal(COOP_ROGUELITE_CONFIG.routeGeneratorVersion,'coop-route-v3');
let checked=0;
for(const [id,definition] of Object.entries(EXPEDITIONS)){
 if(!definition.coopImplemented)continue;
 for(const seed of ['fight-1','fight-2','fight-3']){
  const graph=generateCoopRouteGraph(seed,id,seed,'v3','v3');
  assert.ok(graph.nodes.every(n=>n.kind!=='merchant'),'New dungeon rooms must not include merchants');
  assert.ok(graph.nodes.some(n=>n.kind==='battle'),'Each dungeon offers ordinary battles');
  checked++;
 }
 assert.ok(generateRoute('legacy-no-merchant',id,'legacy-no-merchant').every(n=>n.type!=='merchant'));
}
assert.ok(checked>0);
console.log('dungeon route merchant exclusion OK',checked);
