import {createCharacter,newGame} from '../src/core/game';
import {COMBAT_COMPANIONS,combatCompanionDef} from '../src/content/combat-companions';
import {companionUnlockRequirementMet,reconcileCombatCompanionUnlocks} from '../src/core/combat-companions';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(`${message}: expected ${String(expected)}, got ${String(actual)}`)}

const regional=COMBAT_COMPANIONS.filter(def=>/^UNIT_0(1[3-9]|2[0-4])$/.test(def.id));
equal(regional.length,12,'regional permanent companion count');
ok(regional.every(def=>def.unlockRequirements.every(req=>req.target!==def.id)),'regional unlocks never target their own companion id');

const masteryTargets=[
  ['UNIT_013','SUNSCAR_SCORPION'],
  ['UNIT_017','FROSTWOLF'],
  ['UNIT_021','BLACKGLASS_MIRELING'],
] as const;
for(const [id,target] of masteryTargets){
  const requirement=combatCompanionDef(id)!.unlockRequirements[0]!;
  equal(requirement.type,'monster_mastery',`${id} uses monster mastery`);
  equal(requirement.target,target,`${id} uses a live regional monster`);
  equal(requirement.amount,20,`${id} requires mastery 20`);
}

const echoTargets=[
  ['UNIT_014','SUNSCAR_ECHOES'],
  ['UNIT_018','FROSTMARCH_ECHOES'],
  ['UNIT_023','ASHLANDS_ECHOES'],
] as const;
for(const [id,target] of echoTargets){
  const requirement=combatCompanionDef(id)!.unlockRequirements[0]!;
  equal(requirement.type,'achievement',`${id} uses regional Echo progress`);
  equal(requirement.target,target,`${id} Echo target`);
  equal(requirement.amount,3,`${id} requires three Echoes`);
}

const dungeonTargets=[
  ['UNIT_015','SUNSCAR_DUNGEONS'],
  ['UNIT_019','FROSTMARCH_DUNGEONS'],
  ['UNIT_022','ASHLANDS_DUNGEONS'],
] as const;
for(const [id,target] of dungeonTargets){
  const requirement=combatCompanionDef(id)!.unlockRequirements[0]!;
  equal(requirement.type,'dungeon_clears',`${id} uses regional dungeon-set progress`);
  equal(requirement.target,target,`${id} dungeon target`);
  equal(requirement.amount,3,`${id} requires the authored three-dungeon set`);
}

const prestigeTargets=[
  ['UNIT_016','CHALLENGE_TYRANTS_HEIR'],
  ['UNIT_020','CHALLENGE_WYRM_ECHO'],
  ['UNIT_024','CHALLENGE_REGENT_SHADE'],
] as const;
for(const [id,target] of prestigeTargets){
  const requirement=combatCompanionDef(id)!.unlockRequirements[0]!;
  equal(requirement.type,'meta',`${id} uses a deterministic Prestige challenge`);
  equal(requirement.target,target,`${id} challenge target`);
  let state=createCharacter(newGame(1),'IRONWARDEN','Regional Tester');
  state={...state,account:{...state.account,companionSpecialClears:[target]}};
  ok(companionUnlockRequirementMet(state,requirement),`${id} recognizes its completed Prestige challenge`);
  state={...state,account:{...state.account,companionSpecialClears:[]}};
  ok(!companionUnlockRequirementMet(state,requirement),`${id} remains locked before challenge completion`);
}

let all=createCharacter(newGame(1),'IRONWARDEN','Regional Tester');
all={...all,
  character:{...all.character!,monsterMasteryPoints:{SUNSCAR_SCORPION:500,FROSTWOLF:500,BLACKGLASS_MIRELING:500}},
  regionalProgressById:{
    REG_002:{storyCompleted:10,echoesCompleted:3,dungeonsCompleted:3},
    REG_003:{storyCompleted:10,echoesCompleted:3,dungeonsCompleted:3},
    REG_004:{storyCompleted:10,echoesCompleted:3,dungeonsCompleted:3},
  },
};
all=reconcileCombatCompanionUnlocks(all,1000);
for(const id of ['UNIT_013','UNIT_014','UNIT_015','UNIT_017','UNIT_018','UNIT_019','UNIT_021','UNIT_022','UNIT_023'])ok(all.account.unlockedCombatCompanionIds?.includes(id),`${id} unlocks through authored regional progression`);
all={...all,account:{...all.account,companionSpecialClears:prestigeTargets.map(([,target])=>target)}};
all=reconcileCombatCompanionUnlocks(all,2000);
for(const id of regional.map(def=>def.id))ok(all.account.unlockedCombatCompanionIds?.includes(id),`${id} unlocks through the complete regional chain`);

console.log('PASS: regional companion mastery, Echo, dungeon and Prestige challenge chains validate');
