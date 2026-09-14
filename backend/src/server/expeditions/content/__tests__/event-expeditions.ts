import { strict as assert } from 'node:assert';
import { eventExpeditionPreviews } from '../event-expeditions';

const summer=eventExpeditionPreviews(Date.UTC(2026,6,15));
assert.equal(summer.find(item=>item.id==='EVENT_SUNCREST_SHATTERED_ISLES')?.scheduled,true);
assert.equal(summer.find(item=>item.id==='EVENT_STARFALL_ASTRAL_RIFT')?.scheduled,false);
const starfall=eventExpeditionPreviews(Date.UTC(2026,8,15));
assert.equal(starfall.find(item=>item.id==='EVENT_STARFALL_ASTRAL_RIFT')?.scheduled,true);
assert.ok(starfall.every(item=>item.status==='preview'),'event routes remain non-startable until transport exists');
console.log('event expedition schedule tests passed');
