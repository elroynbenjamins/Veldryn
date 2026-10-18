import {createCharacter,newGame,previewActivityReward,startCombat} from '../src/core/game';
import {liveEventDef} from '../src/content/live-events';
import {acceptEventContract,activeLiveEvent,applyEventDiscoveries,applyEventDrops,chooseEventProject,claimAllEventMilestones,claimEventDailyGift,claimEventDiscovery,claimEventReward,consumeEventCandy,eventCandyStatus,eventCollectionJournal,eventContractBoard,eventDailyGift,eventEffectiveDropRate,eventLifecycle,eventPrestigeBalance,eventProgress,eventRewardClaimed,eventShopOffers,purchaseEventOffer,setLocalEventEnabled} from '../src/core/live-events';

function ok(condition:boolean,message:string){if(!condition)throw new Error(message);}

const t0=2_000_000;
const eventId='EVT_ANNUAL_010_2026';
let state=createCharacter(newGame(t0),'IRONWARDEN','EventTester');
state=startCombat(state,'MOSS_RAT',t0);

ok(!activeLiveEvent(state,t0),'Events must be inactive by default');
ok((previewActivityReward(state,t0+3_600_000).eventDrops?.length??0)===0,'Inactive events cannot add drops');

const scheduled={...state,account:{...state.account,liveEvent:{eventId,enabled:true,startsAtMs:t0+86_400_000,endsAtMs:t0+8*86_400_000}}};
ok(eventLifecycle(scheduled,t0)?.phase==='upcoming','Scheduled Veilbreak should be visible before it begins');
ok(liveEventDef('EVT_ANNUAL_010_2027')?.name==='The Veilbreak','A future Veilbreak season should reuse its released template');

state=setLocalEventEnabled(state,true,t0);
ok(activeLiveEvent(state,t0)?.definition.name==='The Veilbreak','The local event switch should enable Veilbreak');
const weeklyContracts=eventContractBoard(state,t0);
ok(weeklyContracts.length>0&&weeklyContracts.every(contract=>contract.accepted),'Veilbreak weekly contracts should be active without acceptance');
ok(acceptEventContract(state,weeklyContracts[0].objective.id,t0)===state,'Legacy contract acceptance should remain a no-op for older clients');
ok(eventEffectiveDropRate(state,eventId,'gathering',t0)>eventEffectiveDropRate(state,eventId,'combat',t0),'The first daily blessing should increase gathering rewards');

let emptyCandyRejected=false;try{consumeEventCandy(state,t0)}catch{emptyCandyRejected=true}
ok(emptyCandyRejected,'Candy requires an earned charge');
const gift=eventDailyGift(state,t0)!;
const progressBeforeGift=eventProgress(state,eventId);
state=claimEventDailyGift(state,t0);
ok(eventProgress(state,eventId)===progressBeforeGift+gift.gift.rewardCurrency,'Daily gift should grant Veil Reputation');
ok(eventCandyStatus(state,t0).candy?.name==='Gloam Candy','Veilbreak should use its own event candy');
state=consumeEventCandy(state,t0);
ok(state.account.eventCandyChargesById?.[`${eventId}:candy:skill`]===0,'Using Gloam Candy should consume its charge');

state=applyEventDiscoveries(state,[{eventId,discoveryId:'gloam_cinder',name:'Gloam Cinder',quantity:5}]);
state=claimEventDiscovery(state,'gloam_cinder',t0);
ok(state.account.unlockedTitleIds?.includes('title_gloam_touched')===true,'Veilbreak discoveries should grant their permanent reward');

state=applyEventDrops(state,[{eventId,currencyId:'VEIL_SHARD',name:'Veil Shards',quantity:10_000,source:'combat',units:3,recordedAtMs:t0}]);
ok(eventProgress(state,eventId)>0,'Collected Veil Shards should persist as reputation');
state=claimEventReward(state,'emote_lantern_watch',t0+1);
ok(eventRewardClaimed(state,eventId,'emote_lantern_watch'),'Milestone claims should persist');
state=claimAllEventMilestones(state,t0+2);
ok(state.account.unlockedCosmeticPetIds?.includes('EVT_PET_013')===true,'Veilbreak milestone should unlock Gloomkin permanently');
ok(eventCollectionJournal(state,t0+2).some(entry=>entry.reward.id==='EVT_PET_013'),'Veilbreak collection journal should include Gloomkin');

state=chooseEventProject(state,'lantern_patrols',t0+2);
const projectProgress=eventProgress(state,eventId);
state=applyEventDrops(state,[{eventId,currencyId:'VEIL_SHARD',name:'Veil Shards',quantity:24,source:'combat',units:1,recordedAtMs:t0+2}]);
ok(eventProgress(state,eventId)===projectProgress+24,'Veilbreak project choice should preserve earned reward accounting');

state={...state,account:{...state.account,eventPrestigeBalanceById:{...(state.account.eventPrestigeBalanceById??{}),[eventId]:10}}};
ok(eventShopOffers(state,t0+2).some(offer=>offer.id==='veil_lantern_mimic'),'Lantern Mimic should be offered by Veilbreak');
ok(eventShopOffers(state,t0+2).some(offer=>offer.id==='gloamward_frame'),'Gloamward Frame should be offered by Veilbreak');
let gatedFrameRejected=false;try{purchaseEventOffer(state,'gloamward_frame',t0+2)}catch{gatedFrameRejected=true}
ok(gatedFrameRejected,'Gloamward Frame should respect its level 10 shop gate');
state={...state,character:{...state.character!,level:10}};
state=purchaseEventOffer(state,'gloamward_frame',t0+2);
ok(state.account.unlockedProfileBorderIds?.includes('frame_gloamward')===true,'Veilbreak shop purchase should permanently unlock the personal Gloamward Frame');
state=purchaseEventOffer(state,'veil_lantern_mimic',t0+2);
ok(state.account.unlockedCosmeticPetIds?.includes('EVT_PET_014')===true,'Veilbreak shop purchase should unlock Lantern Mimic permanently');
ok(eventPrestigeBalance(state,eventId)===0,'Prestige shop purchase should spend Lantern Embers');

const eventEnd=state.account.liveEvent!.endsAtMs;
const graceTime=eventEnd+60_000;
ok(eventLifecycle(state,graceTime)?.phase==='claiming','Ended Veilbreak should enter its claim grace period');
ok(!activeLiveEvent(state,graceTime),'Claim-period events must not generate activity drops');
ok(eventLifecycle(state,eventEnd+8*86_400_000)===null,'Veilbreak should archive after its seven-day claim period');

console.log(JSON.stringify({status:'PASS',event:'Veilbreak',progress:eventProgress(state,eventId)},null,2));
