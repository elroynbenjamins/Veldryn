"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const weekly_party_finale_readiness_v3_1 = require("../weekly-party-finale-readiness-v3");
const weekly_party_events_v2_1 = require("../weekly-party-events-v2");
function ok(v, msg) { if (!v)
    throw Error('party-readiness-v3: ' + msg); }
const start = Date.parse('2026-11-09T00:00:00Z'), end = start + 7 * 86400000;
const catalog = [
    { itemId: 'GREENWOOD_LOG', category: 'wood', tier: 'common', secondsPerUnit: 20, unlocked: true },
    { itemId: 'COPPER_ORE', category: 'ore', tier: 'common', secondsPerUnit: 20, unlocked: true },
    { itemId: 'DEWLEAF', category: 'herb', tier: 'common', secondsPerUnit: 30, unlocked: true },
];
const budget = (0, weekly_party_events_v2_1.weeklyPartyBudget)(2, 'standard');
const full = (0, weekly_party_events_v2_1.buildWeeklyPartySupplyOrders)('broken_caravan', budget, catalog, 9).map(o => ({ ...o, donatedQuantity: o.quantity }));
const base = { stage: 3, totalEventPoints: budget.progressTarget, budget, orders: full,
    voteResolved: true, finaleCleared: false, completed: false };
const ready = (0, weekly_party_finale_readiness_v3_1.previewPartyEventFinaleReadiness)({ stage: base, eventEndsAtMs: end, nowMs: end - 1, bossResultCommitted: false });
ok(ready.state === 'ready_for_finale' && ready.fullPreparation && !ready.bossSettled, 'preclose is readiness, NOT victory');
ok(ready.eligibleForRewardGrant === false, 'never grant rewards from a preview');
const frozen = (0, weekly_party_finale_readiness_v3_1.previewPartyEventFinaleReadiness)({ stage: base, eventEndsAtMs: end, nowMs: end, bossResultCommitted: false });
ok(frozen.state === 'frozen_full' && !frozen.bossSettled, 'close only freezes preparation');
const settled = (0, weekly_party_finale_readiness_v3_1.previewPartyEventFinaleReadiness)({ stage: base, eventEndsAtMs: end, nowMs: end + 3600000, bossResultCommitted: true });
ok(settled.state === 'boss_settled_full' && settled.bossSettled, 'actual committed result is separate from win');
const partial = (0, weekly_party_finale_readiness_v3_1.previewPartyEventFinaleReadiness)({ stage: { ...base, orders: base.orders.map(o => ({ ...o, donatedQuantity: o.stage === 3 ? 0 : o.quantity })) },
    eventEndsAtMs: end, nowMs: end, bossResultCommitted: false });
ok(partial.state === 'frozen_partial' && !partial.fullPreparation, 'missing supply cannot be full preparation');
ok((0, weekly_party_finale_readiness_v3_1.previewPartyEventFinaleReadiness)({ stage: { ...base, stage: 1 }, eventEndsAtMs: end, nowMs: end + 3600000,
    bossResultCommitted: true }).state === 'boss_settled_partial', 'non-final stage cannot yield full outcome');
ok((0, weekly_party_finale_readiness_v3_1.partyEventVoteClosesAt)(end - 1000, end) === end, 'vote auto-resolves at weekly close');
ok((0, weekly_party_finale_readiness_v3_1.partyEventVoteClosesAt)(start, start + 86400000) === start + 21600000, 'normal votes remain six hours');
let denied = false;
try {
    (0, weekly_party_finale_readiness_v3_1.previewPartyEventFinaleReadiness)({ stage: base, eventEndsAtMs: end, nowMs: end - 1, bossResultCommitted: true });
}
catch (e) {
    denied = String(e).includes('premature');
}
ok(denied, 'never claim early Day 8 boss result');
ok(weekly_party_finale_readiness_v3_1.PARTY_EVENT_FINALE_READINESS_V3_RELEASED === false, 'preview must remain dormant');
console.log('PASS Party Events v3 readiness: full, partial, preclose, committed-boss and vote-deadline isolation');
