"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const launch_combat_1 = require("../../combat/content/launch-combat");
const route_generation_1 = require("../route-generation");
const node_resolution_1 = require("../node-resolution");
const player = (0, launch_combat_1.launchPlayer)('Ironwarden', 25), players = [player], runId = 'merchant-regression', secret = 'merchant-secret';
let graph = (0, route_generation_1.generateCoopRouteGraph)(secret, 'EXP_001', runId, 'content-v1', 'balance-v1');
let merchant = graph.nodes.find(node => node.kind === 'merchant');
for (let seed = 1; !merchant && seed < 100; seed++) {
    graph = (0, route_generation_1.generateCoopRouteGraph)(secret, 'EXP_001', `${runId}-${seed}`, 'content-v1', 'balance-v1');
    merchant = graph.nodes.find(node => node.kind === 'merchant');
}
if (!merchant)
    throw new Error('route must expose a merchant fixture');
let state = (0, node_resolution_1.initialPersistentRunState)(players);
state = { ...state, resources: 5 };
const resolved = (0, node_resolution_1.resolveCoopNode)({ runId, serverSecret: secret, node: merchant, players, state });
node_assert_1.strict.equal(resolved.success, true);
state = resolved.state;
const offers = (0, node_resolution_1.merchantOffers)(merchant.contentId);
node_assert_1.strict.equal(offers.length, 3);
const purchased = (0, node_resolution_1.purchaseMerchantOffer)({ runId, node: merchant, actorId: player.id, offerId: offers[0].id, state, players });
node_assert_1.strict.equal(purchased.state.resources, 3);
node_assert_1.strict.deepEqual(purchased.state.personalEffects[player.id]?.boons, [`${merchant.contentId}:merchant_boon`]);
let duplicate = '';
try {
    (0, node_resolution_1.purchaseMerchantOffer)({ runId, node: merchant, actorId: player.id, offerId: offers[0].id, state: purchased.state, players });
}
catch (error) {
    duplicate = error instanceof Error ? error.message : String(error);
}
node_assert_1.strict.equal(duplicate, 'merchant_offer_already_purchased');
let poor = '';
try {
    (0, node_resolution_1.purchaseMerchantOffer)({ runId, node: merchant, actorId: player.id, offerId: offers[1].id, state: { ...purchased.state, resources: 2 }, players });
}
catch (error) {
    poor = error instanceof Error ? error.message : String(error);
}
node_assert_1.strict.equal(poor, 'insufficient_run_resources');
console.log('merchant tests passed');
