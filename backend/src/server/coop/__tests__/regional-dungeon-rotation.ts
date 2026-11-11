import {strict as assert} from 'node:assert';
import {EXPEDITIONS} from '../../expeditions/content/launch-content';
import {COOP_ROUTE_CONTENT} from '../../expeditions/content/coop-route-content';
import {dungeonBossVariantsFor} from '../../expeditions/content/dungeon-boss-rotation';
import {generateCoopRouteGraph} from '../../expeditions/route-generation';
import {listedRegularDungeon,publishedRegularDungeon,regularDungeonTierRequiredLevel} from '../dungeon-entry-policy';

assert.deepEqual(Object.values(EXPEDITIONS).filter(publishedRegularDungeon).map(d=>d.id),['EXP_001','EXP_003']);
assert.deepEqual(Object.values(EXPEDITIONS).filter(listedRegularDungeon).map(d=>d.id),['EXP_001','EXP_003','EXP_005']);
assert.deepEqual(([1,2,3] as const).map(t=>regularDungeonTierRequiredLevel(EXPEDITIONS.EXP_001,t)),[10,10,10]);
for(const id of ['EXP_002','EXP_004','EXP_005','EXP_006'])assert.equal(publishedRegularDungeon(EXPEDITIONS[id]),false);
for(const [canonical,legacy,retiredPrefix] of [['EXP_001','EXP_002','LANTERN_'],['EXP_003','EXP_004','SUN_MIRAGE_']] as const){
 const bosses=dungeonBossVariantsFor(canonical);assert.equal(bosses.length,2);
 const counts=new Map(bosses.map(boss=>[boss.bossId,0]));
 assert.ok(COOP_ROUTE_CONTENT[canonical].battle.some(id=>id.startsWith(retiredPrefix)),'merged retired encounters');
 for(let i=0;i<400;i++){
  const args=['regional-secret',canonical,canonical+'-'+i,'content-v3','balance-v3'] as const;
  const graph=generateCoopRouteGraph(...args);
  assert.deepEqual(generateCoopRouteGraph(...args),graph,'same frozen boss on retry');
  const id=graph.nodes.find(node=>node.kind==='boss')?.contentId??'';
  assert.ok(counts.has(id),'unknown boss '+id);
  counts.set(id,(counts.get(id)??0)+1);
 }
 for(const n of counts.values())assert.ok(n>=160&&n<=240,canonical+' has non-50/50 distribution: '+n);
 assert.equal(generateCoopRouteGraph('regional-secret',legacy,'legacy-run','content-v3','balance-v3').nodes.find(node=>node.kind==='boss')?.contentId,EXPEDITIONS[legacy].bossId);
}
console.log('regional dungeon rotation tests passed');
