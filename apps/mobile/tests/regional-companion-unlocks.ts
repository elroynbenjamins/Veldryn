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
  const req=combatCompanionDef(id)!.unlockRequirements[0]!;
  equal(req.type,'monster_mastery',`${id} uses signature monster mastery`);
  equal(req.target,target,`${id} uses live signature monster`);
  equal(req.amount,20,`${id} requires mastery 20`);
}

const assignmentTargets=[
  ['UNIT_014','COMPANION_MISSIONS:REG_SUNSCAR',4],
  ['UNIT_015','COMPANION_S_GRADE:REG_SUNSCAR',2],
  ['UNIT_019','COMPANION_MISSIONS:REG_FROSTMARCH',5],
  ['UNIT_023','COMPANION_S_GRADE:REG_ASHLANDS',2],
] as const;
for(const [id,target,amount] of assignmentTargets){
  const req=combatCompanionDef(id)!.unlockRequirements[0]!;
  equal(req.type,'achievement',`${id} uses Sanctuary achievement progression`);
  equal(req.target,target,`${id} Sanctuary target`);
  equal(req.amount,amount,`${id} Sanctuary threshold`);
}

const bondTargets=[
  ['UNIT_018','COMPANION_BOND:UNIT_017',5],
  ['UNIT_022','COMPANION_BOND:UNIT_021',6],
] as const;
for(const [id,target,amount] of bondTargets){
  const req=combatCompanionDef(id)!.unlockRequirements[0]!;
  equal(req.type,'meta',`${id} uses companion Bond progression`);
  equal(req.target,target,`${id} Bond target`);
  equal(req.amount,amount,`${id} Bond threshold`);
}

const prestigeTargets=[
  ['UNIT_016','CHALLENGE_TYRANTS_HEIR'],
  ['UNIT_020','CHALLENGE_WYRM_ECHO'],
  ['UNIT_024','CHALLENGE_REGENT_SHADE'],
] as const;
for(const [id,target] of prestigeTargets){
  const requirement=combatCompanionDef(id)!.unlockRequirements[0]!;
  equal(requirement.type,'event_challenge',`${id} uses deterministic special challenge`);
  equal(requirement.target,target,`${id} challenge target`);
}

let all=createCharacter(newGame(1),'IRONWARDEN','Regional Tester');
all={...all,
  character:{...all.character!,monsterMasteryPoints:{SUNSCAR_SCORPION:500,FROSTWOLF:500,BLACKGLASS_MIRELING:500}},
  account:{...all.account,
    unlockedCombatCompanionIds:['UNIT_017','UNIT_021'],
    combatCompanionProgress:{
      UNIT_017:{level:10,xp:0,ascensionTier:0,bondLevel:5,bondXp:580,bondTraitUnlocked:false,obtainedAtMs:1},
      UNIT_021:{level:10,xp:0,ascensionTier:0,bondLevel:6,bondXp:840,bondTraitUnlocked:false,obtainedAtMs:1},
    },
    companionUnlockProgress:{
      'COMPANION_MISSIONS:REG_SUNSCAR':4,
      'COMPANION_S_GRADE:REG_SUNSCAR':2,
      'COMPANION_MISSIONS:REG_FROSTMARCH':5,
      'COMPANION_S_GRADE:REG_ASHLANDS':2,
    },
  },
};
for(const [id] of assignmentTargets)ok(companionUnlockRequirementMet(all,combatCompanionDef(id)!.unlockRequirements[0]!),`${id} Sanctuary requirement is reachable`);
for(const [id] of bondTargets)ok(companionUnlockRequirementMet(all,combatCompanionDef(id)!.unlockRequirements[0]!),`${id} Bond requirement is reachable`);
all=reconcileCombatCompanionUnlocks(all,1000);
for(const id of ['UNIT_013','UNIT_014','UNIT_015','UNIT_017','UNIT_018','UNIT_019','UNIT_021','UNIT_022','UNIT_023'])ok(all.account.unlockedCombatCompanionIds?.includes(id),`${id} unlocks through its authored regional route`);
for(const [id] of prestigeTargets)ok(!all.account.unlockedCombatCompanionIds?.includes(id),`${id} remains reserved for its special challenge`);

console.log('PASS: varied regional companion acquisition and Prestige challenge chains validate');
