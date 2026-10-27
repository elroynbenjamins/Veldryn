import {createCharacter,newGame} from '../src/core/game';
import {chooseStarterCombatCompanion,reconcileCombatCompanionUnlocks,starterCombatCompanionChoicePending,starterCombatCompanionChoices} from '../src/core/combat-companions';
import {executeGameCommand,validateGameCommand} from '../src/core/game-commands';
import {createSaveBackup,parseSaveBackup} from '../src/core/save-transfer';

const now=Date.UTC(2026,9,26);
const equal=(actual:unknown,expected:unknown,label='values differ')=>{if(actual!==expected)throw new Error(`${label}: ${String(actual)} !== ${String(expected)}`);};
const deepEqual=(actual:unknown,expected:unknown,label='values differ')=>equal(JSON.stringify(actual),JSON.stringify(expected),label);
const throws=(run:()=>unknown,pattern:RegExp,label:string)=>{let error:unknown;try{run();}catch(caught){error=caught;}if(!(error instanceof Error)||!pattern.test(error.message))throw new Error(label);};
function unlocked(classId:'IRONWARDEN'|'DAWNKEEPER'|'WAYFINDER'){
  const state=createCharacter(newGame(now),classId,'Starter Test');
  state.quests=state.quests.map(quest=>quest.questId==='QST_005'?{...quest,status:'claimed' as const,progress:10}:quest);
  return reconcileCombatCompanionUnlocks(state,now);
}
function silverbrookReady<T extends ReturnType<typeof unlocked>>(state:T){
  return {...state,skills:state.skills.map(skill=>skill.skillId==='fishing'?{...skill,level:16}:skill),account:{...state.account,companionUnlockProgress:{...(state.account.companionUnlockProgress??{}),'node:SILVERBROOK_SHOAL':1,'node:RIVER_EEL_POOL':1,'node:OATHSCALE_POOL':1,SILVERBROOK_NODES:1}}};
}
function oldMinesReady<T extends ReturnType<typeof unlocked>>(state:T){return {...state,account:{...state.account,companionUnlockProgress:{...(state.account.companionUnlockProgress??{}),OLD_MINES_KILLS:250}}};}

const damage=unlocked('WAYFINDER');
equal(damage.account.unlockedCombatCompanionIds?.length??0,0,'claiming Into Ironwood must wait for a starter choice');
equal(starterCombatCompanionChoicePending(damage),true);
deepEqual(starterCombatCompanionChoices(damage).map(row=>row.id),['UNIT_002','UNIT_003'],'damage classes choose Tank or Support');
deepEqual(starterCombatCompanionChoices(unlocked('IRONWARDEN')).map(row=>row.id),['UNIT_001','UNIT_003'],'tank classes choose Damage or Support');
deepEqual(starterCombatCompanionChoices(unlocked('DAWNKEEPER')).map(row=>row.id),['UNIT_001','UNIT_002'],'support classes choose Damage or Tank');

const chosen=chooseStarterCombatCompanion(damage,'UNIT_002',now);
equal(chosen.account.starterCombatCompanionId,'UNIT_002');
deepEqual(chosen.account.unlockedCombatCompanionIds,['UNIT_002']);
equal(chosen.character?.equippedCombatCompanionId,'UNIT_002');
equal(starterCombatCompanionChoicePending(chosen),false);
throws(()=>chooseStarterCombatCompanion(chosen,'UNIT_003',now),/already been chosen/,'starter choice must be permanent');
throws(()=>chooseStarterCombatCompanion(unlocked('WAYFINDER'),'UNIT_001',now),/different role/,'same-role starter must be rejected');

validateGameCommand({type:'companion_starter',args:{id:'UNIT_003'}});
const commanded=executeGameCommand(unlocked('IRONWARDEN'),{type:'companion_starter',args:{id:'UNIT_003'}},now).state;
equal(commanded.account.starterCombatCompanionId,'UNIT_003');
equal(commanded.character?.equippedCombatCompanionId,'UNIT_003');
const reloaded=parseSaveBackup(createSaveBackup(commanded));
equal(reloaded.account.starterCombatCompanionId,'UNIT_003','starter selection must survive save normalization');

