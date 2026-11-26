import {createCharacter,newGame,previewActivityReward,startCombat} from '../src/core/game';
import {liveEventDef} from '../src/content/live-events';
import {EQUIPMENT_MAIN_RESOURCE_BUNDLES} from '../src/content/equipment-main-resource-shop';
import {equipmentShopTierUnlocked} from '../src/core/equipment-shop-tier-unlock';
import {COMBAT_COMPANIONS} from '../src/content/combat-companions';
import {unlockCombatCompanion} from '../src/core/combat-companions';
import {canUseProfileCosmetic,profileCosmeticReleased} from '../src/core/profile-cosmetics';
import {profileRewardSource} from '../src/core/profile-customization';
import {executeGameCommand} from '../src/core/game-commands';
import {EVENT_BOND_CANDY_MATERIAL_CAP,eventBondCandyMaterialUses,canAnnounceLiveEventStart,acceptEventContract,activeLiveEvent,applyEventDiscoveries,applyEventDrops,chooseEventProject,claimAllEventMilestones,claimEventDailyGift,claimEventDiscovery,claimEventReward,consumeEventCandy,availableEventRepeatCaches,eventCandyStatus,eventCollectionJournal,eventContractBoard,eventDailyGift,eventEffectiveDropRate,eventLifecycle,eventPrestigeBalance,eventProgress,eventRewardClaimed,eventShopOffers,eventOfferPurchaseCount,purchaseEventOffer,setLocalEventEnabled} from '../src/core/live-events';

function ok(condition:boolean,message:string){if(!condition)throw new Error(message);}

ok(!canAnnounceLiveEventStart(undefined),'no character never receives a seasonal announcement');
ok(!canAnnounceLiveEventStart(1)&&!canAnnounceLiveEventStart(4),'first four levels have no seasonal announcement');
ok(canAnnounceLiveEventStart(5)&&canAnnounceLiveEventStart(20),'seasonal announcement is eligible at level five and later');

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
state=executeGameCommand(state,{type:'event_candy',args:{kind:'skill'}},t0).state;
ok(state.account.eventCandyChargesById?.[`${eventId}:candy:skill`]===0,'Using Gloam Candy should consume its charge');
const candyCompanionId=COMBAT_COMPANIONS[0].id;
state=unlockCombatCompanion(state,candyCompanionId,t0);
state={...state,character:{...state.character!,equippedCombatCompanionId:undefined}};
state=executeGameCommand(state,{type:'event_candy',args:{kind:'companion',companionId:candyCompanionId}},t0).state;
ok(state.account.eventCandyChargesById?.[`${eventId}:candy:companion`]===0,'Candy can be used on an owned but unequipped companion');
let unownedRejected=false;try{executeGameCommand({...state,account:{...state.account,eventCandyChargesById:{...state.account.eventCandyChargesById,[`${eventId}:candy:companion`]:1}}},{type:'event_candy',args:{kind:'companion',companionId:'NOT_OWNED'}},t0)}catch{unownedRejected=true}
ok(unownedRejected,'Candy must reject unowned companion targets');

