import {assert} from './test-assert';
import {companionFoodNeededForStamina,companionFoodStamina,COMPANION_EXPEDITION_STAMINA} from '../src/core/companion-provisions';
import {COMPANION_HOUSING_MILESTONES,COMPANION_HOUSING_UPGRADES,COMPANION_HOUSING_UNLIMITED,companionHousingLevelCap,companionHousingTier} from '../src/core/companion-housing';

assert.equal(COMPANION_EXPEDITION_STAMINA,100);
assert.equal(companionFoodStamina('COOKED_SILVERFIN'),3);
assert.equal(companionFoodNeededForStamina('COOKED_SILVERFIN'),34);
assert.equal(companionFoodNeededForStamina('ASHLANDS_EMBER_STEW'),3);
assert.equal(COMPANION_HOUSING_UNLIMITED,true);assert.equal(companionHousingTier('ANY_OWNED_COMPANION'),0);assert.deepEqual(COMPANION_HOUSING_MILESTONES.map(x=>x.levelCap),[10,20,25,35]);
assert.equal(companionHousingLevelCap(0),10);assert.equal(companionHousingLevelCap(3),35);
for(const upgrade of COMPANION_HOUSING_UPGRADES){assert.ok(upgrade.gold>0&&upgrade.inputs.length>=3);}
console.log('PASS companion stamina and housing progression economy');
