import {assert} from './test-assert';
import {combatTimeline} from '../src/core/combat-timing';
import {eventCandyStatus,eventCandyWindow} from '../src/core/live-events';
import {liveEventDef,eventCandies} from '../src/content/live-events';
import {claimActivity,combatSustainProjection,effectiveStats,previewActivityReward,startGathering,createCharacter,newGame,offlineCapSeconds} from '../src/core/game';
import {REGIONAL_COMBAT_FIXTURES,regionalCombatFixture} from '../src/core/regional-combat-fixtures';
import type {GameState} from '../src/core/types';
import {CLASSES} from '../src/content/classes';

const T=Date.UTC(2026,9,1,12),H=3600000;
const options={startsAtMs:T,elapsedSeconds:1000,progressFraction:.3,preparationEncounters:3,cycleSeconds:17,preparedCycleSeconds:13,candy:{startsAtMs:T+20_000,endsAtMs:T+220_000}};
const whole=combatTimeline(options);
for(const split of [1,19,20,21,219,220,221,500,999]){
 const first=combatTimeline({...options,elapsedSeconds:split});
 const used=first.encounters.filter(row=>row.prepared).length;
 const second=combatTimeline({...options,startsAtMs:T+split*1000,elapsedSeconds:1000-split,progressFraction:first.nextProgressFraction,preparationEncounters:3-used});
 const merged=[...first.encounters,...second.encounters];
 assert.equal(merged.length,whole.encounters.length,'claim timing must not change completed encounters');
 for(let i=0;i<merged.length;i++){
  assert.ok(Math.abs(merged[i].atMs-whole.encounters[i].atMs)<.01,'completion timestamps must survive split claims');
  assert.equal(merged[i].prepared,whole.encounters[i].prepared);
  assert.equal(merged[i].candy,whole.encounters[i].candy);
 }
 assert.ok(Math.abs(second.nextProgressFraction-whole.nextProgressFraction)<1e-7);
}
assert.equal(whole.encounters.filter(row=>row.prepared).length,3,'exactly three encounters receive three potion uses');
assert.ok(whole.encounters.some(row=>row.candy)&&whole.encounters.some(row=>!row.candy),'candy starts and expires within a batch');
const empty=combatTimeline({...options,elapsedSeconds:0});assert.equal(empty.encounters.length,0);assert.equal(empty.nextProgressFraction,.3);

const region=REGIONAL_COMBAT_FIXTURES.at(-1)!;
function fixture():GameState{
 const s=regionalCombatFixture(region,'prepared','WAYFINDER');
 s.character!.currentHp=effectiveStats(s).hp;s.inventory.stacks=[{itemId:region.foodId,quantity:10000}];
 s.activity={kind:'combat',targetId:region.monsterId,combatTacticId:'balanced',startedAtMs:T,lastClaimAtMs:T};return s;
}
const base=fixture(),one=fixture(),full=fixture();
one.character!.preparation={itemId:'OATH_WARD_TONIC',remainingEncounters:1};full.character!.preparation={itemId:'OATH_WARD_TONIC',remainingEncounters:60};
const bare=previewActivityReward(base,T+8*H),single=previewActivityReward(one,T+8*H),many=previewActivityReward(full,T+8*H);
assert.equal(single.preparationEncounters,1);assert.equal(many.preparationEncounters,60);
assert.equal(single.kills,bare.kills,'ward does not increase hunt speed');
assert.ok((bare.foodConsumed!-single.foodConsumed!)<=1,'one ward use must not save food across an entire batch');
assert.ok(many.foodConsumed!<single.foodConsumed!,'sixty uses protect more than one use');
const settled=claimActivity(one,T+8*H);assert.ok(!settled.state.character!.preparation,'spent potion must be cleared');
assert.equal(claimActivity(settled.state,T+8*H).reward.kills,0,'retry must not award more kills');

