import test from 'node:test';
import assert from 'node:assert/strict';
import { collectRewardBundleIds, hashDefinition, normalizeDefinition, validateDefinition } from '../functions/_shared/liveops.js';

function base() {
  return normalizeDefinition({
    id:'party_event_test',version:1,scope:'party',name:'Test Event',shortDescription:'A valid event used to verify the control-plane schema.',durationHours:48,
    contributionRules:{allowedCategories:['combat','skilling'],allowedActivityKinds:[],allowedRegionIds:[],requiredAnyTags:[],dailyAccountCreditCap:2400,activityMultipliers:{},challengeMultipliers:{elite:1.05},minimumCategoryFraction:{combat:.3,skilling:.3}},
    personalMilestones:[{points:250,reward:{bundleId:'personal_250',tier:'milestone'}}],partyMilestones:[{points:2000,reward:{bundleId:'party_2000',tier:'milestone'}}],
    personalPartyRewardEligibilityPoints:250,rankedMinimumPartyPoints:4000,rankedMinimumMeaningfulContributors:2,meaningfulContributorPoints:250,partyBindingLockPoints:250,
    rankingRewards:{qualified:{bundleId:'qualified',tier:'participation'},top10:{bundleId:'top10',tier:'prestige'}},eventTags:['mixed','party_event']
  });
}

test('valid v17 party event passes validation', () => {
  const v=validateDefinition(base()); assert.deepEqual(v.errors,[]);
});
test('duration and multiplier bounds are enforced', () => {
  const d=base(); d.durationHours=80; d.contributionRules.challengeMultipliers.boss=2;
  const errors=validateDefinition(d).errors.join(' | '); assert.match(errors,/Duration/); assert.match(errors,/Boss|boss|Challenge multiplier/);
});
test('category split above 100 percent is rejected', () => {
  const d=base(); d.contributionRules.minimumCategoryFraction={combat:.6,skilling:.5};
  assert.ok(validateDefinition(d).errors.some(x=>x.includes('100%')));
});
test('reward bundle collector covers milestone and ranking references', () => {
  const ids=collectRewardBundleIds(base());
  for (const id of ['personal_250','party_2000','qualified','top10']) assert.ok(ids.includes(id));
});
test('definition hash is canonical across object-key order', async () => {
  const d=base(); const reordered={...d, rankingRewards:{top10:d.rankingRewards.top10,qualified:d.rankingRewards.qualified}};
  assert.equal(await hashDefinition(d),await hashDefinition(reordered));
});
