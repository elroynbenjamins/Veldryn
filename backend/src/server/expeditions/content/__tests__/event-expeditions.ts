import { strict as assert } from 'node:assert';
import { eventExpeditionPreviews } from '../event-expeditions';

const summer=eventExpeditionPreviews(Date.UTC(2026,6,15));
assert.equal(summer.find(item=>item.id==='EVENT_SUNCREST_SHATTERED_ISLES')?.scheduled,true);
assert.equal(summer.find(item=>item.id==='EVENT_STARFALL_ASTRAL_RIFT')?.scheduled,false);
const starfall=eventExpeditionPreviews(Date.UTC(2026,8,15));
assert.equal(starfall.find(item=>item.id==='EVENT_STARFALL_ASTRAL_RIFT')?.scheduled,true);
const turning=eventExpeditionPreviews(Date.UTC(2026,11,31));
assert.equal(turning.find(item=>item.id==='EVENT_TURNING_CHRONICLE_VAULT')?.scheduled,true);
const turningJanuary=eventExpeditionPreviews(Date.UTC(2027,0,3));
assert.equal(turningJanuary.find(item=>item.id==='EVENT_TURNING_CHRONICLE_VAULT')?.scheduled,true);
const heartbond=eventExpeditionPreviews(Date.UTC(2027,1,14));
assert.equal(heartbond.find(item=>item.id==='EVENT_HEARTBOND_VOW_GARDEN')?.scheduled,true);
const bloomwake=eventExpeditionPreviews(Date.UTC(2027,2,28));
assert.equal(bloomwake.find(item=>item.id==='EVENT_BLOOMWAKE_THORNHEART_GROVE')?.scheduled,true);
assert.ok(bloomwake.every(item=>item.status==='preview'),'event routes keep preview metadata until authoritative entry advertises availability');
console.log('event expedition schedule tests passed');
