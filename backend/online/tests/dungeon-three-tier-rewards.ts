import assert from 'node:assert/strict';
import {EXPEDITIONS} from '../../src/server/expeditions/content/launch-content';
import {NEW_DUNGEON_TIERS,newDungeonTierAllowed,highestEligibleCoopTier,coopRequiredLevel,readinessEligibleCoopTier} from '../../src/server/coop/config';
import {regularDungeonEntryError,publishedRegularDungeon} from '../../src/server/coop/dungeon-entry-policy';
import {dungeonRewardPreview} from '../../src/server/coop/dungeon-reward-preview';
import {baseMarks} from '../../src/server/expeditions/rewards';

assert.deepEqual([...NEW_DUNGEON_TIERS],[1,2,3],'New regular runs offer exactly three tiers');
for(const tier of [1,2,3])assert.equal(newDungeonTierAllowed(tier),true);
for(const tier of [0,4,5,-1,1.5,'2'])assert.equal(newDungeonTierAllowed(tier),false);
assert.equal(highestEligibleCoopTier(EXPEDITIONS.EXP_004.minLevel,100),3,'High-level characters cannot queue Tier 4/5 again');
assert.equal(readinessEligibleCoopTier(EXPEDITIONS.EXP_004.minLevel,100,2),3,'Quick Match cannot select an obsolete tier');
assert.equal(highestEligibleCoopTier(EXPEDITIONS.EXP_004.minLevel,24),undefined,'Tier 1 is unavailable before current level 25');
assert.equal(coopRequiredLevel(EXPEDITIONS.EXP_004.minLevel,4)>0,true,'Legacy Tier 4 runs can still be resolved');
assert.equal(regularDungeonEntryError(EXPEDITIONS.EXP_004,{defeatedBossIds:[]},25),'chapter_one_required');
assert.equal(regularDungeonEntryError(EXPEDITIONS.EXP_004,{defeatedBossIds:['FALLEN_KNIGHT']},25),undefined);
assert.equal(publishedRegularDungeon(EXPEDITIONS.EXP_001),false,'Old Asterfall content is retained but unlisted');
for(const def of Object.values(EXPEDITIONS).filter(publishedRegularDungeon)){
 const preview=dungeonRewardPreview(def.id);
 assert.deepEqual(preview.guaranteedOnClear,['Expedition Marks']);
 assert.deepEqual(preview.potentialDrops,[],'No unimplemented EXP item chance may be advertised for '+def.id);
 assert.match(preview.dropNotice,/No verified item-drop rates/);
 for(const tier of NEW_DUNGEON_TIERS)assert(baseMarks(def.baseMarks,tier)>0);
}
const actualSettled=dungeonRewardPreview('COP_005');
assert.deepEqual(actualSettled.potentialDrops.map(drop=>drop.chancePercent),[18,8,15],'Published COP rates are 18/8/15');
assert.equal(actualSettled.potentialDrops[0]?.pityAt,8,'Gem source has eight-clear pity');
assert.deepEqual(dungeonRewardPreview('EXP_004').potentialDrops,[],'Mirage Well EXP ID is NOT its COP boss settlement ID');
console.log('PASS new dungeon tier gate, legacy reward compatibility and verified-only drop preview');
