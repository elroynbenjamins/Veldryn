import { strict as assert } from 'node:assert';
import { EVENT_EXPEDITIONS } from '../event-expeditions';
import { EXPEDITION_ENCOUNTERS } from '../../../combat/content/expedition-encounters';

for(const event of EVENT_EXPEDITIONS){
 assert.equal(new Set(event.routeHighlights).size,3);
 assert.ok(event.minLevel>0&&event.rewardMarks>0);
 assert.ok(event.startMonth>=1&&event.endMonth<=12);
 assert.match(event.liveEventSeriesId,/^EVT_ANNUAL_\d{3}$/);
 assert.match(event.encounterPrefix,/^EVENT_[A-Z]+$/);
 assert.match(event.bossEncounterId,/^EVENT_[A-Z]+_BOSS$/);
 assert.ok(event.routeNodeCount>=5&&event.routeNodeCount<=7);
 assert.ok(event.mechanic.startValue>0&&event.mechanic.startValue<=event.mechanic.maxValue);
 assert.ok(event.mechanic.lowThreshold<event.mechanic.highThreshold&&event.mechanic.highThreshold<=event.mechanic.maxValue);
 assert.ok(event.mechanic.highRewardBonus>0);
 assert.ok(event.specialNodes.length>=6);
 assert.ok(event.specialNodes.every(node=>node.depth>=3&&node.depth<=event.routeNodeCount&&node.choice>=0&&node.choice<=2));
 for(const index of [1,2,3])assert.ok(EXPEDITION_ENCOUNTERS[`${event.encounterPrefix}_BATTLE_0${index}`],`missing battle encounter ${event.encounterPrefix} #${index}`);
 assert.ok(EXPEDITION_ENCOUNTERS[event.bossEncounterId],`missing boss encounter ${event.bossEncounterId}`);
}
assert.equal(EVENT_EXPEDITIONS.length,8);
assert.deepEqual(
 EVENT_EXPEDITIONS.filter(x=>['The Veilbreak','Merchant & Guild Festival','Frostfall Festival','Turning of the Age','Heartbond Festival','Bloomwake'].includes(x.eventName)).map(x=>x.routeHighlights.length),
 [3,3,3,3,3,3]
);
console.log('event expedition entry contract passed');