// Bond Candy awards five event materials PER owned companion; additional charges remain useful for XP.
const secondCandyCompanionId=COMBAT_COMPANIONS[1].id;
state=unlockCombatCompanion(state,secondCandyCompanionId,t0);
const bondCandyId=eventId+':candy:companion';
const bondMaterialKey=eventId+':candy:companion_material';
state={...state,account:{...state.account,
 eventShopPurchaseCounts:{...state.account.eventShopPurchaseCounts,[bondMaterialKey]:5},
 eventCandyChargesById:{...state.account.eventCandyChargesById,[bondCandyId]:14},
}};
ok(EVENT_BOND_CANDY_MATERIAL_CAP===5,'Each owned companion has five bonus material claims per event');
ok(eventBondCandyMaterialUses(state,eventId,candyCompanionId)===1,'Initial selected companion receives the first bonus material');
const firstBonusBefore=state.account.companionMaterials?.EVENT_BONDBLOOM??0;
for(let i=0;i<4;i++)state=consumeEventCandy(state,t0+i+1,'companion',candyCompanionId);
ok(eventBondCandyMaterialUses(state,eventId,candyCompanionId)===5,'First companion reaches 5/5 bonus claims');
ok((state.account.companionMaterials?.EVENT_BONDBLOOM??0)===firstBonusBefore+4,'Each of first five companion uses awards one bonus material');
const xpOnlyChargesBefore=state.account.eventCandyChargesById?.[bondCandyId]??0;
const xpOnlyMaterialsBefore=state.account.companionMaterials?.EVENT_BONDBLOOM??0;
state=consumeEventCandy(state,t0+6,'companion',candyCompanionId);
ok((state.account.eventCandyChargesById?.[bondCandyId]??0)===xpOnlyChargesBefore-1,'XP-only use must still consume exactly one candy');
ok((state.account.companionMaterials?.EVENT_BONDBLOOM??0)===xpOnlyMaterialsBefore,'XP-only use cannot create extra Bondbloom after 5/5');
ok(eventBondCandyMaterialUses(state,eventId,candyCompanionId)===5,'XP-only uses do not increase capped material counter');
for(let i=0;i<5;i++)state=consumeEventCandy(state,t0+7+i,'companion',secondCandyCompanionId);
ok(eventBondCandyMaterialUses(state,eventId,secondCandyCompanionId)===5,'Different owned companion has its own 5/5 material cap');
ok((state.account.companionMaterials?.EVENT_BONDBLOOM??0)===xpOnlyMaterialsBefore+5,'Switching companions earns independent bonus materials');
ok((state.account.eventShopPurchaseCounts?.[bondMaterialKey]??0)===5,'Legacy event-wide count remains intact without being reused as per-companion history');


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

const backgroundOffer=eventShopOffers(state,t0+2).find(offer=>offer.id==='veilbreak_background');
ok(backgroundOffer?.reward.kind==='background'&&backgroundOffer.reward.id==='bg_veilbreak','Veilbreak must offer a personal profile background');
ok(profileCosmeticReleased(state,'background','bg_veilbreak'),'Released event background is discoverable before purchase');
ok(!canUseProfileCosmetic(state,'background','bg_veilbreak'),'Previewing an event background cannot grant ownership');
const backgroundSource=profileRewardSource(state,'background','bg_veilbreak');
ok(backgroundSource.destination==='Events'&&backgroundSource.detail.includes('1,800 Veil Shards'),'Profile gallery must explain the exact event shop unlock');
state=purchaseEventOffer(state,'veilbreak_background',t0+2);
ok(canUseProfileCosmetic(state,'background','bg_veilbreak'),'Shop purchase permanently unlocks the personal background');
ok(eventCollectionJournal(state,t0+2).some(entry=>entry.reward.id==='bg_veilbreak'&&entry.owned),'Event collection must reflect owned background');
let duplicateBackgroundRejected=false;try{purchaseEventOffer(state,'veilbreak_background',t0+2)}catch{duplicateBackgroundRejected=true}
ok(duplicateBackgroundRejected,'A background cannot be purchased twice');
state=executeGameCommand(state,{type:'profile',args:{profileBackgroundId:'bg_veilbreak'}},t0+2).state;
ok(state.character?.profileBackgroundId==='bg_veilbreak','Purchased background must equip on the personal profile card');

const cap=liveEventDef(eventId)!.maxProgress;
state={...state,account:{...state.account,eventProgressById:{...state.account.eventProgressById,[eventId]:cap+3_450}}};
const prestigeBefore=eventPrestigeBalance(state,eventId);
ok(availableEventRepeatCaches(state,eventId)===3,'Post-cap reputation should produce three claimable caches');
state=executeGameCommand(state,{type:'event_cache'},t0+2).state;
ok(eventPrestigeBalance(state,eventId)===prestigeBefore+3,'Claim all should award prestige currency for every ready cache');
ok(availableEventRepeatCaches(state,eventId)===0&&state.account.eventRepeatCacheClaimsById?.[eventId]===3,'Claim all should record all caches once');
let secondClaimRejected=false;try{executeGameCommand(state,{type:'event_cache'},t0+3)}catch{secondClaimRejected=true}
ok(secondClaimRejected,'Post-cap caches cannot be claimed twice');
const eventEnd=state.account.liveEvent!.endsAtMs;
const graceTime=eventEnd+60_000;
ok(eventLifecycle(state,graceTime)?.phase==='claiming','Ended Veilbreak should enter its claim grace period');
ok(!activeLiveEvent(state,graceTime),'Claim-period events must not generate activity drops');
ok(eventLifecycle(state,eventEnd+8*86_400_000)===null,'Veilbreak should archive after its seven-day claim period');


