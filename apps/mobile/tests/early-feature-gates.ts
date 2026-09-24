import {strict as assert} from 'node:assert';
import {createCharacter,newGame} from '../src/core/game';
import {earlyFeatureGate,earlyFeatureUnlocked} from '../src/core/early-feature-gates';
import {resolveCorePetCombatDrops} from '../src/core/core-pet-drops';
import {executeGameCommand} from '../src/core/game-commands';

const claimed=(state:any,id:string)=>({
 ...state,
 quests:state.quests.map((quest:any)=>quest.questId===id?{...quest,status:'claimed'}:quest),
});

let state=createCharacter(newGame(0),'IRONWARDEN','Gate Test');
assert.equal(earlyFeatureUnlocked(state,'pets'),false);
assert.equal(earlyFeatureUnlocked(state,'companions'),false);
assert.equal(earlyFeatureGate(state,'pets').questId,'QST_002');
assert.equal(earlyFeatureGate(state,'companions').questId,'QST_005');

assert.deepEqual(resolveCorePetCombatDrops(state,'ROADSIDE_BOAR',1,'locked-pet',()=>0),[],'Pet rolls must not run while the feature is locked');

state=claimed(state,'QST_002');
assert.equal(earlyFeatureUnlocked(state,'pets'),true);
assert.equal(earlyFeatureUnlocked(state,'companions'),false);
assert.deepEqual(resolveCorePetCombatDrops(state,'ROADSIDE_BOAR',1,'unlocked-pet',()=>0),['PET_009']);

let blocked=false;
try{executeGameCommand(state,{type:'companion_unequip'},1)}catch(error){blocked=error instanceof Error&&error.message==='companions_locked_complete_into_ironwood';}
assert.equal(blocked,true,'Companion commands must be authoritatively rejected before QST_005');

state=claimed(state,'QST_005');
assert.equal(earlyFeatureUnlocked(state,'companions'),true);

const veteranQuests=state.quests.map((quest:any)=>({...quest}));
const freshQuests=state.quests.map((quest:any)=>({...quest,status:quest.questId==='QST_001'?'active':'locked'}));
const accountWide={...state,quests:freshQuests,otherCharacters:[{character:{...state.character!,id:'CHAR_VETERAN'},inventory:{...state.inventory,stacks:[]},overflow:{...state.overflow,stacks:[]},activity:null,skills:state.skills.map(x=>({...x})),quests:veteranQuests,currentRegionId:state.currentRegionId}]};
assert.equal(earlyFeatureUnlocked(accountWide,'pets'),true,'Pet unlock must survive switching to a fresh character');
assert.equal(earlyFeatureUnlocked(accountWide,'companions'),true,'Companion unlock must survive switching to a fresh character');

console.log('PASS early Pet and Companion onboarding gates');
