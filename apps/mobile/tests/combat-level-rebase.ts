import {assert} from './test-assert';
import {
  characterLevelFromXp,
  characterTotalXpAtLevel,
  classCombatSkillLevelFromXp,
  classCombatSkillTotalXpAtLevel,
  classCombatSkillProgressWithinLevel,
  classCombatSkillXpForNextLevel,
  progressWithinLevel,
  totalXpAtLevel,
  legacyCharacterTotalXpAtLevel,
  rebasedCombatLevelFromLegacyLevel,
  skillXpForNextLevel,
  baseXpForNextLevel,
  rebaseCombatGameState,
  legacyCharacterLevelFromXp,
} from '../src/core/progression';
import {createCharacter,newGame,effectiveStats,regionalReadiness} from '../src/core/game';
import {migrateSave} from '../src/core/save-migrations';
import {WORLD_ZONES} from '../src/content/world-map';
import {MONSTERS} from '../src/content/monsters';
import {QUESTS} from '../src/content/quests';
import {REGIONAL_AREAS} from '../src/content/regional-areas';
import {GATHERING_TOOLS} from '../src/content/gathering-tools';
import {RECIPES} from '../src/content/skills';
import {ITEMS} from '../src/content/items';

// The original level-50 XP bank becomes level 37. The curve is slower than the
// legacy one, while keeping established mid-game characters in a comparable band.
assert.equal(legacyCharacterTotalXpAtLevel(50),4096288,'legacy calibration must be stable');
assert.equal(characterTotalXpAtLevel(37),3936944,'new combat level 37 threshold must be stable');
assert.equal(characterLevelFromXp(legacyCharacterTotalXpAtLevel(50)),37);
assert.equal(rebasedCombatLevelFromLegacyLevel(50),37);
assert.equal(rebasedCombatLevelFromLegacyLevel(32),25,'legacy level 32 should become the intended level 25');
assert.equal(classCombatSkillLevelFromXp(totalXpAtLevel(50)),24,'legacy class combat level 50 should become level 24');
assert.equal(classCombatSkillTotalXpAtLevel(24),818574,'class combat level 24 threshold must be stable');
// A class-skill bar must use the 2.09 curve, not the faster 1.42 profession
// curve: using profession progress used to leave class skills visibly at 100%.
const classLevel24Start=classCombatSkillTotalXpAtLevel(24);
const halfwayClassLevel24Xp=classLevel24Start+Math.floor(classCombatSkillXpForNextLevel(24)/2);
const classLevel24Progress=classCombatSkillProgressWithinLevel(halfwayClassLevel24Xp,24);
assert.equal(classLevel24Progress.current,Math.floor(classCombatSkillXpForNextLevel(24)/2));
assert.equal(classLevel24Progress.need,classCombatSkillXpForNextLevel(24));
assert.ok(classLevel24Progress.current<classLevel24Progress.need,'nonmax class combat skill remains under 100%');
assert.ok(progressWithinLevel(halfwayClassLevel24Xp,24).current>=progressWithinLevel(halfwayClassLevel24Xp,24).need,'profession thresholds would incorrectly max the class skill progress display');
assert.equal(classCombatSkillProgressWithinLevel(classCombatSkillTotalXpAtLevel(25),25).current,0,'class skill bar resets to zero at exact level-up');

for(const [previous,next] of [[60,44],[70,50],[80,57],[90,64],[100,70]] as const){
 assert.equal(rebasedCombatLevelFromLegacyLevel(previous),next,`legacy Combat level ${previous} must rebase across the full 1–100 curve`);
 assert.equal(characterLevelFromXp(legacyCharacterTotalXpAtLevel(previous)),next,'stored Combat XP remains the sole level source');
}
assert.equal(rebasedCombatLevelFromLegacyLevel(30),23);
assert.equal(rebasedCombatLevelFromLegacyLevel(10),8);
assert.equal(rebasedCombatLevelFromLegacyLevel(2),2,'early onboarding retains its first level-up timing');
assert.equal(skillXpForNextLevel(17),Math.floor(baseXpForNextLevel(17)*1.6),'profession XP requirements must remain unchanged');
for(let oldLevel=1;oldLevel<=100;oldLevel++){
  const xp=legacyCharacterTotalXpAtLevel(oldLevel),newLevel=rebasedCombatLevelFromLegacyLevel(oldLevel);
  assert.equal(characterLevelFromXp(xp),newLevel,'new level must always be derived from the unchanged XP bank');
  if(oldLevel>1)assert.ok(newLevel>=rebasedCombatLevelFromLegacyLevel(oldLevel-1),'levels must never regress as XP rises');
}

