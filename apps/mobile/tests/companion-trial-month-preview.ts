import {strict as assert} from 'node:assert';
import {companionTrialNextSeasonKey,companionTrialRotationPreview} from '../../../backend/src/server/companions/trial-season';

assert.equal(companionTrialNextSeasonKey('2026-09'),'2026-10');
assert.equal(companionTrialNextSeasonKey('2026-12'),'2027-01');
const preview=companionTrialRotationPreview(Date.UTC(2026,8,24,12,0,0));
assert.equal(preview.current.seasonKey,'2026-09');
assert.equal(preview.next.seasonKey,'2026-10');
assert.notEqual(preview.current.rotationId,preview.next.rotationId);
assert.equal(preview.current.specialChallenges.length,3);
assert.equal(preview.next.specialChallenges.length,3);
assert.equal(preview.current.endsAt,preview.next.startsAt);
console.log('PASS current/next Companion Trial monthly preview');
