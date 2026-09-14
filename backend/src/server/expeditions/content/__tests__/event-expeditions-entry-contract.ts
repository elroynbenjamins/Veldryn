import { strict as assert } from 'node:assert';
import { EVENT_EXPEDITIONS } from '../event-expeditions';

for(const event of EVENT_EXPEDITIONS){
 assert.equal(new Set(event.routeHighlights).size,3);
 assert.ok(event.minLevel>0&&event.rewardMarks>0);
 assert.ok(event.startMonth>=1&&event.endMonth<=12);
}
console.log('event expedition entry contract passed');
