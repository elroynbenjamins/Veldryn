import {assert} from './test-assert';
import {createCharacter,newGame} from '../src/core/game';
import {EARLY_FEATURE_DESTINATION_ORDER,EARLY_FEATURE_UNLOCKS,earlyFeatureLockReason,earlyFeatureUnlocked,earlyFeatureUnlockProgress,playerFacingGameplayError} from '../src/core/feature-unlocks';
import {homeSessionSummary} from '../src/core/dashboard';
import {executeGameCommand} from '../src/core/game-commands';
import {eventDailyGift} from '../src/core/live-events';

function claimQuest(state:any,id:string,progress:number){return {...state,quests:state.quests.map((q:any)=>q.questId===id?{...q,status:'claimed',progress}:q)}}
function expectLocked(state:any,command:any,message:string){let actual='';try{executeGameCommand(state,command,1)}catch(error){actual=error instanceof Error?error.message:''}assert.equal(actual,message);}

assert.deepEqual([...EARLY_FEATURE_DESTINATION_ORDER],['DailySupplies','Events','AccountBonuses','Friends','Companions','Social','MasteryHall','Guild','Rankings']);
let state=createCharacter(newGame(0),'IRONWARDEN','Onboarding Audit');
assert.equal(earlyFeatureLockReason(state,'Events'),'','festival calendar and gameplay should be accessible immediately');
assert.equal(earlyFeatureUnlocked(state,'events'),true,'Live events should be available from level 1 without an introductory quest');
assert.equal(earlyFeatureUnlockProgress(state,'events').unlocked,true,'Event unlock progress should be consistent with level-one access');
assert.equal(earlyFeatureUnlockProgress(state,'events').status,'claimed','Event unlock progress should not show a locked quest');
for(const id of Object.keys(EARLY_FEATURE_UNLOCKS) as Array<keyof typeof EARLY_FEATURE_UNLOCKS>){if(id!=='events')assert.equal(earlyFeatureUnlocked(state,id),false,id+' should begin locked');}
const fresh=homeSessionSummary(state,1);
assert.equal(fresh.dailyReady,false);
assert.equal(fresh.eventRewards,0);
assert.equal(fresh.weeklyTotal,0);
assert.equal(fresh.weeklyRewards,0);
assert.equal(fresh.companionAttention,0);
expectLocked(state,{type:'daily_supplies_claim',args:{characterId:state.character!.id}},'daily_supplies_locked');
expectLocked(state,{type:'goals_set',args:{goals:[]}},'goals_retired');
expectLocked(state,{type:'seasonal',args:{period:'weekly',id:'anything'}},'contract_board_locked');
const eventNow=Date.parse('2026-10-18T12:00:00.000Z'),eventId='EVT_ANNUAL_010_2026';
const levelOne=createCharacter(newGame(eventNow),'WAYFINDER','First Festival');
const liveLevelOne={...levelOne,account:{...levelOne.account,liveEvent:{enabled:true,eventId,startsAtMs:eventNow-86_400_000,endsAtMs:eventNow+86_400_000,graceEndsAtMs:eventNow+2*86_400_000}}};
const giftBefore=eventDailyGift(liveLevelOne,eventNow);
assert.ok(giftBefore&&!giftBefore.claimed,'A level-one character should be eligible for an active event gift before claiming QST_002');
const levelOneClaim=executeGameCommand(liveLevelOne,{type:'event_daily'},eventNow).state;
assert.equal(eventDailyGift(levelOneClaim,eventNow)?.claimed,true,'Level-one gift claims should be accepted and persisted');
assert.equal(levelOneClaim.account.eventProgressById?.[eventId],giftBefore!.gift.rewardCurrency,'Level-one claims should award the exact event currency amount');
let duplicateGiftError='';try{executeGameCommand(levelOneClaim,{type:'event_daily'},eventNow);}catch(error){duplicateGiftError=error instanceof Error?error.message:'';}
assert.equal(duplicateGiftError,"Today's festival gift was already claimed.",'Daily gift must still be protected against duplicate claims');
assert.equal(playerFacingGameplayError('events_locked'),'Events are temporarily unavailable. Please try again.');
assert.equal(playerFacingGameplayError('event_not_active'),'event_not_active','Unrelated errors must retain their original detail');

state=claimQuest(state,'QST_002',2);
assert.equal(earlyFeatureUnlocked(state,'dailySupplies'),true,'Daily Supplies should still unlock at QST_002');
assert.equal(earlyFeatureUnlocked(state,'events'),true,'Live events should remain available after QST_002');
assert.equal(earlyFeatureUnlocked(state,'pets'),false);
assert.ok(earlyFeatureLockReason(state,'Friends').includes("A Hound's Trail"));

state=claimQuest(state,'QST_003',6);
for(const id of ['pets','accountBonuses','friends'] as const)assert.equal(earlyFeatureUnlocked(state,id),true,id+' should unlock at QST_003');
assert.equal(earlyFeatureUnlocked(state,'companions'),false);

state=claimQuest(state,'QST_005',10);
for(const id of ['companions','social','contracts','masteryHall','guild'] as const)assert.equal(earlyFeatureUnlocked(state,id),true,id+' should unlock at QST_005');
assert.equal(earlyFeatureLockReason(state,'Guild'),'');
assert.equal(earlyFeatureUnlocked(state,'rankings'),false,'Rankings should remain a later progression unlock');

const freshAlt=createCharacter(newGame(0),'WAYFINDER','Fresh Alt');
const learnedAccount={...freshAlt,otherCharacters:[{character:state.character!,inventory:state.inventory,overflow:state.overflow,activity:null,skills:state.skills,quests:state.quests,currentRegionId:state.currentRegionId}]};
for(const id of ['dailySupplies','events','pets','accountBonuses','friends','companions','social','contracts','masteryHall','guild'] as const)assert.equal(earlyFeatureUnlocked(learnedAccount,id),true,id+' should stay unlocked on a fresh alt once another character earned it');
assert.equal(earlyFeatureUnlocked(learnedAccount,'rankings'),false,'Fresh alt should not invent an account milestone that no character has earned');

state=claimQuest(state,'QST_011',20);
assert.equal(earlyFeatureUnlocked(state,'rankings'),true,'Rankings should unlock at QST_011');
assert.equal(earlyFeatureLockReason(state,'Rankings'),'');
console.log('PASS staged first-session feature exposure ladder and level-one event gift claiming');
