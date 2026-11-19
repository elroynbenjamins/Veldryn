"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const launch_content_1 = require("../../expeditions/content/launch-content");
const route_generation_1 = require("../../expeditions/route-generation");
const config_1 = require("../config");
node_assert_1.strict.equal(config_1.COOP_ROGUELITE_CONFIG.routeGeneratorVersion, 'coop-route-v3');
let checked = 0;
for (const [id, definition] of Object.entries(launch_content_1.EXPEDITIONS)) {
    if (!definition.coopImplemented)
        continue;
    for (const seed of ['fight-1', 'fight-2', 'fight-3']) {
        const graph = (0, route_generation_1.generateCoopRouteGraph)(seed, id, seed, 'v3', 'v3');
        node_assert_1.strict.ok(graph.nodes.every(n => n.kind !== 'merchant'), 'New dungeon rooms must not include merchants');
        node_assert_1.strict.ok(graph.nodes.some(n => n.kind === 'battle'), 'Each dungeon offers ordinary battles');
        checked++;
    }
    node_assert_1.strict.ok((0, route_generation_1.generateRoute)('legacy-no-merchant', id, 'legacy-no-merchant').every(n => n.type !== 'merchant'));
}
node_assert_1.strict.ok(checked > 0);
console.log('dungeon route merchant exclusion OK', checked);