const old50=legacyCharacterTotalXpAtLevel(50),old30=legacyCharacterTotalXpAtLevel(30);
const fresh=createCharacter(newGame(1000),'IRONWARDEN','Rebase Test');
const active={...fresh.character!,level:50,xp:old50,classSkills:fresh.character!.classSkills!.map(skill=>({...skill,xp:totalXpAtLevel(50),level:50}))};
const parked={character:{...fresh.character!,id:'PARKED_2',level:30,xp:old30},inventory:fresh.inventory,overflow:fresh.overflow,activity:null,skills:fresh.skills,quests:fresh.quests,currentRegionId:'KINGS_ROAD'};
const legacyState={...fresh,character:active,otherCharacters:[parked],currentRegionId:'IRONWOOD'};
const after=rebaseCombatGameState(legacyState);
assert.equal(after.character!.level,37);
assert.equal(after.character!.classSkills!.every(skill=>skill.level===24),true,'class combat skills rebase independently');
assert.equal(after.otherCharacters![0].character.level,23);
assert.equal(after.character!.xp,old50,'active earned XP must not change');
assert.equal(after.otherCharacters![0].character.xp,old30,'parked character XP must not change');
assert.equal(rebaseCombatGameState(after),after,'rebase must be idempotent and return the same state when already normalized');
assert.equal(legacyState.character.level,50,'rebase must not mutate its input');
assert.equal(legacyCharacterLevelFromXp(after.character!.xp),50,'power scaling retains legacy XP reference');
const migrated=migrateSave({...legacyState,version:11});
assert.equal(migrated.character?.level,37,'backup/restore migration must rebase combat level');
assert.equal(migrated.otherCharacters?.[0]?.character.level,23,'backup/restore must rebase parked characters');
assert.equal(migrated.currentRegionId,'IRONWOOD','still-unlocked regions must survive rebasing');
assert.equal(migrated.character?.xp,old50);
assert.equal(effectiveStats(after).power,effectiveStats(legacyState).power,'pure level rebasing must not nerf combat power');
assert.equal(regionalReadiness(after).total,regionalReadiness(legacyState).total,'chapter-one preparation score must remain stable');

for(const quest of QUESTS){
 if(quest.kind==='level')assert.ok(quest.required<=37,'existing Chapter 1 level quests cannot exceed its target band');
 if(quest.requiredCharacterLevel!==undefined)assert.ok(quest.requiredCharacterLevel>=1);
}
assert.equal(QUESTS.find(quest=>quest.id==='QST_005')?.required,8);
assert.equal(QUESTS.find(quest=>quest.id==='QST_011')?.required,16);
assert.equal(MONSTERS.find(monster=>monster.id==='FALLEN_KNIGHT')?.unlockLevel,20);
assert.equal(WORLD_ZONES.find(zone=>zone.id==='KINGS_ROAD')?.minLevel,16);
assert.equal(WORLD_ZONES.find(zone=>zone.id==='SUNSCAR')?.minLevel,20);
assert.equal(REGIONAL_AREAS.find(area=>area.id==='ZONE_011')?.minLevel,34);
for(const requirement of [
 ...WORLD_ZONES.map(zone=>zone.minLevel),
 ...MONSTERS.map(monster=>monster.unlockLevel),
 ...REGIONAL_AREAS.map(area=>area.minLevel),
 ...GATHERING_TOOLS.map(tool=>tool.requiredCharacterLevel),
 ...ITEMS.flatMap(item=>item.requiredLevel===undefined?[]:[item.requiredLevel]),
 ...RECIPES.flatMap(recipe=>recipe.characterLevel===undefined?[]:[recipe.characterLevel]),
]){
 assert.ok(Number.isInteger(requirement)&&requirement>=1&&requirement<=100,'all content levels must stay usable after rebasing');
}
for(let oldLevel=1;oldLevel<=100;oldLevel++){
 const earned=legacyCharacterTotalXpAtLevel(oldLevel),newLevel=characterLevelFromXp(earned);
 assert.ok(newLevel>=rebasedCombatLevelFromLegacyLevel(oldLevel),'reworked unlocks never relock an XP-qualified character at the exact legacy threshold');
}
console.log('PASS: Combat XP rebasing leaves earned XP and all profession thresholds untouched');
