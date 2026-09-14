"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const coop_shared_run_1 = require("../src/core/coop-shared-run");
const coop_shared_run_fixtures_1 = require("../src/dev/coop-shared-run-fixtures");
function equal(actual, expected, message = 'values differ') { if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(`${message}: ${JSON.stringify(actual)}`); }
function throws(work, pattern) { let message = ''; try {
    work();
}
catch (error) {
    message = error instanceof Error ? error.message : String(error);
} if (!pattern.test(message))
    throw new Error(`Expected ${pattern}, received ${message}`); }
(0, coop_shared_run_1.validateCoopRouteGraphView)(coop_shared_run_fixtures_1.coopRouteFixture);
equal((0, coop_shared_run_1.coopRouteProgress)(coop_shared_run_fixtures_1.coopRouteFixture), { completed: 2, total: 5, bossUnlocked: false });
equal(coop_shared_run_fixtures_1.coopRouteFixture.nodes.filter(node => node.kind !== 'boss' && node.kind !== 'entry').length, 15, 'fixture must contain five three-option layers');
for (let depth = 0; depth <= 5; depth++) {
    const next = new Set(coop_shared_run_fixtures_1.coopRouteFixture.nodes.filter(node => node.depth === depth).flatMap(node => node.nextNodeIds));
    equal(depth === 5 ? [...next] : next.size, depth === 5 ? ['boss'] : 3, `depth ${depth} reachability`);
}
const last = { ...coop_shared_run_fixtures_1.coopRouteFixture, completedNodeIds: ['d1-a', 'd2-a', 'd3-a', 'd4-a', 'd5-a'] };
equal((0, coop_shared_run_1.coopRouteProgress)(last).bossUnlocked, true);
equal((0, coop_shared_run_1.tallyCoopVotes)(coop_shared_run_fixtures_1.liveDecisionFixture), { 'd3-a': 2, 'd3-b': 1, 'd3-c': 1 });
equal((0, coop_shared_run_1.tallyCoopVotes)(coop_shared_run_fixtures_1.qDecisionFixture), { 'd3-a': 0, 'd3-b': 0, 'd3-c': 0 });
const qIntent = (0, coop_shared_run_1.buildCoopDecisionIntent)(coop_shared_run_fixtures_1.qDecisionFixture, 'd3-c', 'same-request-01');
equal(qIntent.kind, 'choose');
equal(qIntent.requestId, 'same-request-01');
equal((0, coop_shared_run_1.buildCoopDecisionIntent)(coop_shared_run_fixtures_1.qDecisionFixture, 'd3-c', 'same-request-01'), qIntent, 'retry must preserve idempotent command');
throws(() => (0, coop_shared_run_1.tallyCoopVotes)({ ...coop_shared_run_fixtures_1.qDecisionFixture, expiresAt: new Date().toISOString() }), /qmode_live_fields_forbidden/);
throws(() => (0, coop_shared_run_1.tallyCoopVotes)({ ...coop_shared_run_fixtures_1.liveDecisionFixture, votes: [...(coop_shared_run_fixtures_1.liveDecisionFixture.votes ?? []), { participantId: 'p1', displayName: 'You', optionId: 'd3-b' }] }), /invalid_vote_projection/);
(0, coop_shared_run_1.validatePersonalOffer)(coop_shared_run_fixtures_1.boonOfferFixture);
throws(() => (0, coop_shared_run_1.validatePersonalOffer)({ ...coop_shared_run_fixtures_1.boonOfferFixture, kind: 'camp', options: [{ id: 'bad', name: 'Adjust loadout', rarity: '', effectText: 'Edit equipment' }] }), /camp_loadout_edit_forbidden/);
console.log('coop shared run presentation OK');
