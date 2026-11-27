import {winterHearthDonationTrack,winterHearthUnlockedStock,winterHearthMaxDonation,WINTER_HEARTH_LOG_IDS} from '../src/core/winter-hearth-donations';
import type {GameState} from '../src/core/types';
import {validateWinterHearthBonusWindows,winterHearthBonusesAt,winterHearthXpFactorForActionTimes} from '../src/core/winter-hearth-bonus-windows';
import {ITEMS} from '../src/content/items';
import {RECIPES} from '../src/content/skills';
import {WINTER_HEARTH_GUILD_RELEASED,FROSTFALL_REWARDS_RELEASED} from '../src/core/release-flags';
import {WINTER_HEARTH_2026_ID,WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID,WINTER_HEARTH_LIGHT_RECIPE_IDS,isWinterHearthLightRecipe,winterHearthContentVisible} from '../src/core/winter-hearth-2026';

function ok(value:unknown,message:string){if(!value)throw new Error(message);}

ok(WINTER_HEARTH_GUILD_RELEASED&&FROSTFALL_REWARDS_RELEASED,
 'The approved Frostfall and Winter Hearth definitions must ship together.');
ok(!ITEMS.some(item=>item.id==='FROSTFALL_WISP_GLOW_2026')&&ITEMS.some(item=>item.id===WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID),'Only the approved Christmas Lights definition ships.');
ok(WINTER_HEARTH_LIGHT_RECIPE_IDS.length===2&&WINTER_HEARTH_LIGHT_RECIPE_IDS.every(isWinterHearthLightRecipe),'Both profession routes use the same seasonal recipe guard.');
ok(WINTER_HEARTH_LIGHT_RECIPE_IDS.every(id=>RECIPES.some(recipe=>recipe.id===id)),'Both seasonal recipes ship for save compatibility.');
const noRuntime={account:{liveEvent:undefined}} as Pick<GameState,'account'>;
const liveRuntime={account:{liveEvent:{eventId:WINTER_HEARTH_2026_ID,enabled:true,startsAtMs:Date.parse('2026-12-03T00:00:00Z'),endsAtMs:Date.parse('2026-12-27T00:00:00Z')}}} as Pick<GameState,'account'>;
ok(!winterHearthContentVisible(noRuntime)&&winterHearthContentVisible(liveRuntime),'Client discovery follows the authoritative server runtime, not the calendar alone.');

const milestoneWindows=validateWinterHearthBonusWindows([
 {percent:25,startsAt:'2026-12-04T00:00:00Z',endsAt:'2026-12-27T00:00:00Z',gatheringSpeedBps:400,skillXpBps:0,combatXpBps:0},
 {percent:50,startsAt:'2026-12-10T00:00:00Z',endsAt:'2026-12-27T00:00:00Z',gatheringSpeedBps:400,skillXpBps:600,combatXpBps:0},
 {percent:75,startsAt:'2026-12-15T00:00:00Z',endsAt:'2026-12-27T00:00:00Z',gatheringSpeedBps:400,skillXpBps:600,combatXpBps:600},
 {percent:100,startsAt:'2026-12-20T00:00:00Z',endsAt:'2026-12-27T00:00:00Z',gatheringSpeedBps:1000,skillXpBps:1000,combatXpBps:1000},
]);
const at=(s:string)=>Date.parse(s);
ok(winterHearthBonusesAt(milestoneWindows,at('2026-12-03T23:59:59Z')).gatheringSpeedBps===0,
 'Before milestone completion, no gathering speed boost exists.');
ok(winterHearthBonusesAt(milestoneWindows,at('2026-12-04T00:00:00Z')).gatheringSpeedBps===400,
 'The first milestone grants 4% speed from its exact UTC timestamp.');
ok(winterHearthBonusesAt(milestoneWindows,at('2026-12-10T00:00:00Z')).skillXpBps===600,
 'The second milestone grants 6% Skill XP, not 10%.');