const frostTime=Date.UTC(2026,11,3,12),frostId='EVT_ANNUAL_012_2026';
let frost=setLocalEventEnabled(createCharacter(newGame(frostTime),'IRONWARDEN','FrostShopTester'),true,frostTime,frostId);
ok(liveEventDef(frostId)?.name==='Frostfall Festival','Frostfall is in the playable event catalogue');
ok(liveEventDef('EVT_ANNUAL_012_2027')?.name==='Frostfall Festival','Frostfall can recur with isolated annual IDs');
ok(EQUIPMENT_MAIN_RESOURCE_BUNDLES.length===7,'Both shops use seven reviewed equipment resource inputs');
ok(eventShopOffers(frost,frostTime).filter(offer=>offer.reward.kind==='crafting_material').length===7,'Frostfall offers all seven selectable main materials');
ok(eventShopOffers(frost,frostTime).length>=20,'Frostfall has a full holiday catalogue beyond the original five rewards');
const bellframeId='frame_frostfall_aurora_bellframe',bellframeOffer='frostfall_aurora_bellframe';
const bellframeStart=Date.UTC(2026,11,3),bellframeEnd=Date.UTC(2026,11,27),bellframeGrace=Date.UTC(2026,11,29);
const frameState={...frost,account:{...frost.account,liveEvent:{eventId:frostId,enabled:true,startsAtMs:bellframeStart,endsAtMs:bellframeEnd,graceEndsAtMs:bellframeGrace},eventCurrencyBalanceById:{[frostId]:6000}}};
ok(!profileCosmeticReleased(frameState,'border',bellframeId,bellframeStart-1),'Unowned frame is hidden before Frostfall');
ok(profileCosmeticReleased(frameState,'border',bellframeId,bellframeStart),'Frame previews during Frostfall');
ok(!canUseProfileCosmetic(frameState,'border',bellframeId),'Unowned border cannot be equipped');
const framePurchased=purchaseEventOffer(frameState,bellframeOffer,bellframeEnd);
ok(framePurchased.account.eventCurrencyBalanceById?.[frostId]===3000,'Frame costs exactly 3000 Frostbell Tokens in claim grace');
ok(canUseProfileCosmetic(framePurchased,'border',bellframeId),'Frame ownership is stored on the account');
ok(profileCosmeticReleased(framePurchased,'border',bellframeId,bellframeGrace),'Earned frame persists after the festival');
ok(!profileCosmeticReleased(frameState,'border',bellframeId,bellframeGrace),'Unowned frame is hidden after the grace period');
ok(!profileCosmeticReleased(frameState,'background','bg_frostfall',bellframeStart-1),'Unowned Frostfall background hidden before launch');
ok(profileCosmeticReleased(frameState,'background','bg_frostfall',bellframeStart),'Unowned Frostfall background becomes discoverable at launch');
ok(!profileCosmeticReleased(frameState,'background','bg_frostfall',bellframeGrace),'Unowned Frostfall background hidden after grace');
const backgroundOwner={...frameState,account:{...frameState.account,liveEvent:undefined,unlockedProfileBackgroundIds:['bg_frostfall']}};
ok(profileCosmeticReleased(backgroundOwner,'background','bg_frostfall',bellframeGrace)&&canUseProfileCosmetic(backgroundOwner,'background','bg_frostfall'),'Owned Frostfall background remains available after closure');
let frameReplayBlocked=false;try{purchaseEventOffer(framePurchased,bellframeOffer,bellframeEnd)}catch{frameReplayBlocked=true}
ok(frameReplayBlocked,'One-time frame purchase cannot spend currency twice');
let frameLateBlocked=false;try{purchaseEventOffer(frameState,bellframeOffer,bellframeGrace)}catch{frameLateBlocked=true}
ok(frameLateBlocked,'Frame purchase closes at the exact claim deadline');
ok(!equipmentShopTierUnlocked(frost,4),'New characters cannot buy T4 equipment materials');
const bundleId='frostfall_sunstone_ingot_100';
let earlyMaterialBlocked=false;
try{purchaseEventOffer({...frost,account:{...frost.account,eventCurrencyBalanceById:{[frostId]:50000}}},bundleId,frostTime)}catch{earlyMaterialBlocked=true;}
ok(earlyMaterialBlocked,'Tier-locked Frostfall purchases are rejected before charging currency');
frost={...frost,character:{...frost.character!,level:100},skills:frost.skills.map(skill=>({...skill,level:100})),account:{...frost.account,eventCurrencyBalanceById:{[frostId]:50000}}};
ok(equipmentShopTierUnlocked(frost,4),'High-level Smithing or Tailoring unlocks T4 equipment bundles');
const bankBefore=frost.bank.stacks.find(row=>row.itemId==='SUNSTONE_INGOT')?.quantity??0;
frost=purchaseEventOffer(frost,bundleId,frostTime);
ok((frost.bank.stacks.find(row=>row.itemId==='SUNSTONE_INGOT')?.quantity??0)===bankBefore+100,'Resource purchase deposits exactly 100 items in the shared Bank');
ok(frost.account.eventCurrencyBalanceById?.[frostId]===50000-2800,'The server-authored Frostfall bundle price is deducted once');
ok(eventOfferPurchaseCount(frost,frostId,bundleId,frostTime)===1,'One bundle purchased in the current UTC week');
let weeklyLimitBlocked=false;try{purchaseEventOffer(frost,bundleId,frostTime+1000)}catch{weeklyLimitBlocked=true}
ok(weeklyLimitBlocked,'A second bundle of the same type is blocked until the next UTC week');
const nextWeek=frostTime+7*86400_000;
ok(eventOfferPurchaseCount(frost,frostId,bundleId,nextWeek)===0,'Resource limit resets at the next UTC week');
frost=purchaseEventOffer(frost,bundleId,nextWeek);
ok((frost.bank.stacks.find(row=>row.itemId==='SUNSTONE_INGOT')?.quantity??0)===bankBefore+200,'Next-week purchase stacks another 100 items');
const fullBank={...frost,bank:{...frost.bank,capacity:1,stacks:[{itemId:'SOME_OTHER_MATERIAL',quantity:1}]}};
const currencyBefore=fullBank.account.eventCurrencyBalanceById?.[frostId];
let bankFullBlocked=false;try{purchaseEventOffer(fullBank,'frostfall_moss_fiber_100',nextWeek)}catch{bankFullBlocked=true}
ok(bankFullBlocked&&fullBank.account.eventCurrencyBalanceById?.[frostId]===currencyBefore,'A full Bank cannot consume currency or deliver a partial grant');

