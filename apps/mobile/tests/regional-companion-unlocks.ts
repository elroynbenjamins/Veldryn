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
  ['UNIT_014','DUNE_ORACLE'],
  ['UNIT_015','GLASSBOUND_SENTINEL'],
  ['UNIT_017','FROSTWOLF'],
  ['UNIT_018','BELLWRAITH'],
  ['UNIT_019','CHOIR_HUNTER'],
  ['UNIT_021','BLACKGLASS_MIRELING'],
  ['UNIT_022','CINDER_TITAN'],
  ['UNIT_023','ASHEN_REVENANT'],
] as const;

for(const [id,target] of masteryTargets){
  const def=combatCompanionDef(id)!;
  equal(def.unlockRequirements[0]?.type,'monster_mastery',`${id} uses monster mastery`);
  equal(def.unlockRequirements[0]?.target,target,`${id} uses live monster target`);
  equal(def.unlockRequirements[0]?.amount,20,`${id} requires mastery 20`);
}

const prestigeTargets=[
  ['UNIT_016','CHALLENGE_TYRANTS_HEIR',['UNIT_013','UNIT_014','UNIT_015']],
  ['UNIT_020','CHALLENGE_WYRM_ECHO',['UNIT_017','UNIT_018','UNIT_019']],
  ['UNIT_024','CHALLENGE_REGENT_SHADE',['UNIT_021','UNIT_022','UNIT_023']],
] as const;

for(const [id,target,owned] of prestigeTargets){
  const def=combatCompanionDef(id)!;
  const requirement=def.unlockRequirements[0]!;
  equal(requirement.type,'event_challenge',`${id} uses deterministic special challenge`);
  equal(requirement.target,target,`${id} challenge target`);
  let state=createCharacter(newGame(1),'IRONWARDEN','Regional Tester');
  state={...state,account:{...state.account,unlockedCombatCompanionIds:[...owned]}};
  ok(!companionUnlockRequirementMet(state,requirement),`${id} is not granted merely for owning the regional trio`);
}

let all=createCharacter(newGame(1),'IRONWARDEN','Mastery Tester');
all={...all,character:{...all.character!,monsterMasteryPoints:Object.fromEntries(masteryTargets.map(([,target])=>[target,500]))}};
all=reconcileCombatCompanionUnlocks(all,1000);
for(const id of masteryTargets.map(([id])=>id))ok(all.account.unlockedCombatCompanionIds?.includes(id),`${id} unlocks through monster mastery`);
for(const [id] of prestigeTargets)ok(!all.account.unlockedCombatCompanionIds?.includes(id),`${id} remains reserved for its special challenge`);

console.log('PASS: regional companion mastery and deterministic prestige challenge chains validate');