const eventId='EVT_ANNUAL_009_2026',candy=eventCandies(liveEventDef(eventId)!).find(row=>row.kind==='combat')!;
const event=fixture();event.account.liveEvent={eventId,enabled:true,startsAtMs:T-H,endsAtMs:T+24*H};
event.character!.activeEventCandies={combat:{eventId,itemId:candy.id,remainingSeconds:7200,lastUpdatedAtMs:T}};
assert.ok(eventCandyStatus(event,T+H,'combat').active);assert.ok(!eventCandyStatus(event,T+3*H,'combat').active);
assert.ok(!eventCandyStatus(event,T-1,'combat').active,'a candy cannot apply before consumption');
assert.equal(eventCandyWindow(event,'combat')!.endsAtMs,T+2*H);
const boosted=previewActivityReward(event,T+3*H),normal=previewActivityReward(base,T+3*H);
assert.ok(boosted.kills>normal.kills,'expired candy retains kills earned while active');
assert.ok(boosted.xp>normal.xp,'expired candy retains earned XP');
const capped=previewActivityReward(event,T+offlineCapSeconds(event)*1000),late=previewActivityReward(event,T+(offlineCapSeconds(event)+86400)*1000);
assert.equal(late.kills,capped.kills,'claiming after the offline cap must preserve the same earned candy interval');
assert.equal(late.xp,capped.xp);
const earlyEnd=structuredClone(event);earlyEnd.account.liveEvent!.endsAtMs=T+H;
assert.equal(eventCandyWindow(earlyEnd,'combat')!.endsAtMs,T+H,'festival end clips candy duration');
const endedReward=previewActivityReward(earlyEnd,T+3*H);
assert.ok(endedReward.kills>normal.kills&&endedReward.kills<=boosted.kills,'offline event-end boundary preserves only earned boost');
const allUnits=(endedReward.eventDrops??[]).reduce((sum,row)=>sum+(row.units??0),0);
assert.ok(allUnits>0&&allUnits<endedReward.kills,'event currency only counts completions during the event');

const gather=startGathering(createCharacter(newGame(T),'IRONWARDEN','Candy timing'),'GREENWOOD_TREE',T),skillCandy=eventCandies(liveEventDef(eventId)!).find(row=>row.kind==='skill')!;
const gatherCandy=structuredClone(gather);gatherCandy.account.liveEvent=event.account.liveEvent;
gatherCandy.character!.activeEventCandies={skill:{eventId,itemId:skillCandy.id,remainingSeconds:7200,lastUpdatedAtMs:T}};
const gatherPlain=previewActivityReward(gather,T+3*H),gatherBoost=previewActivityReward(gatherCandy,T+3*H);
assert.ok(gatherBoost.kills>gatherPlain.kills&&gatherBoost.xp>gatherPlain.xp,'skill candy must also retain its earned speed and XP after expiry');
const exploration=structuredClone(gatherCandy);exploration.activity={kind:'exploration',targetId:'SCOUT_GREENFIELDS',startedAtMs:T,lastClaimAtMs:T};
const explorationBase=structuredClone(exploration);explorationBase.character!.activeEventCandies=undefined;
assert.ok(previewActivityReward(exploration,T+3*H).xp>previewActivityReward(explorationBase,T+3*H).xp,'exploration retains skill-candy XP earned before expiry');

const forecast=combatSustainProjection(base,region.monsterId,8)!;
assert.ok(Math.abs(bare.foodConsumed!-forecast.projectedFood)<effectiveStats(base).hp/forecast.healingPerFood+3,'forecast and settlement differ only by starting HP, food rounding and champions');
for(const earlyRegion of REGIONAL_COMBAT_FIXTURES.slice(0,5))for(const cls of CLASSES){
 const projected=combatSustainProjection(regionalCombatFixture(earlyRegion,'prepared',cls.id),earlyRegion.monsterId)!;
 assert.ok(projected.foodPerHour<=projected.target.foodPerHourMax*1.08,`${earlyRegion.regionName}/${cls.id} must stay near the authored prepared food budget`);
 assert.ok(projected.foodPerHour>0,'prepared builds still need supplies');
}
console.log('PASS combat potion charges, timed candy, split encounters, event boundaries and food forecasts');
