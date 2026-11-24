import {winterHearthDonationTrack,winterHearthUnlockedStock,winterHearthMaxDonation,WINTER_HEARTH_LOG_IDS} from '../src/core/winter-hearth-donations';
import type {GameState} from '../src/core/types';
import {validateWinterHearthBonusWindows,winterHearthBonusesAt,winterHearthXpFactorForActionTimes} from '../src/core/winter-hearth-bonus-windows';
import {ITEMS} from '../src/content/items';
import {RECIPES} from '../src/content/skills';
import {WINTER_HEARTH_GUILD_RELEASED,FROSTFALL_REWARDS_RELEASED} from '../src/core/release-flags';
import {WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID,WINTER_HEARTH_LIGHT_RECIPE_IDS,isWinterHearthLightRecipe} from '../src/core/winter-hearth-2026';

function ok(value:unknown,message:string){if(!value)throw new Error(message);}

ok(!WINTER_HEARTH_GUILD_RELEASED&&!FROSTFALL_REWARDS_RELEASED,
 'Frostfall guild bonuses and items must remain release-gated.');
ok(!ITEMS.some(item=>item.id==='FROSTFALL_WISP_GLOW_2026'||item.id===WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID),'No new seasonal drop or hidden lights in the live catalog.');
ok(WINTER_HEARTH_LIGHT_RECIPE_IDS.length===2&&WINTER_HEARTH_LIGHT_RECIPE_IDS.every(isWinterHearthLightRecipe),'Both profession routes use the same seasonal recipe guard.');
ok(!RECIPES.some(recipe=>isWinterHearthLightRecipe(recipe.id)),'Both seasonal recipes remain hidden until release.');

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
