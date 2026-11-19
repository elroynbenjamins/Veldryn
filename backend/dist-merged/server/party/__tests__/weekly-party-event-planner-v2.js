"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const weekly_party_event_planner_v2_1 = require("../weekly-party-event-planner-v2");
function assert(condition, label) {
    if (!condition)
        throw new Error('hidden_party_event_planner: ' + label);
}
function rejects(fn, code) {
    try {
        fn();
        throw new Error('unexpected_success');
    }
    catch (e) {
        assert(String(e).includes(code), 'expected ' + code + ' but got ' + String(e));
    }
}
const monday = Date.parse('2026-11-09T01:00:00Z');
const novice = (id) => ({
    accountId: id, levels: { woodcutting: 1, mining: 1, herbalism: 1 },
});
const veteran = (id) => ({
    accountId: id, levels: { woodcutting: 80, mining: 80, herbalism: 80 },
});
const input = {
    partyId: 'party1', participants: [novice('a'), novice('b')],
    difficulty: 'standard', seed: 13, atMs: monday, gateEnabled: true,
};
assert(weekly_party_event_planner_v2_1.PARTY_EVENT_CANONICAL_RESOURCES_V2.length >= 9, 'canonical wood, ore and herb items defined');
assert(new Set(weekly_party_event_planner_v2_1.PARTY_EVENT_CANONICAL_RESOURCES_V2.map(i => i.itemId)).size ===
    weekly_party_event_planner_v2_1.PARTY_EVENT_CANONICAL_RESOURCES_V2.length, 'no duplicate material IDs');
const plan = (0, weekly_party_event_planner_v2_1.planServerPartyEvent)(input);
assert(plan.family === 'broken_caravan', 'first cycle is Broken Caravan');
assert(plan.startsAtMs === Date.parse('2026-11-09T00:00:00Z'), 'Monday UTC anchored start');
assert(plan.endsAtMs - plan.startsAtMs === 7 * 86400000, '7-day active window');
assert(plan.targetPoints === 100, '2 member EP target');
assert(plan.orders.length >= 9, 'orders cover three stages and optional preparations');
assert(plan.orders.every(order => order.tier === 'common'), 'novice party never requires locked materials');
assert(new Set(plan.orders.filter(o => o.kind === 'required').map(o => o.stage)).size === 3, 'every stage contains real required materials');
assert(plan.orders.filter(o => o.kind === 'optional').length === 3, 'optional preparation categories present');
assert((0, weekly_party_event_planner_v2_1.planServerPartyEvent)(input).orders.map(o => o.itemId + ':' + o.quantity).join('|') ===
    plan.orders.map(o => o.itemId + ':' + o.quantity).join('|'), 'same seed yields stable plan');
rejects(() => (0, weekly_party_event_planner_v2_1.planServerPartyEvent)({ ...input, gateEnabled: false }), 'PARTY_WEEKLY_EVENTS_DISABLED');
rejects(() => (0, weekly_party_event_planner_v2_1.planServerPartyEvent)({ ...input, atMs: Date.parse('2026-11-16T12:00:00Z') }), 'PARTY_EVENT_NOT_SCHEDULED');
rejects(() => (0, weekly_party_event_planner_v2_1.planServerPartyEvent)({ ...input, atMs: Date.parse('2026-11-23T12:00:00Z') }), 'PARTY_EVENT_NOT_SCHEDULED');
rejects(() => (0, weekly_party_event_planner_v2_1.planServerPartyEvent)({ ...input, participants: [novice('a')] }), 'party_event_invalid_roster');
rejects(() => (0, weekly_party_event_planner_v2_1.planServerPartyEvent)({ ...input, participants: [novice('a'), novice('a')] }), 'party_event_invalid_roster');
rejects(() => (0, weekly_party_event_planner_v2_1.planServerPartyEvent)({ ...input, participants: [{ accountId: 'a', levels: {
                woodcutting: 1, mining: 0, herbalism: 1
            } }, novice('b')] }), 'party_event_invalid_server_skill_snapshot');
const advanced = (0, weekly_party_event_planner_v2_1.planServerPartyEvent)({ ...input, participants: [
        veteran('a'), veteran('b'), veteran('c'), veteran('d'),
    ], difficulty: 'heroic' });
assert(advanced.targetPoints === 170, 'full-party Heroic target');
assert(advanced.requiredGatherMinutes === 600, 'Heroic sinks ten hours of resource value');
assert(advanced.optionalGatherMinutes === 300, 'Heroic optional sink worth five hours');
assert(advanced.orders.some(o => o.tier === 'advanced'), 'advanced team receives some higher-tier supplies');
const mixed = (0, weekly_party_event_planner_v2_1.planServerPartyEvent)({ ...input, participants: [veteran('a'), novice('b')], difficulty: 'veteran' });
assert(mixed.orders.every(o => o.tier === 'common'), 'cannot require items beyond lowest member unlock');
assert((0, weekly_party_event_planner_v2_1.planServerPartyEvent)({ ...input, atMs: Date.parse('2026-11-30T12:00:00Z') }).family ===
    'nightfall_hunt', 'second event occurs after two weeks off');
