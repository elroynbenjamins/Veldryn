import assert from 'node:assert/strict';
import {EXPEDITIONS} from '../../src/server/expeditions/content/launch-content';
import {DUNGEON_UNLOCK_LEVEL,defeatedDungeonChapterBoss,listedRegularDungeon,publishedRegularDungeon,regularDungeonEntryError,regularDungeonLockedReason,regularDungeonTierRequiredLevel,regularDungeonTierRequiredPower,highestEligibleRegularDungeonTier,regularDungeonReadyTier} from '../../src/server/coop/dungeon-entry-policy';

const before={defeatedBossIds:[]},cleared={defeatedBossIds:['FALLEN_KNIGHT']};
assert.equal(DUNGEON_UNLOCK_LEVEL,10);
assert.equal(EXPEDITIONS.EXP_001.minLevel,10,'Asterfall catalogue matches level-10 gate');
assert.equal(EXPEDITIONS.EXP_001.recommendedLevel,15,'Asterfall recommendation reflects early progression');
assert.deepEqual(Object.values(EXPEDITIONS).filter(publishedRegularDungeon).map(def=>def.id),['EXP_001','EXP_003']);
assert.deepEqual(Object.values(EXPEDITIONS).filter(listedRegularDungeon).map(def=>def.id),['EXP_001','EXP_003','EXP_005','EXP_007']);
for(const id of ['EXP_002','EXP_004','EXP_005','EXP_006','EXP_007','EXP_008'])assert.equal(regularDungeonEntryError(EXPEDITIONS[id],cleared,100,100_000),'dungeon_unavailable');
for(const [id,level,powers] of [['EXP_001',10,[2500,3750,5000]],['EXP_003',25,[6000,7250,8500]]] as const){
 const def=EXPEDITIONS[id];
 assert.deepEqual(([1,2,3] as const).map(tier=>regularDungeonTierRequiredLevel(def,tier)),[level,level,level]);
 assert.deepEqual(([1,2,3] as const).map(tier=>regularDungeonTierRequiredPower(def,tier)),powers);
 assert.equal(regularDungeonEntryError(def,cleared,level-1,powers[2]),'dungeon_level_requirement');
 assert.equal(regularDungeonEntryError(def,cleared,level,powers[0]-1),'dungeon_power_requirement');
 for(const tier of [1,2,3] as const){
  assert.equal(regularDungeonEntryError(def,cleared,level,powers[tier-1],tier),undefined);
  assert.equal(regularDungeonEntryError(def,cleared,level,powers[tier-1]-1,tier),'dungeon_power_requirement');
  assert.equal(highestEligibleRegularDungeonTier(def,level,powers[tier-1]),tier);
  assert.equal(regularDungeonReadyTier(def,level,1,powers[tier-1]),tier);
 }
 assert.equal(regularDungeonReadyTier(def,level,.5,powers[2]),undefined,'role readiness remains separate');
}
assert.equal(defeatedDungeonChapterBoss(before),false);
assert.equal(regularDungeonEntryError(EXPEDITIONS.EXP_001,before,10,2500),undefined,'Asterfall is playable before the chapter boss');
assert.equal(regularDungeonEntryError(EXPEDITIONS.EXP_003,before,25,6000),'chapter_one_required','Sunscar remains story-gated');
assert.equal(regularDungeonLockedReason(EXPEDITIONS.EXP_001,before,10,2499),'Requires 2,500 Combat Power');
assert.equal(regularDungeonLockedReason(EXPEDITIONS.EXP_003,before,25,6000),'Defeat the Fallen Knight (Chapter I) to unlock Sunscar dungeons.');
assert.equal(regularDungeonLockedReason(EXPEDITIONS.EXP_005,cleared,100,100_000),'In Development');
assert.equal(regularDungeonLockedReason(EXPEDITIONS.EXP_007,cleared,100,100_000),'In Development');
console.log('PASS: regional Combat Power gates, tier boundaries, early Asterfall and chapter-locked Sunscar');
