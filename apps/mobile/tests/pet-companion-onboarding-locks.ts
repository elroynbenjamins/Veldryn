import {strict as assert} from 'node:assert';
import {createCharacter,newGame} from '../src/core/game';
import {earlyFeatureUnlocked,earlyFeatureUnlockProgress} from '../src/core/feature-unlocks';
import {resolveCorePetCombatDrops} from '../src/core/core-pet-drops';
import {executeGameCommand} from '../src/core/game-commands';

let state=createCharacter(newGame(0),'IRONWARDEN','Unlock Test');
assert.equal(earlyFeatureUnlocked(state,'pets'),false);
assert.equal(earlyFeatureUnlocked(state,'companions'),false);
assert.equal(earlyFeatureUnlockProgress(state,'pets').questId,'QST_003');
assert.equal(earlyFeatureUnlockProgress(state,'companions').questId,'QST_005');

const guaranteed=()=>0;
assert.deepEqual(resolveCorePetCombatDrops(state,'IRONWOOD_WOLF',100,'locked',guaranteed),[],'locked Pet system must not roll drops');

let lockedError='';
try{executeGameCommand(state,{type:'companion_unequip'},1)}catch(error){lockedError=error instanceof Error?error.message:'';}
assert.equal(lockedError,'companion_system_locked');

state={...state,quests:state.quests.map(q=>q.questId==='QST_003'?{...q,status:'claimed' as const,progress:6}:q)};
assert.equal(earlyFeatureUnlocked(state,'pets'),true);
assert.ok(resolveCorePetCombatDrops(state,'IRONWOOD_WOLF',1,'unlocked',guaranteed).includes('PET_004'));

state={...state,quests:state.quests.map(q=>q.questId==='QST_005'?{...q,status:'claimed' as const,progress:10}:q)};
assert.equal(earlyFeatureUnlocked(state,'companions'),true);
let postUnlockError='';
try{executeGameCommand(state,{type:'companion_supplies'},2)}catch(error){postUnlockError=error instanceof Error?error.message:'';}
assert.notEqual(postUnlockError,'companion_system_locked','after QST_005 the command must pass the onboarding gate');
console.log('PASS staged Pet and Companion onboarding unlocks');
