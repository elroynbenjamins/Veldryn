import {validateWinterHearthBonusWindows,winterHearthBonusesAt,winterHearthXpFactorForActionTimes} from '../src/core/winter-hearth-bonus-windows';
import {ITEMS} from '../src/content/items';
import {RECIPES} from '../src/content/skills';
import {WINTER_HEARTH_GUILD_RELEASED,FROSTFALL_REWARDS_RELEASED} from '../src/core/release-flags';
import {
 frostfallWispDrops,WINTER_HEARTH_2026_ID,WINTER_HEARTH_2026_START_MS,
 WINTER_HEARTH_2026_END_MS,WINTER_HEARTH_WISP_ITEM_ID,
 WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID,
} from '../src/core/winter-hearth-2026';

function ok(value:unknown,message:string){if(!value)throw new Error(message);}

ok(!WINTER_HEARTH_GUILD_RELEASED&&!FROSTFALL_REWARDS_RELEASED,
 'Frostfall guild bonuses and items must remain release-gated.');
ok(!ITEMS.some(item=>item.id===WINTER_HEARTH_WISP_ITEM_ID||item.id===WINTER_HEARTH_CHRISTMAS_LIGHTS_ITEM_ID),
 'Event-specific resources must not appear in the current live item catalog.');
ok(!RECIPES.some(recipe=>recipe.id==='CRAFT_FROSTFALL_CHRISTMAS_LIGHTS_2026'),
 'The new seasonal Smithing recipe cannot appear until the separate event launch.');
const base={
 released:true,guildMember:true,eventEnabled:true,eventId:WINTER_HEARTH_2026_ID,
 eventStartsAtMs:WINTER_HEARTH_2026_START_MS,eventEndsAtMs:WINTER_HEARTH_2026_END_MS,
 skillId:'fishing',seed:'frostfall-2026-review-source',
 actionTimesMs:Array.from({length:5000},(_,index)=>WINTER_HEARTH_2026_START_MS+index*1000),
};
const fish=frostfallWispDrops(base);
ok(fish>=150&&fish<=350,'Fishing should return a plausible 5% Wisp Glow drop rate.');
ok(fish===frostfallWispDrops(base),'Wisp Glow rolls should replay deterministically.');
const wood=frostfallWispDrops({...base,skillId:'woodcutting'});
ok(wood>=55&&wood<=145,'Woodcutting should return a plausible 2% Wisp Glow drop rate.');
for(const skillId of ['mining','herbalism','smithing','combat']){
 ok(frostfallWispDrops({...base,skillId})===0,'Only Fishing and Woodcutting should grant Wisp Glow.');
}
for(const denied of [
 {...base,released:false},
 {...base,guildMember:false},
 {...base,eventEnabled:false},
 {...base,eventId:'EVT_ANNUAL_010_2026'},
 {...base,eventStartsAtMs:WINTER_HEARTH_2026_END_MS},
 {...base,eventEndsAtMs:WINTER_HEARTH_2026_START_MS},
]){
 ok(frostfallWispDrops(denied)===0,'An unreleased, expired or guildless session must grant no seasonal material.');
}
ok(frostfallWispDrops({...base,actionTimesMs:[WINTER_HEARTH_2026_START_MS-1,WINTER_HEARTH_2026_END_MS]})===0,
 'Offline events outside the exact UTC event window must grant no Wisp Glow.');

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

console.log('winter hearth 2026 source-gated gathering drop tests passed');
