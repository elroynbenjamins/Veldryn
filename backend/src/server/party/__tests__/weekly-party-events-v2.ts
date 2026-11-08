import {
  PARTY_WEEKLY_EVENTS_RELEASED,
  WEEKLY_PARTY_EVENT_FAMILIES,
  buildWeeklyPartySupplyOrders,
  creditVerifiedWeeklyActivity,
  isEligibleForWeeklyPartyChest,
  partyEventFamilyForWeek,
  partyEventWeekWindow,
  selectPartyEventVariation,
  weeklyPartyBudget,
  type VerifiedSupplyItem,
} from '../weekly-party-events-v2';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error('party_weekly_v2: ' + message);
}

assert(PARTY_WEEKLY_EVENTS_RELEASED === false, 'must stay hidden until explicitly launched');

const sunday = partyEventWeekWindow(Date.parse('2026-11-08T23:59:59Z'));
const monday = partyEventWeekWindow(Date.parse('2026-11-09T00:00:00Z'));
assert(sunday.weekKey === '2026-11-02', 'Sunday belongs to preceding UTC week');
assert(monday.weekKey === '2026-11-09', 'Monday UTC resets event');
assert(monday.endsAtMs - monday.startsAtMs === 7 * 86_400_000, 'exactly seven days');
assert(partyEventWeekWindow(Date.parse('2026-11-12T20:00:00Z')).weekKey === monday.weekKey, 'no daily resets');
assert(partyEventFamilyForWeek(monday.startsAtMs) === 'broken_caravan', 'first rotation');
assert(partyEventFamilyForWeek(monday.endsAtMs) === 'nightfall_hunt', 'second rotation');
assert(partyEventFamilyForWeek(monday.endsAtMs + 7 * 86_400_000) === 'broken_wards', 'third rotation');
assert(partyEventFamilyForWeek(monday.endsAtMs + 14 * 86_400_000) === 'lost_reliquary', 'fourth rotation');
assert(selectPartyEventVariation('broken_caravan', 4) === WEEKLY_PARTY_EVENT_FAMILIES.broken_caravan.variations[1],
  'seeded variation is stable');

for (const difficulty of ['standard', 'veteran', 'heroic'] as const) {
  for (const count of [2, 3, 4]) {
    const budget = weeklyPartyBudget(count, difficulty);
    assert(budget.stageProgressTargets.reduce((total, value) => total + value, 0) === budget.progressTarget,
      'stage targets must add up');
    assert(budget.requiredGatherMinutes > budget.optionalGatherMinutes, 'required sink exceeds optional sink');
    assert(budget.requiredGatherMinutes >= 90 * count, 'meaningful full-week sink');
  }
}
assert(weeklyPartyBudget(4, 'standard').requiredGatherMinutes === 360, '6h Standard required resources');
assert(weeklyPartyBudget(4, 'standard').optionalGatherMinutes === 180, '3h optional Standard');
assert(weeklyPartyBudget(4, 'heroic').requiredGatherMinutes === 600, '10h Heroic required resources');
try { weeklyPartyBudget(1, 'standard'); throw new Error('should reject solo event'); }
catch (err) { assert(String(err).includes('invalid_party_event_roster'), 'reject 1-member party'); }

const firstActivity = creditVerifiedWeeklyActivity(400, 0, 0);
assert(firstActivity.points === 0 && firstActivity.carriedSeconds === 400, 'preserve small eligible sessions');
const secondActivity = creditVerifiedWeeklyActivity(550, firstActivity.carriedSeconds, 0);
assert(secondActivity.points === 1 && secondActivity.carriedSeconds === 50, 'combine verified settlements');
assert(creditVerifiedWeeklyActivity(900 * 70, 0, 39).points === 1, 'enforce weekly activity cap');
assert(creditVerifiedWeeklyActivity(900, 0, 40).points === 0, 'no points beyond weekly cap');
assert(creditVerifiedWeeklyActivity(900 * 40, 0, 0).points === 40, 'one-session completion is allowed');
assert(isEligibleForWeeklyPartyChest(15, true), 'eligible personal effort and party completion');
assert(!isEligibleForWeeklyPartyChest(14, true), 'no free rewards for inactive players');
assert(!isEligibleForWeeklyPartyChest(40, false), 'no full chest for unfinished event');

const catalog: VerifiedSupplyItem[] = [
  { itemId: 'GREENWOOD_LOG', category: 'wood', tier: 'common', secondsPerUnit: 20, unlocked: true },
  { itemId: 'IRONWOOD_LOG', category: 'wood', tier: 'uncommon', secondsPerUnit: 60, unlocked: true },
  { itemId: 'CROWNWOOD_LOG', category: 'wood', tier: 'advanced', secondsPerUnit: 140, unlocked: false },
  { itemId: 'COPPER_ORE', category: 'ore', tier: 'common', secondsPerUnit: 30, unlocked: true },
  { itemId: 'ASTER_IRON_ORE', category: 'ore', tier: 'uncommon', secondsPerUnit: 90, unlocked: true },
  { itemId: 'SAMPLE_HERB_1', category: 'herb', tier: 'common', secondsPerUnit: 25, unlocked: true },
  { itemId: 'SAMPLE_HERB_2', category: 'herb', tier: 'uncommon', secondsPerUnit: 70, unlocked: true },
];
const budget = weeklyPartyBudget(4, 'standard');
const orders = buildWeeklyPartySupplyOrders('broken_caravan', budget, catalog, 12345);
assert(orders.length > 10, 'full three-stage supply orders and optional preparations');
assert(orders.every(o => o.quantity > 0 && o.estimatedGatherSeconds > 0), 'no empty orders');
assert(orders.every(o => o.itemId !== 'CROWNWOOD_LOG'), 'locked tiers never requested');
assert(orders.filter(o => o.kind === 'required').every(o => o.stage >= 1 && o.stage <= 3), 'all stages supported');
assert(new Set(orders.filter(o => o.kind === 'optional').map(o => o.preparation)).size === 3, 'three independent bonuses');
const requiredSeconds = orders.filter(o => o.kind === 'required').reduce((sum, o) => sum + o.estimatedGatherSeconds, 0);
const optionalSeconds = orders.filter(o => o.kind === 'optional').reduce((sum, o) => sum + o.estimatedGatherSeconds, 0);
assert(Math.abs(requiredSeconds - budget.requiredGatherMinutes * 60) < 900, 'required order budget close to target');
assert(Math.abs(optionalSeconds - budget.optionalGatherMinutes * 60) < 900, 'optional order budget close to target');

const basicOnly = catalog.filter(item => item.tier === 'common');
const beginner = buildWeeklyPartySupplyOrders('nightfall_hunt', weeklyPartyBudget(2, 'standard'), basicOnly, 8);
assert(beginner.every(o => o.tier === 'common'), 'beginners do not need advanced materials');
assert(beginner.some(o => o.category === 'herb'), 'event-specific resource weights are represented');
try {
  buildWeeklyPartySupplyOrders('broken_wards', budget, catalog.filter(item => item.category !== 'herb'), 1);
  throw new Error('missing category accepted');
} catch (err) {
  assert(String(err).includes('party_event_resource_category_unavailable'), 'reject impossible orders');
}
