import { strict as assert } from 'node:assert';
import { eventExpeditionPreviews } from '../event-expeditions';

const summer=eventExpeditionPreviews(Date.UTC(2026,6,15));
assert.equal(summer.find(item=>item.id==='EVENT_SUNCREST_SHATTERED_ISLES')?.scheduled,true);
assert.equal(summer.find(item=>item.id==='EVENT_STARFALL_ASTRAL_RIFT')?.scheduled,false);

const starfall=eventExpeditionPreviews(Date.UTC(2026,7,15));
assert.equal(starfall.find(item=>item.id==='EVENT_STARFALL_ASTRAL_RIFT')?.scheduled,true);

const halloween=eventExpeditionPreviews(Date.UTC(2026,9,31));
assert.equal(halloween.find(item=>item.id==='EVENT_VEILBREAK_HOLLOW_BELFRY')?.scheduled,true);
assert.equal(halloween.find(item=>item.id==='EVENT_MERCHANT_BROKEN_TOLLHOUSE')?.scheduled,false);

const newYearsEve=eventExpeditionPreviews(Date.UTC(2026,11,31));
const newYear=eventExpeditionPreviews(Date.UTC(2027,1,2));
const afterTurning=eventExpeditionPreviews(Date.UTC(2027,1,12));
assert.equal(newYearsEve.find(item=>item.id==='EVENT_TURNING_VAULT_LAST_HOUR')?.scheduled,true,'Turning should open before midnight');
assert.equal(newYear.find(item=>item.id==='EVENT_TURNING_VAULT_LAST_HOUR')?.scheduled,true,'Turning should stay open across the year boundary');
assert.equal(afterTurning.find(item=>item.id==='EVENT_TURNING_VAULT_LAST_HOUR')?.scheduled,false,'Turning should close after January 4');

const heartbond=eventExpeditionPreviews(Date.UTC(2027,1,14));
assert.equal(heartbond.find(item=>item.id==='EVENT_HEARTBOND_GARDEN_BROKEN_VOWS')?.scheduled,true);
const bloomwake=eventExpeditionPreviews(Date.UTC(2027,2,25));
assert.equal(bloomwake.find(item=>item.id==='EVENT_BLOOMWAKE_ELDERBLOOM_HOLLOW')?.scheduled,true);

assert.ok(bloomwake.every(item=>item.status==='preview'),'event routes remain preview-only until online event-run transport exists');
console.log('event expedition schedule tests passed');
