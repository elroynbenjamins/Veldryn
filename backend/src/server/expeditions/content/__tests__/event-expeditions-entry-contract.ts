import { strict as assert } from 'node:assert';
import { EVENT_EXPEDITIONS } from '../event-expeditions';
import { EVENT_ENCOUNTERS } from '../../../combat/content/event-encounters';

for(const event of EVENT_EXPEDITIONS){
 assert.equal(new Set(event.routeHighlights).size,3);
 assert.equal(event.enemyNames.length,3);
 assert.equal(new Set(event.enemyNames).size,3);
 assert.ok(event.enemyNames.every(name=>name.length>=4));
 assert.ok(event.finalBoss.length>=4);
 assert.ok(/^EVENT_[A-Z0-9_]+$/.test(event.encounterPrefix));
 assert.ok(/^EVENT_[A-Z0-9_]+_BOSS$/.test(event.bossEncounterId));
 assert.ok(event.minLevel>0&&event.rewardMarks>0);
 assert.ok(event.startMonth>=1&&event.startMonth<=12&&event.endMonth>=1&&event.endMonth<=12);
 for(const encounterId of [1,2,3].map(index=>`${event.encounterPrefix}_BATTLE_0${index}`))assert.ok(EVENT_ENCOUNTERS[encounterId],`${encounterId} should have combat content`);
 assert.ok(EVENT_ENCOUNTERS[event.bossEncounterId],`${event.bossEncounterId} should have boss combat content`);
}
assert.ok(EVENT_EXPEDITIONS.some(event=>event.id==='EVENT_VEILBREAK_HOLLOW_BELFRY'));
assert.ok(EVENT_EXPEDITIONS.some(event=>event.id==='EVENT_MERCHANT_BROKEN_TOLLHOUSE'));
assert.ok(EVENT_EXPEDITIONS.some(event=>event.id==='EVENT_FROSTFALL_AURORA_BELLFOUNDRY'));
assert.ok(EVENT_EXPEDITIONS.some(event=>event.id==='EVENT_TURNING_VAULT_LAST_HOUR'));
assert.ok(EVENT_EXPEDITIONS.some(event=>event.id==='EVENT_HEARTBOND_GARDEN_BROKEN_VOWS'));
assert.ok(EVENT_EXPEDITIONS.some(event=>event.id==='EVENT_BLOOMWAKE_ELDERBLOOM_HOLLOW'));
console.log('event expedition entry contract passed');
