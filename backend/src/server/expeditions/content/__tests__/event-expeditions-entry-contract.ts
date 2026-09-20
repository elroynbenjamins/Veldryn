import { strict as assert } from 'node:assert';
import { EVENT_EXPEDITIONS } from '../event-expeditions';

for(const event of EVENT_EXPEDITIONS){
 assert.equal(new Set(event.routeHighlights).size,3);
 assert.ok(event.minLevel>0&&event.rewardMarks>0);
 assert.ok(event.startMonth>=1&&event.endMonth<=12);
 assert.match(event.encounterPrefix,/^EVENT_[A-Z]+$/);
 assert.match(event.bossEncounterId,/^EVENT_[A-Z]+_BOSS$/);
}
assert.equal(EVENT_EXPEDITIONS.length,5);
assert.deepEqual(EVENT_EXPEDITIONS.filter(x=>['Turning of the Age','Heartbond Festival','Bloomwake'].includes(x.eventName)).map(x=>x.routeHighlights.length),[3,3,3]);
console.log('event expedition entry contract passed');
