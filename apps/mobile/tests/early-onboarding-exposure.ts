import {assert} from './test-assert';
import {createCharacter,newGame} from '../src/core/game';
import {EARLY_FEATURE_UNLOCKS,earlyFeatureLockReason,earlyFeatureUnlocked} from '../src/core/feature-unlocks';
import {homeSessionSummary} from '../src/core/dashboard';
import {executeGameCommand} from '../src/core/game-commands';

function claimQuest(state:any,id:string,progress:number){return {...state,quests:state.quests.map((q:any)=>q.questId===id?{...q,status:'claimed',progress}:q)}}
function expectLocked(state:any,command:any,message:string){let actual='';try{executeGameCommand(state,command,1)}catch(error){actual=error instanceof Error?error.message:''}assert.equal(actual,message);}

let state=createCharacter(newGame(0),'IRONWARDEN','Onboarding Audit');
for(const id of Object.keys(EARLY_FEATURE_UNLOCKS) as Array<keyof typeof EARLY_FEATURE_UNLOCKS>)assert.equal(earlyFeatureUnlocked(state,id),false,id+' should begin locked');
const fresh=homeSessionSummary(state,1);
assert.equal(fresh.dailyReady,false);
assert.equal(fresh.eventRewards,0);
assert.equal(fresh.goalTotal,0);
assert.equal(fresh.weeklyTotal,0);
assert.equal(fresh.weeklyRewards,0);
assert.equal(fresh.companionAttention,0);
expectLocked(state,{type:'daily_supplies_claim',args:{characterId:state.character!.id}},'daily_supplies_locked');
expectLocked(state,{type:'goals_set',args:{goals:[]}},'working_toward_locked');
expectLocked(state,{type:'seasonal',args:{period:'weekly',id:'anything'}},'contract_board_locked');
expectLocked(state,{type:'event_daily'},'events_locked');

state=claimQuest(state,'QST_002',2);
for(const id of ['workingToward','dailySupplies','events'] as const)assert.equal(earlyFeatureUnlocked(state,id),true,id+' should unlock at QST_002');
assert.equal(earlyFeatureUnlocked(state,'pets'),false);
assert.equal(earlyFeatureLockReason(state,'Progression'),'');
assert.ok(earlyFeatureLockReason(state,'Friends').includes("A Hound's Trail"));

state=claimQuest(state,'QST_003',6);
for(const id of ['pets','accountBonuses','friends'] as const)assert.equal(earlyFeatureUnlocked(state,id),true,id+' should unlock at QST_003');
assert.equal(earlyFeatureUnlocked(state,'companions'),false);

state=claimQuest(state,'QST_005',10);
for(const id of ['companions','social','contracts','masteryHall'] as const)assert.equal(earlyFeatureUnlocked(state,id),true,id+' should unlock at QST_005');
assert.equal(earlyFeatureUnlocked(state,'guild'),false);
assert.ok(earlyFeatureLockReason(state,'Guild').includes('Place Among Guilds'));

state=claimQuest(state,'QST_011',20);
for(const id of ['guild','rankings'] as const)assert.equal(earlyFeatureUnlocked(state,id),true,id+' should unlock at QST_011');
assert.equal(earlyFeatureLockReason(state,'Guild'),'');
assert.equal(earlyFeatureLockReason(state,'Rankings'),'');
console.log('PASS staged first-session feature exposure ladder');
