import { strict as assert } from 'node:assert';
import { eventExpeditionPreviews } from '../event-expeditions';
import { eventBossMechanicProfile } from '../../event-boss-mechanics';

const summer=eventExpeditionPreviews(Date.UTC(2026,6,15));
assert.equal(summer.find(item=>item.id==='EVENT_SUNCREST_SHATTERED_ISLES')?.scheduled,true);
assert.equal(summer.find(item=>item.id==='EVENT_STARFALL_ASTRAL_RIFT')?.scheduled,false);

const starfall=eventExpeditionPreviews(Date.UTC(2026,8,15));
assert.equal(starfall.find(item=>item.id==='EVENT_STARFALL_ASTRAL_RIFT')?.scheduled,true);

const veilbreak=eventExpeditionPreviews(Date.UTC(2026,9,31));
assert.equal(veilbreak.find(item=>item.id==='EVENT_VEILBREAK_GLOAM_BREACH')?.scheduled,true);
const veilbreakNovember=eventExpeditionPreviews(Date.UTC(2026,10,2));
assert.equal(veilbreakNovember.find(item=>item.id==='EVENT_VEILBREAK_GLOAM_BREACH')?.scheduled,true);
const veilbreakEntry=veilbreakNovember.find(item=>item.id==='EVENT_VEILBREAK_GLOAM_BREACH');
assert.equal(veilbreakEntry?.mechanic.id,'lantern_light');
assert.equal(veilbreakEntry?.objective.id,'ward_lanterns');
assert.equal(veilbreakEntry?.objective.maxCount,3);

const darkVeil=eventBossMechanicProfile({eventId:'EVENT_VEILBREAK_GLOAM_BREACH',objectiveCount:0,objectiveMax:3,mechanicStatus:'critical'});
assert.equal(darkVeil.label,'Blackout Cycle');
assert.equal(darkVeil.tuning.addPhases?.length,3);
assert.ok(darkVeil.tuning.addAbilities?.some(ability=>ability.id==='EVENT_VEILBREAK_BOSS_TOTAL_BLACKOUT'));
assert.deepEqual(darkVeil.tuning.removeAbilityIds??[],[]);

const litVeil=eventBossMechanicProfile({eventId:'EVENT_VEILBREAK_GLOAM_BREACH',objectiveCount:3,objectiveMax:3,mechanicStatus:'strong'});
assert.equal(litVeil.tuning.addPhases?.length,0);
assert.equal(litVeil.tuning.addAbilities?.length,0);
assert.deepEqual(litVeil.tuning.removeAbilityIds,['EVENT_VEILBREAK_BOSS_NOVA']);
assert.equal(litVeil.tone,'benefit');

const merchant=eventExpeditionPreviews(Date.UTC(2026,10,20));
assert.equal(merchant.find(item=>item.id==='EVENT_MERCHANT_GILDED_ROAD')?.scheduled,true);

const frostfall=eventExpeditionPreviews(Date.UTC(2026,11,18));
assert.equal(frostfall.find(item=>item.id==='EVENT_FROSTFALL_AURORA_HOLLOW')?.scheduled,true);

const turning=eventExpeditionPreviews(Date.UTC(2026,11,31));
assert.equal(turning.find(item=>item.id==='EVENT_TURNING_CHRONICLE_VAULT')?.scheduled,true);
const turningJanuary=eventExpeditionPreviews(Date.UTC(2027,0,3));
assert.equal(turningJanuary.find(item=>item.id==='EVENT_TURNING_CHRONICLE_VAULT')?.scheduled,true);

const heartbond=eventExpeditionPreviews(Date.UTC(2027,1,14));
assert.equal(heartbond.find(item=>item.id==='EVENT_HEARTBOND_VOW_GARDEN')?.scheduled,true);

const bloomwake=eventExpeditionPreviews(Date.UTC(2027,2,28));
assert.equal(bloomwake.find(item=>item.id==='EVENT_BLOOMWAKE_THORNHEART_GROVE')?.scheduled,true);

assert.ok(bloomwake.every(item=>item.status==='preview'),'calendar preview never overrides authoritative LiveOps entry state');
console.log('event expedition schedule tests passed');
