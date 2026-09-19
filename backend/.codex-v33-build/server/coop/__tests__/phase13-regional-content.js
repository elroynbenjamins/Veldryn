"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const expedition_encounters_1 = require("../../combat/content/expedition-encounters");
const launch_combat_1 = require("../../combat/content/launch-combat");
const launch_content_1 = require("../../expeditions/content/launch-content");
const node_resolution_1 = require("../../expeditions/node-resolution");
const route_generation_1 = require("../../expeditions/route-generation");
const prefixes = { EXP_001: ['ROOT_'], EXP_002: ['LANTERN_'], EXP_003: ['SUN_OBS_'], EXP_004: ['SUN_MIRAGE_'], EXP_005: ['FROST_LAKE_'], EXP_006: ['FROST_CHOIR_'], EXP_007: ['ASH_FEN_'], EXP_008: ['ASH_CRUCIBLE_'] };
for (const [expeditionId, allowed] of Object.entries(prefixes)) {
    node_assert_1.strict.equal(launch_content_1.EXPEDITIONS[expeditionId].coopImplemented, true);
    for (let seed = 0; seed < 100; seed++) {
        const graph = (0, route_generation_1.generateCoopRouteGraph)('regional-route', expeditionId, `${expeditionId}-${seed}`, 'content-v2', 'regional-v1');
        node_assert_1.strict.equal(graph.preBossNodeCount, 5);
        for (const node of graph.nodes.filter(node => node.kind !== 'entry' && node.kind !== 'boss'))
            node_assert_1.strict.ok(allowed.some(prefix => node.contentId.startsWith(prefix)), `${expeditionId} leaked route content: ${node.contentId}`);
        for (const node of graph.nodes.filter(node => node.kind === 'battle' || node.kind === 'elite' || node.kind === 'boss'))
            node_assert_1.strict.ok(expedition_encounters_1.EXPEDITION_ENCOUNTERS[node.contentId], `${expeditionId} has unresolved combat ${node.contentId}`);
    }
}
for (const expeditionId of ['EXP_005', 'EXP_006', 'EXP_007', 'EXP_008'])
    node_assert_1.strict.equal(launch_content_1.EXPEDITIONS[expeditionId].coopImplemented, true);
const results = {};
for (const expeditionId of ['EXP_003', 'EXP_004']) {
    for (const [partyId, classIds] of Object.entries({ restoration: ['Ironwarden', 'Wayfinder', 'Ravager', 'Dawnkeeper'], utility: ['Ironwarden', 'Hexweaver', 'Knife Dancer', 'Stonecaller'] })) {
        const party = classIds.map(classId => (0, launch_combat_1.launchPlayer)(classId, 45));
        let clears = 0, durationMs = 0;
        const samples = 500;
        for (let seed = 0; seed < samples; seed++) {
            const runId = `regional-balance-${expeditionId}-${partyId}-${seed}`, secret = 'regional-balance-v1', graph = (0, route_generation_1.generateCoopRouteGraph)(secret, expeditionId, runId, 'content-v2', 'regional-v1');
            let state = (0, node_resolution_1.initialPersistentRunState)(party), current = graph.entryNodeId, success = true;
            for (let depth = 1; depth <= graph.preBossNodeCount; depth++) {
                const currentNode = graph.nodes.find(node => node.nodeId === current);
                const choices = currentNode.nextNodeIds.map(id => graph.nodes.find(node => node.nodeId === id));
                const selected = choices.find(node => node.kind === 'camp') ?? choices[0];
                const result = (0, node_resolution_1.resolveCoopNode)({ runId, serverSecret: secret, node: selected, players: party, state });
                state = result.state;
                durationMs += Number(result.summary.durationMs ?? 0);
                current = selected.nodeId;
                if (!result.success) {
                    success = false;
                    break;
                }
            }
            if (success) {
                const boss = graph.nodes.find(node => node.nodeId === graph.bossNodeId);
                const result = (0, node_resolution_1.resolveCoopNode)({ runId, serverSecret: secret, node: boss, players: party, state });
                durationMs += Number(result.summary.durationMs ?? 0);
                success = result.success;
            }
            clears += success ? 1 : 0;
        }
        const clearRate = clears / samples;
        node_assert_1.strict.ok(clearRate >= .85 && clearRate <= .995, `${expeditionId}/${partyId} Tier I clear rate ${clearRate} outside regional launch band`);
        results[`${expeditionId}_${partyId}`] = { clears, samples, averageCombatSeconds: Number((durationMs / samples / 1000).toFixed(2)) };
    }
}
console.log('coop phase13 regional content OK', JSON.stringify(results));
