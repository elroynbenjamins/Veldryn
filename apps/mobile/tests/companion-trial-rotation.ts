import {strict as assert} from 'node:assert';
import {COMPANION_TRIAL_ROTATIONS,COMPANION_WEEKLY_CHALLENGES,companionTrialRotation,companionTrialSeasonDefinition} from '../../../backend/src/server/companions/content';
import {companionTrialSeasonKey} from '../../../backend/src/server/companions/trial-season';

assert.equal(COMPANION_TRIAL_ROTATIONS.length,6,'launch should use six global monthly rotations');
assert.equal(new Set(COMPANION_TRIAL_ROTATIONS.map(r=>r.id)).size,6);
assert.equal(new Set(COMPANION_TRIAL_ROTATIONS.map(r=>r.name)).size,6);

const months=['2026-09','2026-10','2026-11','2026-12','2027-01','2027-02'];
const ids=months.map(month=>companionTrialRotation(month).id);
assert.equal(new Set(ids).size,6,'September-February must cover all six rotations once');
assert.equal(companionTrialRotation('2027-03').id,companionTrialRotation('2026-09').id,'March repeats rotation 1 after six months');

const affinityTypes=new Set(['require_affinity','prohibit_affinity','affinity_diversity','affinity_unique']);
for(const month of months){
 const season=companionTrialSeasonDefinition(month);
 assert.equal(season.rotationId,companionTrialRotation(month).id);
 assert.equal(season.specialChallenges.length,3);
 assert.ok(season.specialChallenges.some(id=>COMPANION_WEEKLY_CHALLENGES.find(c=>c.id===id)?.restrictions.some(r=>affinityTypes.has(r.type))),month+' needs an Affinity objective');
}

assert.equal(companionTrialSeasonKey(Date.UTC(2026,8,30,23,59,59)),'2026-09');
assert.equal(companionTrialSeasonKey(Date.UTC(2026,9,1,0,0,0)),'2026-10');
assert.equal(companionTrialSeasonDefinition('2026-10').startsAt,'2026-10-01T00:00:00.000Z');
assert.equal(companionTrialSeasonDefinition('2026-10').endsAt,'2026-11-01T00:00:00.000Z');
console.log('PASS six deterministic global UTC Companion Trial rotations');
