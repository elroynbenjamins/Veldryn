import {createCharacter,newGame,offlineCapBreakdown,offlineCapSeconds,previewActivityReward} from '../src/core/game';
import {noviceItemId,noviceSetFor} from '../src/content/novice-sets';

let state=createCharacter(newGame(0),'BASTION','Tester');
const fresh=offlineCapBreakdown(state);
if(fresh.hours!==8||fresh.baseHours!==8||fresh.freeMaxHours!==24||fresh.maxHours!==30)throw new Error(`Fresh account AFK reserve must be 8h with 24h progression / 30h total ceilings, got ${JSON.stringify(fresh)}`);

state={...state,activity:{kind:'combat',targetId:'MOSS_RAT',startedAtMs:0,lastClaimAtMs:0}};
if(previewActivityReward(state,20*60*60*1000).elapsedSeconds!==8*60*60)throw new Error('Reward preview must use the 8-hour base cap');

state={
 ...state,
 character:{...state.character!,craftedNoviceItemIds:noviceSetFor('BASTION').slots.map(slot=>noviceItemId('BASTION',slot))},
 account:{...state.account,unlockedCharacterSlots:2,guildMember:true},
 defeatedBossIds:['FALLEN_KNIGHT'],
 quests:state.quests.map(q=>q.questId==='QST_005'?{...q,status:'claimed'}:q),
};
const progressed=offlineCapBreakdown(state);
if(progressed.hours!==18||offlineCapSeconds(state)!==18*60*60)throw new Error(`Gameplay progression must raise AFK reserve to 18h, got ${progressed.hours}`);
if(progressed.sources.filter(source=>source.category==='progression'&&source.earned).length!==5)throw new Error('The first five +2h gameplay AFK milestones must raise the reserve to 18h');

state={...state,account:{...state.account,unlockedCharacterSlots:5}};
const earnedMax=offlineCapBreakdown(state);
if(earnedMax.hours!==24||offlineCapSeconds(state)!==24*60*60)throw new Error(`Late account progression must raise AFK reserve to 24h, got ${earnedMax.hours}`);
for(const id of ['character_slot_3','character_slot_4','character_slot_5']){
 const source=earnedMax.sources.find(row=>row.id===id);
 if(!source?.earned||source.hours!==2||source.category!=='progression')throw new Error(id+' must grant exactly +2 earned AFK hours');
}

const vipPlusState={...state,account:{...state.account,entitlements:{vip_plus:true}}};
const vipPlus=offlineCapBreakdown(vipPlusState);
if(vipPlus.hours!==28)throw new Error(`VIP+ must include the VIP +2h and its own +2h after earned progression, got ${vipPlus.hours}`);

state={...state,account:{...state.account,entitlements:{vip_plus:true,supporter:true}}};
const full=offlineCapBreakdown(state);
if(full.hours!==30||offlineCapSeconds(state)!==30*60*60)throw new Error(`Paid AFK upgrades must reach the 30h cap, got ${full.hours}`);
for(const id of ['vip','vip_plus','supporter']){
 const source=full.sources.find(row=>row.id===id);
 if(!source?.earned||source.hours!==2||source.category!=='paid')throw new Error(id+' must grant exactly +2 paid AFK hours');
}
console.log(`PASS: AFK reserve scales ${full.baseHours}h → ${full.freeMaxHours}h through progression → ${full.maxHours}h with paid entitlements`);
