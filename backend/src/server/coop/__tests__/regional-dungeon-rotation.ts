import {strict as assert} from 'node:assert';
import {EXPEDITIONS} from '../../expeditions/content/launch-content';
import {COOP_ROUTE_CONTENT} from '../../expeditions/content/coop-route-content';
import {dungeonBossVariantsFor} from '../../expeditions/content/dungeon-boss-rotation';
import {generateCoopRouteGraph} from '../../expeditions/route-generation';
import {listedRegularDungeon,publishedRegularDungeon,regularDungeonTierRequiredLevel} from '../dungeon-entry-policy';

const regions=[
 {canonical:'EXP_001',retired:'EXP_002',prefix:'LANTERN_',region:'Asterfall'},
 {canonical:'EXP_003',retired:'EXP_004',prefix:'SUN_MIRAGE_',region:'Sunscar'},
 {canonical:'EXP_005',retired:'EXP_006',prefix:'FROST_CHOIR_',region:'Frostmarch'},
 {canonical:'EXP_007',retired:'EXP_008',prefix:'ASH_CRUCIBLE_',region:'Ashlands'},
] as const;

assert.deepEqual(Object.values(EXPEDITIONS).filter(publishedRegularDungeon).map(d=>d.id),['EXP_001','EXP_003']);
assert.deepEqual(Object.values(EXPEDITIONS).filter(listedRegularDungeon).map(d=>d.id),['EXP_001','EXP_003','EXP_005','EXP_007']);
assert.deepEqual(([1,2,3] as const).map(t=>regularDungeonTierRequiredLevel(EXPEDITIONS.EXP_001,t)),[10,10,10]);

for(const {canonical,retired,prefix,region} of regions){
 assert.equal(EXPEDITIONS[canonical].region,region);
 assert.equal(EXPEDITIONS[retired].region,region);
 assert.equal(listedRegularDungeon(EXPEDITIONS[retired]),false,'Retired dungeons must remain hidden from new queues');
 assert.equal(publishedRegularDungeon(EXPEDITIONS[retired]),false,'Retired dungeons must never become enterable');

 const bosses=dungeonBossVariantsFor(canonical);
 assert.equal(bosses.length,2,canonical+' must have both original regional final bosses');
 assert.deepEqual(bosses.map(b=>b.bossId),[EXPEDITIONS[canonical].bossId,EXPEDITIONS[retired].bossId],'Retired boss must be retained by canonical dungeon');
 assert.equal(dungeonBossVariantsFor(retired).length,0,'Retired dungeon must not have a new public rotation');
 assert.ok(COOP_ROUTE_CONTENT[canonical].battle.some(id=>id.startsWith(prefix)),'Retired encounters merge into canonical regular dungeon');
 assert.ok(COOP_ROUTE_CONTENT[canonical].elite.some(id=>id.startsWith(prefix)),'Retired elite encounters merge into canonical regular dungeon');

 // Ashlands remains explicitly unimplemented and cannot generate new routes.
 // Frostmarch is still development-only; generating routes here is a content test, not an unlock.
 if(!EXPEDITIONS[canonical].coopImplemented){
  assert.equal(canonical,'EXP_007');
  continue;
 }
 const counts=new Map(bosses.map(boss=>[boss.bossId,0]));
 for(let i=0;i<400;i++){
  const args=['regional-secret',canonical,canonical+'-'+i,'content-v3','balance-v3'] as const;
  const graph=generateCoopRouteGraph(...args);
  assert.deepEqual(generateCoopRouteGraph(...args),graph,'Frozen boss must never reroll');
  const id=graph.nodes.find(node=>node.kind==='boss')?.contentId??'';
  assert.ok(counts.has(id),'Unexpected final boss '+id);
  counts.set(id,(counts.get(id)??0)+1);
 }
 for(const n of counts.values())assert.ok(n>=160&&n<=240,canonical+' must have an approximately 50/50 boss distribution: '+n);
 if(EXPEDITIONS[retired].coopImplemented){
  assert.equal(generateCoopRouteGraph('regional-secret',retired,'legacy-run','content-v3','balance-v3').nodes.find(node=>node.kind==='boss')?.contentId,EXPEDITIONS[retired].bossId,'Historical retired runs must keep their original boss');
 }
}
console.log('regional dungeon rotation and retirement tests passed');