const legacy=unlocked('IRONWARDEN');
legacy.account.unlockedCombatCompanionIds=['UNIT_001'];
legacy.account.combatCompanionProgress={UNIT_001:{level:1,xp:0,ascensionTier:0,bondLevel:1,bondXp:0,bondTraitUnlocked:false}};
const migrated=parseSaveBackup(createSaveBackup(legacy));
equal(migrated.account.starterCombatCompanionId,'UNIT_001','legacy automatic Ironwood Hound grants must become an implicit starter choice');

const damageWithSprite=reconcileCombatCompanionUnlocks(silverbrookReady(chooseStarterCombatCompanion(unlocked('WAYFINDER'),'UNIT_003',now)),now+1);
equal(damageWithSprite.account.starterFollowupCombatCompanionId,'UNIT_002','damage class with Sprite receives the Tank starter second');
deepEqual(damageWithSprite.account.unlockedCombatCompanionIds?.sort(),['UNIT_002','UNIT_003'],'Sprite is not duplicated for a damage class');
const tankWithSprite=reconcileCombatCompanionUnlocks(silverbrookReady(chooseStarterCombatCompanion(unlocked('IRONWARDEN'),'UNIT_003',now)),now+1);
equal(tankWithSprite.account.starterFollowupCombatCompanionId,'UNIT_001','tank class with Sprite receives the Damage starter second');
deepEqual(tankWithSprite.account.unlockedCombatCompanionIds?.sort(),['UNIT_001','UNIT_003'],'Sprite is not duplicated for a tank class');
const supportWithHound=reconcileCombatCompanionUnlocks(silverbrookReady(chooseStarterCombatCompanion(unlocked('DAWNKEEPER'),'UNIT_001',now)),now+1);
equal(supportWithHound.account.starterFollowupCombatCompanionId,'UNIT_002','support class receives its missing compatible Tank starter');
deepEqual(supportWithHound.account.unlockedCombatCompanionIds?.sort(),['UNIT_001','UNIT_002'],'support class is not awarded an unusable Support companion');
const tankWithHound=reconcileCombatCompanionUnlocks(silverbrookReady(chooseStarterCombatCompanion(unlocked('IRONWARDEN'),'UNIT_001',now)),now+1);
equal(tankWithHound.account.starterFollowupCombatCompanionId,'UNIT_003','the normal Silverbrook reward remains unchanged when it is compatible and missing');
const followupReload=parseSaveBackup(createSaveBackup(damageWithSprite));
equal(followupReload.account.starterFollowupCombatCompanionId,'UNIT_002','resolved second-companion reward survives save normalization');

const thirdWaits=reconcileCombatCompanionUnlocks(oldMinesReady(chooseStarterCombatCompanion(unlocked('IRONWARDEN'),'UNIT_001',now)),now+2);
equal(thirdWaits.account.starterThirdCombatCompanionId,undefined,'third milestone waits until the second companion is recruited');
deepEqual(thirdWaits.account.unlockedCombatCompanionIds,['UNIT_001'],'Old Mines progress cannot skip the second-companion milestone');
const damageThird=reconcileCombatCompanionUnlocks(oldMinesReady(damageWithSprite),now+2);
equal(damageThird.account.starterThirdCombatCompanionId,'UNIT_001','damage class receives the missing Damage starter for companion-only modes');
deepEqual(damageThird.account.unlockedCombatCompanionIds?.sort(),['UNIT_001','UNIT_002','UNIT_003'],'damage class can collect all three starters');
const tankThird=reconcileCombatCompanionUnlocks(oldMinesReady(tankWithSprite),now+2);
equal(tankThird.account.starterThirdCombatCompanionId,'UNIT_002','tank class receives the missing Tank starter');
deepEqual(tankThird.account.unlockedCombatCompanionIds?.sort(),['UNIT_001','UNIT_002','UNIT_003'],'tank class can collect all three starters');
const supportThird=reconcileCombatCompanionUnlocks(oldMinesReady(supportWithHound),now+2);
equal(supportThird.account.starterThirdCombatCompanionId,'UNIT_003','support class receives the missing Support starter for companion-only modes');
deepEqual(supportThird.account.unlockedCombatCompanionIds?.sort(),['UNIT_001','UNIT_002','UNIT_003'],'support class can collect all three starters');
const thirdReload=parseSaveBackup(createSaveBackup(supportThird));
equal(thirdReload.account.starterThirdCombatCompanionId,'UNIT_003','resolved third-companion reward survives save normalization');

console.log('PASS: role-aware starter companion choice');
