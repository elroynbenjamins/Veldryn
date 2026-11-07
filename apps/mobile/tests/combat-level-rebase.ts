import {assert} from './test-assert';
import {
  characterLevelFromXp,
  characterTotalXpAtLevel,
  legacyCharacterTotalXpAtLevel,
  rebasedCombatLevelFromLegacyLevel,
  skillXpForNextLevel,
  baseXpForNextLevel,
} from '../src/core/progression';

// The original level-50 XP bank becomes the start of level 24, within 0.1% of its threshold.
assert.equal(legacyCharacterTotalXpAtLevel(50),4096288,'legacy calibration must be stable');
assert.equal(characterTotalXpAtLevel(24),4092920,'new combat level 24 threshold must be stable');
assert.equal(characterLevelFromXp(legacyCharacterTotalXpAtLevel(50)),24);
assert.equal(rebasedCombatLevelFromLegacyLevel(50),24);
assert.equal(rebasedCombatLevelFromLegacyLevel(30),16);
assert.equal(rebasedCombatLevelFromLegacyLevel(10),7);
assert.equal(rebasedCombatLevelFromLegacyLevel(2),2,'early onboarding retains its first level-up timing');
assert.equal(skillXpForNextLevel(17),Math.floor(baseXpForNextLevel(17)*1.6),'profession XP requirements must remain unchanged');
for(let oldLevel=1;oldLevel<=100;oldLevel++){
  const xp=legacyCharacterTotalXpAtLevel(oldLevel),newLevel=rebasedCombatLevelFromLegacyLevel(oldLevel);
  assert.equal(characterLevelFromXp(xp),newLevel,'new level must always be derived from the unchanged XP bank');
  if(oldLevel>1)assert.ok(newLevel>=rebasedCombatLevelFromLegacyLevel(oldLevel-1),'levels must never regress as XP rises');
}
console.log('PASS: Combat XP rebasing leaves earned XP and all profession thresholds untouched');
