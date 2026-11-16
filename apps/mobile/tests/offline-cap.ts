import {createCharacter,newGame,offlineCapBreakdown,offlineCapSeconds,previewActivityReward} from '../src/core/game';
import {noviceItemId,noviceSetFor} from '../src/content/novice-sets';
import {accountRegionAfkUnlocked,recordAccountProgress,unlockedCharacterSlots} from '../src/core/account-roster';
import {migrateSave} from '../src/core/save-migrations';

let state=createCharacter(newGame(0),'BASTION','Tester');
const fresh=offlineCapBreakdown(state);
if(fresh.hours!==8||fresh.baseHours!==8||fresh.freeMaxHours!==24||fresh.maxHours!==30)throw new Error('Fresh AFK reserve must stay 8h, with 24h planned progression and 30h total ceilings');

state={...state,activity:{kind:'combat',targetId:'MOSS_RAT',startedAtMs:0,lastClaimAtMs:0}};
if(previewActivityReward(state,20*60*60*1000).elapsedSeconds!==8*60*60)throw new Error('AFK preview must honor the 8-hour starting cap');

// Crafting the first class set does not award AFK time. Its old +2h reward moved to the Sunscar unlock.
state={
 ...state,
 character:{...state.character!,craftedNoviceItemIds:noviceSetFor('BASTION').slots.map(slot=>noviceItemId('BASTION',slot))},
 account:{...state.account,unlockedCharacterSlots:2,guildMember:true},
 defeatedBossIds:['FALLEN_KNIGHT'],
 quests:state.quests.map(q=>q.questId==='QST_005'?{...q,status:'claimed'}:q),
};
const progressed=offlineCapBreakdown(state);
if(progressed.hours!==16||offlineCapSeconds(state)!==16*60*60)throw new Error('The first four +2h milestones must total 16h, with no class-set bonus');
if(progressed.sources.some(source=>source.id==='class_set'))throw new Error('Retired first class set reward still advertised');

// Legacy fourth/fifth character-slot watermarks do not award time or create new slots.
state={...state,account:{...state.account,unlockedCharacterSlots:5}};
if(unlockedCharacterSlots(state)!==3)throw new Error('An old five-slot watermark cannot create more than three new-character slots');
const third=offlineCapBreakdown(state);
if(third.hours!==18)throw new Error('Third account-skill slot must add +2h');
if(third.sources.some(source=>source.id==='character_slot_4'||source.id==='character_slot_5'))throw new Error('Retired fourth/fifth slot AFK sources must not exist');

// Unlock eligibility requires the actual regional gates, not merely a high character level.
state={...state,character:{...state.character!,level:99}};
if(accountRegionAfkUnlocked(state,'SUNSCAR')||accountRegionAfkUnlocked(state,'FROSTMARCH'))throw new Error('A high level alone must not unlock the region');
state={...state,exploredRouteIds:['SCOUT_KINGS_ROAD']};
const sunscar=offlineCapBreakdown(state);
if(sunscar.hours!==20||!sunscar.sources.some(source=>source.id==='region_sunscar'&&source.earned&&source.hours===2))throw new Error('Actual Sunscar unlock must grant +2h');
if(accountRegionAfkUnlocked(state,'FROSTMARCH'))throw new Error('Frostmarch must still require Sunscar scouting');

state={...state,exploredRouteIds:['SCOUT_KINGS_ROAD','SCOUT_SUNSCAR']};
const frostmarch=offlineCapBreakdown(state);
if(frostmarch.hours!==22||!frostmarch.sources.some(source=>source.id==='region_frostmarch'&&source.earned&&source.hours===2))throw new Error('Actual Frostmarch unlock must grant +2h');
if(accountRegionAfkUnlocked({...state,currentRegionId:'ASHLANDS',account:{...state.account,earnedAfkRegionIds:['ASHLANDS']}},'ASHLANDS'))throw new Error('Ashlands preview must never claim +2h before release');
if(frostmarch.sources.find(source=>source.id==='region_ashlands')?.earned)throw new Error('Ashlands is not released yet');

// Server-owned account records keep earned region AFK even when the unlocking character later changes.
const earned=recordAccountProgress(state);
if(JSON.stringify(earned.account.earnedAfkRegionIds)!==JSON.stringify(['SUNSCAR','FROSTMARCH']))throw new Error('Earned region milestones must be stored on account');
// A character may backtrack or lose scouting display data; the already-defeated story boss remains defeated.
const reset={...earned,character:{...earned.character!,level:1},exploredRouteIds:[]};
if(offlineCapBreakdown(reset).hours!==22)throw new Error('Account region AFK bonuses must not disappear on character backtracking');
const restored=migrateSave(JSON.parse(JSON.stringify(reset)));
if(offlineCapBreakdown(restored).hours!==22)throw new Error('Regional AFK entitlements must survive save migration');

const vipPlusState={...restored,account:{...restored.account,entitlements:{vip_plus:true}}};
if(offlineCapBreakdown(vipPlusState).hours!==24)throw new Error('VIP+ still adds an independent 2h');
if(offlineCapBreakdown(vipPlusState).sources.find(row=>row.id==='vip')?.earned)throw new Error('VIP+ alone must not grant VIP');
const both={...restored,account:{...restored.account,entitlements:{vip:true,vip_plus:true}}};
if(offlineCapBreakdown(both).hours!==26)throw new Error('VIP and VIP+ together must add 4h');
const full={...restored,account:{...restored.account,entitlements:{vip:true,vip_plus:true,supporter:true}}};
if(offlineCapBreakdown(full).hours!==28||offlineCapBreakdown(full).maxHours!==30)throw new Error('While Ashlands is unreleased, obtainable AFK is 28h and the future cap stays 30h');
console.log('PASS: 3-role character milestones, Sunscar/Frostmarch AFK, gated Ashlands, persisted account unlocks and paid entitlements');
