"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const launch_combat_1 = require("../../combat/content/launch-combat");
const route_generation_1 = require("../../expeditions/route-generation");
const node_resolution_1 = require("../../expeditions/node-resolution");
const runId = 'stateful-rootbound-1';
const secret = 'stateful-secret';
const graph = (0, route_generation_1.generateCoopRouteGraph)(secret, 'EXP_001', runId, 'content-v1', 'balance-v1');
const players = ['Ironwarden', 'Wayfinder', 'Ravager', 'Stonecaller'].map(classId => (0, launch_combat_1.launchPlayer)(classId, 25));
let state = (0, node_resolution_1.initialPersistentRunState)(players);
let current = 'entry';
for (let depth = 1; depth <= graph.preBossNodeCount; depth++) {
    const node = graph.nodes.find(item => item.nodeId === current);
    const options = node.nextNodeIds.map(id => graph.nodes.find(item => item.nodeId === id));
    const selected = options.find(option => option.kind === 'camp') ?? options[0];
    const beforeHp = Object.values(state.actors).reduce((sum, actor) => sum + actor.hp, 0);
    const result = (0, node_resolution_1.resolveCoopNode)({ runId, serverSecret: secret, node: selected, players, state });
    node_assert_1.strict.equal(result.success, true, `node failed: ${selected.nodeId}`);
    state = result.state;
    if (selected.kind === 'camp')
        node_assert_1.strict.ok(Object.values(state.actors).reduce((sum, actor) => sum + actor.hp, 0) >= beforeHp);
    current = selected.nodeId;
}
const boss = graph.nodes.find(node => node.nodeId === 'boss');
const bossResult = (0, node_resolution_1.resolveCoopNode)({ runId, serverSecret: secret, node: boss, players, state });
node_assert_1.strict.equal(bossResult.success, true);
node_assert_1.strict.equal(bossResult.state.visitedNodeIds.length, graph.preBossNodeCount + 1);
node_assert_1.strict.equal(new Set(bossResult.state.visitedNodeIds).size, bossResult.state.visitedNodeIds.length);
node_assert_1.strict.ok(Object.values(bossResult.state.actors).some(actor => actor.hp < players.find(player => bossResult.state.actors[player.id] === actor).stats.maxHp), 'damage must carry between rooms');
let duplicate = '';
try {
    (0, node_resolution_1.resolveCoopNode)({ runId, serverSecret: secret, node: boss, players, state: bossResult.state });
}
catch (error) {
    duplicate = error instanceof Error ? error.message : String(error);
}
node_assert_1.strict.equal(duplicate, 'node_already_resolved');
console.log('coop phase5 stateful run OK', JSON.stringify({ preBoss: graph.preBossNodeCount, visited: bossResult.state.visitedNodeIds.length }));
