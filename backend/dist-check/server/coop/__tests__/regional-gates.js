"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const launch_combat_1 = require("../../combat/content/launch-combat");
const launch_content_1 = require("../../expeditions/content/launch-content");
const route_generation_1 = require("../../expeditions/route-generation");
const node_resolution_1 = require("../../expeditions/node-resolution");
const cases = [['EXP_005', 70], ['EXP_006', 70], ['EXP_007', 94], ['EXP_008', 94]];
const results = {};
for (const [expeditionId, level] of cases) {
    node_assert_1.strict.equal(launch_content_1.EXPEDITIONS[expeditionId].coopImplemented, true);
    const party = ['Ironwarden', 'Wayfinder', 'Ravager', 'Dawnkeeper'].map(classId => (0, launch_combat_1.launchPlayer)(classId, level));
    let clears = 0;
    for (let seed = 0; seed < 100; seed++) {
        const runId = `regional-gate-${expeditionId}-${seed}`, secret = 'regional-gate-v1', graph = (0, route_generation_1.generateCoopRouteGraph)(secret, expeditionId, runId, 'content-v3', 'regional-v2');
        let state = (0, node_resolution_1.initialPersistentRunState)(party), current = graph.entryNodeId, success = true;
        for (let depth = 1; depth <= graph.preBossNodeCount; depth++) {
            const currentNode = graph.nodes.find(node => node.nodeId === current);
            const choices = currentNode.nextNodeIds.map(id => graph.nodes.find(node => node.nodeId === id));
            const selected = choices.find(node => node.kind === 'camp') ?? choices.find(node => node.kind === 'battle') ?? choices[0];
            const result = (0, node_resolution_1.resolveCoopNode)({ runId, serverSecret: secret, node: selected, players: party, state });
            state = result.state;
            current = selected.nodeId;
            if (!result.success) {
                success = false;
                break;
            }
        }
        if (success) {
            const boss = graph.nodes.find(node => node.nodeId === graph.bossNodeId);
            success = (0, node_resolution_1.resolveCoopNode)({ runId, serverSecret: secret, node: boss, players: party, state }).success;
        }
        if (success)
            clears++;
    }
    results[expeditionId] = clears;
    node_assert_1.strict.ok(clears >= 75, `${expeditionId} clear rate ${clears}% below regional gate`);
}
console.log('regional gate tests passed', JSON.stringify(results));
