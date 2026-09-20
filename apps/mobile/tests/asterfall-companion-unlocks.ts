import {createCharacter,newGame} from '../src/core/game';
import {combatCompanionDef} from '../src/content/combat-companions';
import {companionRequirementProgress} from '../src/core/companion-presentation';
import {companionUnlockRequirementMet,reconcileCombatCompanionUnlocks} from '../src/core/combat-companions';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(`${message}: expected ${String(expected)}, got ${String(actual)}`)}

const expected=[
  ['UNIT_005','monster_mastery','LANTERN_WRETCH',20],
  ['UNIT_008','skill_level','faith',30],
  ['UNIT_009','monster_mastery','ECHO_BAT',20],
  ['UNIT_011','boss_kills','FALLEN_KNIGHT',3],
  ['UNIT_012','event_challenge','CHALLENGE_OATHGLASS_KNIGHTLING',1],
] as const;

for(const [id,type,target,amount] of expected){
  const requirement=combatCompanionDef(id)?.unlockRequirements[0];
  ok(requirement,`${id} has an unlock requirement`);
  equal(requirement!.type,type,`${id} requirement type`);
  equal(requirement!.target,target,`${id} requirement target`);
  equal(requirement!.amount,amount,`${id} requirement amount`);
}

let mastery=createCharacter(newGame(1),'IRONWARDEN','Asterfall Mastery');
mastery={...mastery,character:{...mastery.character!,monsterMasteryPoints:{LANTERN_WRETCH:500,ECHO_BAT:500}}};
mastery=reconcileCombatCompanionUnlocks(mastery,100);
ok(mastery.account.unlockedCombatCompanionIds?.includes('UNIT_005'),'Lantern Wisp unlocks through Lantern Wretch mastery');
ok(mastery.account.unlockedCombatCompanionIds?.includes('UNIT_009'),'Echo Stalker unlocks through Echo Bat mastery');

let faith=createCharacter(newGame(1),'IRONWARDEN','Faith Keeper');
faith={...faith,skills:faith.skills.map(row=>row.skillId==='faith'?{...row,level:30}:row)};
faith=reconcileCombatCompanionUnlocks(faith,100);
ok(faith.account.unlockedCombatCompanionIds?.includes('UNIT_008'),'Dawnwing unlocks through Faith 30');

let knight=createCharacter(newGame(1),'IRONWARDEN','Knight Memory');
knight={...knight,account:{...knight.account,companionBossClears:{FALLEN_KNIGHT:3}}};
knight=reconcileCombatCompanionUnlocks(knight,100);
ok(knight.account.unlockedCombatCompanionIds?.includes('UNIT_011'),"Veyren's Memory unlocks through three Fallen Knight clears");

let special=createCharacter(newGame(1),'IRONWARDEN','Reflection Trial');
const specialReq=combatCompanionDef('UNIT_012')!.unlockRequirements[0];
ok(!companionUnlockRequirementMet(special,specialReq),'Oathglass Knightling stays locked before its special challenge');
let progress=companionRequirementProgress(special,specialReq);
equal(progress.current,0,'special challenge progress starts at zero');
equal(progress.total,1,'special challenge progress has one completion target');
special={...special,account:{...special.account,companionSpecialClears:['CHALLENGE_OATHGLASS_KNIGHTLING']}};
ok(companionUnlockRequirementMet(special,specialReq),'special challenge completion satisfies Oathglass Knightling requirement');
progress=companionRequirementProgress(special,specialReq);
equal(progress.current,1,'special challenge progress displays completion');
special=reconcileCombatCompanionUnlocks(special,100);
ok(special.account.unlockedCombatCompanionIds?.includes('UNIT_012'),'completed special challenge reconciles Oathglass Knightling ownership');

for(const id of ['UNIT_005','UNIT_008','UNIT_009','UNIT_011','UNIT_012']){
  const def=combatCompanionDef(id)!;
  ok(def.unlockRequirements.every(req=>!['LANTERNWATCH_SIEGE','COOP_EFFECTIVE_SUPPORT','POSITIVE_ECHO_OBJECTIVES','FALLEN_PROCESSION_OUTCOMES','ASTERFALL_COOP_SET'].includes(req.target??'')),`${id} has no stale placeholder unlock target`);
}

console.log('PASS: Asterfall companion unlock paths are reachable through live progression');