ok(winterHearthBonusesAt(milestoneWindows,at('2026-12-20T00:00:00Z')).combatXpBps===1000,
 'The final milestone upgrades combat XP to exactly 10%.');
ok(winterHearthBonusesAt(milestoneWindows,at('2026-12-27T00:00:00Z')).combatXpBps===0,
 'All temporal bonuses expire exactly at the event end; guild color remains persistent.');
const halfBefore=at('2026-12-09T23:59:59Z'),halfAfter=at('2026-12-10T00:00:00Z');
ok(winterHearthXpFactorForActionTimes(milestoneWindows,[halfBefore,halfAfter],'skill')===1.03,
 'A two-action offline claim across 50% threshold receives exactly half of the 6% Skill XP boost.');
ok(winterHearthXpFactorForActionTimes(milestoneWindows,[],'skill')===1,
 'No verified actions implies no bonus, even when a guild has completed the event.');
let forgedRejected=false;
try{validateWinterHearthBonusWindows([{percent:100,startsAt:'2026-12-20T00:00:00Z',endsAt:'2026-12-27T00:00:00Z',gatheringSpeedBps:2500,skillXpBps:1000,combatXpBps:1000}]);}catch{forgedRejected=true;}
ok(forgedRejected,'Impossible +25% Guild bonus must be rejected, not clamped into a payout.');

console.log('winter hearth 2026 source-gated crafting and bonus tests passed');

const stock={inventory:{capacity:20,stacks:[{itemId:'GREENWOOD_LOG',quantity:100},{itemId:'GREENWOOD_LOG',quantity:50},{itemId:'IRONWOOD_LOG',quantity:40,locked:true},{itemId:'CROWNWOOD_LOG',quantity:30},{itemId:WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID,quantity:90}]},settings:{lockedItemIds:['CROWNWOOD_LOG']}} as Pick<GameState,'inventory'|'settings'>;
ok(WINTER_HEARTH_LOG_IDS.length===6&&WINTER_HEARTH_LOG_IDS.every(id=>winterHearthDonationTrack(id)==='logs'),'Six approved wood IDs share one donation track.');
ok(winterHearthDonationTrack('FROSTFALL_WISP_GLOW_2026')===null,'Retired seasonal item is never donatable.');
ok(winterHearthUnlockedStock(stock,'GREENWOOD_LOG')===150,'Unlocked stacks combine.');
ok(winterHearthUnlockedStock(stock,'IRONWOOD_LOG')===0&&winterHearthUnlockedStock(stock,'CROWNWOOD_LOG')===0,'Both stack and item locks block donations.');
ok(winterHearthUnlockedStock(stock,WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID)===90,'Crafted lights can be donated.');
ok(winterHearthMaxDonation(150,100,80)===80&&winterHearthMaxDonation(150,10,80)===10,'Guild and weekly limits constrain available stock.');
ok(winterHearthMaxDonation(150,100,0)===0&&winterHearthMaxDonation(150,-1,80)===0&&winterHearthMaxDonation(NaN,100,80)===0,'Full goals and invalid limits fail closed.');

import {winterHearthStageFromProgress} from '../src/core/winter-hearth-2026';
for(const p of [25,50,75,100] as const){ok(winterHearthStageFromProgress(p*250,p*25)===p,'Joint threshold selects exact scene');ok(winterHearthStageFromProgress(p*250-1,p*25)<p&&winterHearthStageFromProgress(p*250,p*25-1)<p,'Neither resource track alone advances the scene');}
ok(winterHearthStageFromProgress(NaN,2500)===0,'Invalid progress uses initial scene');

