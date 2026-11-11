import assert from 'node:assert/strict';
import {EXPEDITIONS} from '../../src/server/expeditions/content/launch-content';
import {rebaseLegacyCombatLevel} from '../../src/server/coop/config';
import {DUNGEON_UNLOCK_LEVEL,defeatedDungeonChapterBoss,listedRegularDungeon,publishedRegularDungeon,regularDungeonEntryError,regularDungeonLockedReason,regularDungeonTierRequiredLevel} from '../../src/server/coop/dungeon-entry-policy';

const before={defeatedBossIds:[]};
const cleared={defeatedBossIds:['FALLEN_KNIGHT']};
assert.equal(DUNGEON_UNLOCK_LEVEL,25);
assert.deepEqual(Object.values(EXPEDITIONS).filter(publishedRegularDungeon).map(def=>def.id),['EXP_001','EXP_003']);
assert.deepEqual(Object.values(EXPEDITIONS).filter(listedRegularDungeon).map(def=>def.id),['EXP_001','EXP_003','EXP_005']);
for(const id of ['EXP_002','EXP_004','EXP_005','EXP_006','EXP_007','EXP_008']){
 assert.equal(regularDungeonEntryError(EXPEDITIONS[id],cleared,100),'dungeon_unavailable','Retired or development IDs must be closed to fresh runs');
}
assert.deepEqual(([1,2,3] as const).map(t=>regularDungeonTierRequiredLevel(EXPEDITIONS.EXP_001,t)),[25,30,35]);
assert.equal(regularDungeonEntryError(EXPEDITIONS.EXP_001,cleared,24),'dungeon_level_requirement','Level 24 cannot enter Asterfall');
assert.equal(regularDungeonLockedReason(EXPEDITIONS.EXP_001,cleared,24),'Requires level 25');
assert.equal(defeatedDungeonChapterBoss(before),false,'Chapter I clear is character-specific');
assert.equal(regularDungeonEntryError(EXPEDITIONS.EXP_001,before,25),'chapter_one_required');
assert.equal(regularDungeonLockedReason(EXPEDITIONS.EXP_001,before,25),'Defeat the Fallen Knight (Chapter I) to unlock regional dungeons.');
assert.equal(regularDungeonEntryError(EXPEDITIONS.EXP_001,cleared,25),undefined);
assert.equal(regularDungeonEntryError(EXPEDITIONS.EXP_003,cleared,25),'dungeon_level_requirement','Sunscar preserves its regional entry curve');
assert.equal(regularDungeonEntryError(EXPEDITIONS.EXP_003,cleared,rebaseLegacyCombatLevel(EXPEDITIONS.EXP_003.minLevel)),undefined);
assert.equal(regularDungeonEntryError(EXPEDITIONS.EXP_003,before,100),'chapter_one_required');
assert.equal(regularDungeonLockedReason(EXPEDITIONS.EXP_005,cleared,100),'In Development');
assert.equal(regularDungeonLockedReason(EXPEDITIONS.EXP_007,cleared,100),'In Development');
assert.equal(regularDungeonEntryError(EXPEDITIONS.EXP_001,{defeatedBossIds:['OTHER_BOSS']},100),'chapter_one_required');
assert.equal(regularDungeonEntryError(EXPEDITIONS.EXP_001,null,100),'chapter_one_required');
console.log('PASS: one dungeon per region, Asterfall reopens, Frostmarch preview, chapter gate, legacy IDs retired');