// Calendar-accurate Frostfall gifts: Dec 3–26 UTC is 24 playable days.
// The -25% future-event common currency adjustment applies to each daily gift,
// but never to the three weekly Day-7 Aurora Chimes.
const frostGiftStartMs=Date.UTC(2026,11,3);
const frostGiftEndMs=Date.UTC(2026,11,27);
let frostGiftJourney=createCharacter(newGame(frostGiftStartMs),'IRONWARDEN','FrostGiftTester');
frostGiftJourney={...frostGiftJourney,account:{...frostGiftJourney.account,liveEvent:{eventId:frostId,enabled:true,startsAtMs:frostGiftStartMs,endsAtMs:frostGiftEndMs,graceEndsAtMs:Date.UTC(2026,11,29)}}};
for(let day=0;day<24;day++){
 const at=frostGiftStartMs+day*86_400_000+12*3_600_000;
 const gift=eventDailyGift(frostGiftJourney,at);
 ok(Boolean(gift)&&gift?.giftDay===day%7+1,'Frostfall daily gift must cycle over 24 UTC playable days');
 frostGiftJourney=claimEventDailyGift(frostGiftJourney,at);
 ok(eventDailyGift(frostGiftJourney,at)?.claimed===true,'Frostfall daily gifts are one claim per UTC day');
}
ok(eventProgress(frostGiftJourney,frostId)===4609,'All 24 Frostfall gifts grant exactly 4,609 Reputation after -25% adjustment');
ok(eventPrestigeBalance(frostGiftJourney,frostId)===3,'Three Day-7 gifts grant exactly 3 unmodified Aurora Chimes');
ok(!eventDailyGift(frostGiftJourney,frostGiftEndMs),'No new Frostfall gift may be generated during the claim-only period');

console.log(JSON.stringify({status:'PASS',event:'Veilbreak',progress:eventProgress(state,eventId)},null,2));
