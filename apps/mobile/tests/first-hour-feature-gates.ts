import {assert} from './test-assert';
import {createCharacter,newGame} from '../src/core/game';
import {executeGameCommand} from '../src/core/game-commands';
import {earlyFeatureUnlocked,EARLY_FEATURE_UNLOCK_ORDER} from '../src/core/feature-unlocks';
import {homeSessionSummary} from '../src/core/dashboard';
import {applyTrustedLongTermProgression} from '../src/core/long-term-progression-runtime';
import {masteryPointsForRank} from '../src/core/profession-mastery-v40';

const claim=(state:ReturnType<typeof createCharacter>,questId:string)=>({...state,quests:state.quests.map(row=>row.questId===questId?{...row,status:'claimed' as const,progress:999}:row)});
let state=createCharacter(newGame(0),'IRONWARDEN','First Hour Test');

for(const id of ['dailySupplies','pets','accountBonuses','events','companions','contracts','classChallenges','masteryHall','dungeons','guild'] as const)assert.equal(earlyFeatureUnlocked(state,id),false,id+' should begin locked');
assert.deepEqual(EARLY_FEATURE_UNLOCK_ORDER.slice(0,7),['dailySupplies','pets','accountBonuses','events','companions','contracts','classChallenges']);

const baseSummary=homeSessionSummary(state,1000);
assert.equal(baseSummary.dailyReady,false);
assert.equal(baseSummary.eventRewards,0);
assert.equal(baseSummary.weeklyTotal,0);
assert.equal(baseSummary.weeklyRewards,0);
assert.equal(baseSummary.companionAttention,0);

let message='';
try{executeGameCommand(state,{type:'daily_supplies_claim',args:{characterId:state.character!.id}},1000)}catch(error){message=error instanceof Error?error.message:''}
assert.equal(message,'daily_supplies_locked');
message='';
try{executeGameCommand(state,{type:'event_daily'},1001)}catch(error){message=error instanceof Error?error.message:''}
assert.equal(message,'event_system_locked');
message='';
try{executeGameCommand(state,{type:'seasonal',args:{period:'daily',id:'NOT_REAL'}},1002)}catch(error){message=error instanceof Error?error.message:''}
assert.equal(message,'class_challenges_locked');

const beforeContracts=applyTrustedLongTermProgression(state,[{kind:'gathering',contentId:'COPPER_VEIN',units:12}],undefined,1100,{accountId:'gate-test',eventId:'before-contracts'});
assert.deepEqual(beforeContracts.state.account.weeklyOrders,state.account.weeklyOrders,'Contract Board must not be generated before QST_006');

state=claim(state,'QST_002');
assert.equal(earlyFeatureUnlocked(state,'dailySupplies'),true);
assert.equal(earlyFeatureUnlocked(state,'pets'),false);

state=claim(state,'QST_003');
assert.equal(earlyFeatureUnlocked(state,'pets'),true);
assert.equal(earlyFeatureUnlocked(state,'accountBonuses'),true);
assert.equal(earlyFeatureUnlocked(state,'events'),false);

state=claim(state,'QST_004');
assert.equal(earlyFeatureUnlocked(state,'events'),true);
assert.equal(earlyFeatureUnlocked(state,'companions'),false);

state=claim(state,'QST_005');
assert.equal(earlyFeatureUnlocked(state,'companions'),true);
assert.equal(earlyFeatureUnlocked(state,'contracts'),false);

state=claim(state,'QST_006');
assert.equal(earlyFeatureUnlocked(state,'contracts'),true);
const afterContracts=applyTrustedLongTermProgression(state,[{kind:'gathering',contentId:'COPPER_VEIN',units:12}],undefined,1200,{accountId:'gate-test',eventId:'after-contracts'});
assert.ok(afterContracts.state.account.weeklyOrders,'Contract Board should be generated after QST_006');

state=claim(state,'QST_007');
assert.equal(earlyFeatureUnlocked(state,'classChallenges'),true);

assert.equal(earlyFeatureUnlocked(state,'dungeons'),false);
state={...state,character:{...state.character!,level:15}};
assert.equal(earlyFeatureUnlocked(state,'dungeons'),true);

assert.equal(earlyFeatureUnlocked(state,'masteryHall'),false);
state={...state,account:{...state.account,professionMasteryByAction:{TEST_ACTION:{actionId:'TEST_ACTION',points:masteryPointsForRank(10),updatedAtMs:1300}}}};
assert.equal(earlyFeatureUnlocked(state,'masteryHall'),true);

assert.equal(earlyFeatureUnlocked(state,'guild'),false);
state=claim(state,'QST_011');
assert.equal(earlyFeatureUnlocked(state,'guild'),true);

console.log('PASS first-hour staged feature gates');