import {winterHearthQuickDonation,winterHearthValidQuantity} from '../src/core/winter-hearth-donations';
for(const track of ['logs','lights'] as const){const preset=track==='logs'?250:50,cap=track==='logs'?2500:250;ok(winterHearthQuickDonation(track,'preset',cap)===preset,'Approved shortcut');ok(winterHearthQuickDonation(track,'preset',3)===3,'Shortcut clamps to remaining stock');ok(winterHearthQuickDonation(track,'Max',99999)===cap,'Maximum remains capped');ok(winterHearthQuickDonation(track,'Half',1)===1,'One remaining can be donated');ok(winterHearthQuickDonation(track,'Max',0)===0,'Full track cannot be donated to');}
for(const bad of ['','0','-1','1.5','1e2',' 1','2501','NaN'])ok(!winterHearthValidQuantity(bad,2500),'Reject invalid/over-cap quantity');
ok(winterHearthValidQuantity('250',2500)&&winterHearthValidQuantity('50',250),'Approved quantities valid');
console.log('PASS Winter Hearth quantity presets and boundary validation');

import {winterHearthReceiptMatches} from '../src/core/winter-hearth-donations';
const request={guildId:'qa-guild',itemId:WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID,quantity:50,weekStartUtc:'2026-12-07'};
const donationReceipt={...request,track:'lights',alreadyProcessed:false,logs:12500,lights:1250,newMilestones:[50],newGuildGold:20000,newPermanentColor:false};
ok(winterHearthReceiptMatches(donationReceipt,request),'Confirmed donation and exact milestone gold');
ok(winterHearthReceiptMatches({...donationReceipt,alreadyProcessed:true},request),'Lost ACK replay retains original immutable receipt');
for(const invalid of [{...donationReceipt,guildId:'another-guild'},{...donationReceipt,quantity:51},{...donationReceipt,weekStartUtc:'2026-12-14'},{...donationReceipt,lights:1249},{...donationReceipt,logs:12501.5},{...donationReceipt,newMilestones:[50,50],newGuildGold:40000},{...donationReceipt,newGuildGold:20001},{...donationReceipt,newPermanentColor:true},{...donationReceipt,alreadyProcessed:'false'}])ok(!winterHearthReceiptMatches(invalid,request),'Malformed or mismatched receipt retains saved request');
ok(winterHearthReceiptMatches({...donationReceipt,logs:25000,lights:2500,newMilestones:[100],newGuildGold:50000,newPermanentColor:true},request),'Final threshold includes permanent name color');
console.log('PASS donation receipt, replay and exact milestone entitlement validation');

import {winterHearthCraftSettlementWindow,WINTER_HEARTH_2026_END_MS} from '../src/core/winter-hearth-2026';
const finish=WINTER_HEARTH_2026_END_MS;
const windowAt=(nowMs:number,extra:Partial<Parameters<typeof winterHearthCraftSettlementWindow>[0]>={})=>winterHearthCraftSettlementWindow({lastClaimAtMs:finish-80000,nowMs,offlineCapSeconds:3600,released:true,...extra});
ok(windowAt(finish-1).elapsedSeconds===79.999&&!windowAt(finish-1).expired,'Last eligible millisecond is inside season');
ok(windowAt(finish).expired&&windowAt(finish+86400000).elapsedSeconds===79.999,'Expiry excludes exact boundary and all later cycles');
ok(windowAt(finish,{savedEndMs:finish-40000}).elapsedSeconds===39.999,'Saved earlier deadline is never extended');
ok(windowAt(finish,{runtimeEndMs:finish-40000}).elapsedSeconds===39.999,'Runtime can shorten deadline');
ok(windowAt(finish,{released:false}).elapsedSeconds===0,'Hidden build cannot mint seasonal outputs');
ok(windowAt(finish,{lastClaimAtMs:finish+1000}).elapsedSeconds===0,'Late settlement cannot create negative time');
ok(winterHearthXpFactorForActionTimes(milestoneWindows,[finish-1,finish],'skill')===1.05,'Offline skill XP splits exactly at expiry');
ok(winterHearthXpFactorForActionTimes(milestoneWindows,[finish-1,finish],'combat')===1.05,'Offline combat XP splits exactly at expiry');
