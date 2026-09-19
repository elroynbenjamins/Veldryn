"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const route_generation_1 = require("../../expeditions/route-generation");
const secret = 'route-test-secret';
for (let seed = 0; seed < 10_000; seed++) {
    const graph = (0, route_generation_1.generateCoopRouteGraph)(secret, 'EXP_001', `run-${seed}`, 'content-v1', 'balance-v1');
    (0, route_generation_1.validateCoopRouteGraph)(graph);
    node_assert_1.strict.equal(graph.preBossNodeCount, 5);
    node_assert_1.strict.equal(graph.nodes.filter(node => node.kind === 'boss').length, 1);
    for (let depth = 1; depth <= graph.preBossNodeCount; depth++)
        node_assert_1.strict.equal(graph.nodes.filter(node => node.depth === depth).length, 3);
}
const sameA = (0, route_generation_1.generateCoopRouteGraph)(secret, 'EXP_001', 'same-run', 'content-v1', 'balance-v1');
const sameB = (0, route_generation_1.generateCoopRouteGraph)(secret, 'EXP_001', 'same-run', 'content-v1', 'balance-v1');
node_assert_1.strict.deepEqual(sameA, sameB);
const prefixes = new Set(Array.from({ length: 100 }, (_, seed) => JSON.stringify((0, route_generation_1.generateCoopRouteGraph)(secret, 'EXP_001', `different-${seed}`, 'content-v1', 'balance-v1').nodes.slice(1, 4).map(node => [node.contentId, node.modifierId]))));
node_assert_1.strict.ok(prefixes.size > 1, 'run ID must influence node generation');
console.log('coop phase4 routes OK', JSON.stringify({ seeds: 10_000, distinctFirstLayers: prefixes.size }));
