"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRoute = generateRoute;
exports.generateCoopRouteGraph = generateCoopRouteGraph;
exports.validateCoopRouteGraph = validateCoopRouteGraph;
exports.coopRouteClientProjection = coopRouteClientProjection;
const launch_content_1 = require("./content/launch-content");
const dungeon_boss_rotation_1 = require("./content/dungeon-boss-rotation");
const rng_1 = require("./rng");
const config_1 = require("../coop/config");
const invariants_1 = require("../coop/invariants");
const coop_route_content_1 = require("./content/coop-route-content");
function weightedNode(secret, expeditionId, index) {
    const def = launch_content_1.EXPEDITIONS[expeditionId];
    if (!def)
        throw new Error('unknown_expedition');
    const entries = Object.entries(def.nodeWeights).filter(([kind]) => kind !== 'merchant');
    const total = entries.reduce((s, [, w]) => s + w, 0);
    let roll = (0, rng_1.deterministicUnit)(secret, expeditionId, 'node', index) * total;
    for (const [type, weight] of entries) {
        roll -= weight;
        if (roll <= 0)
            return type;
    }
    return 'battle';
}
function generateRoute(secret, expeditionId, runId) {
    const def = launch_content_1.EXPEDITIONS[expeditionId];
    if (!def)
        throw new Error('unknown_expedition');
    const count = (0, rng_1.deterministicInt)(secret, def.minNodes, def.maxNodes, runId, expeditionId, 'length');
    const nodes = [];
    for (let i = 0; i < count; i++) {
        let type = weightedNode(secret, expeditionId, i);
        if (i === 0 && ['boss', 'secret', 'forge'].includes(type))
            type = 'battle';
        if (i === count - 1)
            type = 'boss';
        nodes.push({ index: i, type, depth: i, risk: type === 'risk' ? 1.15 : type === 'elite' ? 1.08 : 1.0 });
    }
    return nodes;
}
const MODIFIERS = ['steady', 'thorned', 'volatile', 'warded', 'swift', 'attrition'];
function coopKind(secret, expeditionId, runId, contentVersion, balanceVersion, depth, choice) {
    // The opening remains a full combat encounter, but the second stage now
    // offers a genuine utility route alongside two distinct enemy formations.
    // Keep the first two battle options to preserve dungeon combat pacing.
    if (depth === 1)
        return 'battle';
    if (depth === 2) {
        if (choice < 2)
            return 'battle';
        const utility = ['event', 'treasure', 'camp', 'shrine'];
        return utility[(0, rng_1.deterministicInt)(secret, 0, utility.length - 1, 'coop-route-opening-v2', runId, expeditionId, contentVersion, balanceVersion)];
    }
    if (choice === 0)
        return 'battle';
    if (depth === 3 && choice === 1)
        return 'camp';
    const def = launch_content_1.EXPEDITIONS[expeditionId];
    const entries = Object.entries(def.nodeWeights).filter(([kind]) => kind !== 'boss' && kind !== 'merchant');
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = (0, rng_1.deterministicUnit)(secret, 'coop-route-v1', runId, expeditionId, contentVersion, balanceVersion, 'kind', depth, choice) * total;
    for (const [kind, weight] of entries) {
        roll -= weight;
        if (roll <= 0)
            return kind;
    }
    return 'battle';
}
function generateCoopRouteGraph(secret, expeditionId, runId, contentVersion, balanceVersion) {
    const def = launch_content_1.EXPEDITIONS[expeditionId];
    if (!def)
        throw new Error('unknown_expedition');
    if (!def.coopImplemented)
        throw new Error('expedition_not_implemented');
    const generatorVersion = config_1.COOP_ROGUELITE_CONFIG.routeGeneratorVersion;
    const preBossNodeCount = (0, rng_1.deterministicInt)(secret, config_1.COOP_ROGUELITE_CONFIG.preBossNodeMin, config_1.COOP_ROGUELITE_CONFIG.preBossNodeMax, generatorVersion, runId, expeditionId, contentVersion, balanceVersion, 'length');
    const nodes = [];
    const idsAt = (depth) => Array.from({ length: config_1.COOP_ROGUELITE_CONFIG.choicesPerDepth }, (_, choice) => `d${depth}-c${choice}`);
    nodes.push({ nodeId: 'entry', depth: 0, kind: 'entry', contentId: 'COOP_ENTRY', modifierId: 'none', risk: 1, rewardTag: 'none', nextNodeIds: idsAt(1) });
    for (let depth = 1; depth <= preBossNodeCount; depth++) {
        const layerModifierOffset = (0, rng_1.deterministicInt)(secret, 0, MODIFIERS.length - 1, generatorVersion, runId, expeditionId, contentVersion, balanceVersion, 'modifier-layer', depth);
        // One row of three choices must expose three distinct encounters, not
        // the same enemy formation wearing three cosmetic modifier labels.
        const usedContentIds = new Set();
        for (let choice = 0; choice < config_1.COOP_ROGUELITE_CONFIG.choicesPerDepth; choice++) {
            const kind = coopKind(secret, expeditionId, runId, contentVersion, balanceVersion, depth, choice);
            const contentPool = (0, coop_route_content_1.coopContentPool)(expeditionId, kind);
            let contentIndex = (0, rng_1.deterministicInt)(secret, 0, contentPool.length - 1, generatorVersion, runId, expeditionId, contentVersion, balanceVersion, 'content', depth, choice);
            while (usedContentIds.has(contentPool[contentIndex]))
                contentIndex = (contentIndex + 1) % contentPool.length;
            const contentId = contentPool[contentIndex];
            usedContentIds.add(contentId);
            const modifierIndex = (layerModifierOffset + choice) % MODIFIERS.length;
            // Mandatory battle rooms remain balanced via their encounter identities.
            // Special modifiers belong to the optional elite route only.
            nodes.push({ nodeId: `d${depth}-c${choice}`, depth, kind, contentId, modifierId: kind === 'elite' ? MODIFIERS[modifierIndex] : 'steady', risk: kind === 'risk' ? 1.15 : kind === 'elite' ? 1.08 : 1, rewardTag: kind, nextNodeIds: depth === preBossNodeCount ? ['boss'] : idsAt(depth + 1) });
        }
    }
    // One stable 50/50 roll at run creation. Never reroll a saved graph on reconnect.
    const finalBosses = (0, dungeon_boss_rotation_1.dungeonBossVariantsFor)(expeditionId);
    const bossId = finalBosses.length ? finalBosses[(0, rng_1.deterministicInt)(secret, 0, finalBosses.length - 1, 'regional-boss-v1', runId, expeditionId, contentVersion, balanceVersion)].bossId : def.bossId;
    nodes.push({ nodeId: 'boss', depth: preBossNodeCount + 1, kind: 'boss', contentId: bossId, modifierId: 'final', risk: 1.25, rewardTag: 'boss', nextNodeIds: [] });
    const graph = { schemaVersion: 1, generatorVersion, runId, expeditionId, contentVersion, balanceVersion, preBossNodeCount, entryNodeId: 'entry', bossNodeId: 'boss', nodes };
    validateCoopRouteGraph(graph);
    return graph;
}
function validateCoopRouteGraph(graph, limits) {
    if (limits) {
        if (!Number.isInteger(graph.preBossNodeCount) || graph.preBossNodeCount < limits.preBossNodeMin || graph.preBossNodeCount > limits.preBossNodeMax)
            throw new Error('invalid_coop_route_length');
    }
    else
        (0, invariants_1.validatePreBossNodeCount)(graph.preBossNodeCount);
    const byId = new Map(graph.nodes.map(node => [node.nodeId, node]));
    if (byId.size !== graph.nodes.length)
        throw new Error('duplicate_route_node');
    const entry = byId.get(graph.entryNodeId), boss = byId.get(graph.bossNodeId);
    if (!entry || entry.kind !== 'entry' || entry.depth !== 0)
        throw new Error('invalid_route_entry');
    if (!boss || boss.kind !== 'boss' || boss.depth !== graph.preBossNodeCount + 1 || boss.nextNodeIds.length)
        throw new Error('invalid_route_boss');
    const visiting = new Set(), visited = new Set();
    const visit = (id, nonBossCount) => {
        const node = byId.get(id);
        if (!node)
            throw new Error('missing_route_reference');
        if (visiting.has(id))
            throw new Error('cyclic_route');
        if (node.kind === 'boss') {
            if (nonBossCount !== graph.preBossNodeCount)
                throw new Error('invalid_route_path_length');
            return;
        }
        visiting.add(id);
        if (node.kind !== 'entry')
            nonBossCount += 1;
        if (node.nextNodeIds.length < 3 && node.depth < graph.preBossNodeCount)
            throw new Error('insufficient_route_choices');
        if (node.nextNodeIds.length >= 3) {
            const children = node.nextNodeIds.map(next => byId.get(next));
            if (children.some(child => !child))
                throw new Error('missing_route_reference');
            if (new Set(children.map(child => `${child.contentId}:${child.modifierId}`)).size < 3)
                throw new Error('fake_route_branching');
        }
        for (const nextId of node.nextNodeIds) {
            const child = byId.get(nextId);
            if (!child)
                throw new Error('missing_route_reference');
            if (child.depth !== node.depth + 1)
                throw new Error('route_depth_skip');
            visit(nextId, nonBossCount);
        }
        visiting.delete(id);
        visited.add(id);
    };
    visit(graph.entryNodeId, 0);
    if (visited.size + 1 !== graph.nodes.length)
        throw new Error('unreachable_route_node');
    for (let depth = 1; depth <= graph.preBossNodeCount; depth++) {
        const layer = graph.nodes.filter(node => node.depth === depth);
        if (layer.length < 3)
            throw new Error('insufficient_route_layer');
        // Accept historical v1 graphs (three early battles) when resuming a run.
        // Fresh v2 graphs provide a utility choice at depth two; at least two
        // combat alternatives remain mandatory for encounter pacing.
        if (depth === 1 && layer.some(node => node.kind !== 'battle'))
            throw new Error('mandatory_combat_missing');
        if (depth === 2 && layer.filter(node => node.kind === 'battle').length < 2)
            throw new Error('opening_combat_missing');
        if (depth > 2 && !layer.some(node => node.kind === 'battle'))
            throw new Error('combat_option_missing');
    }
    if (!graph.nodes.some(node => node.kind === 'camp' || node.kind === 'shrine'))
        throw new Error('recovery_option_missing');
}
function coopRouteClientProjection(graph, revealedNodeIds = [graph.entryNodeId]) {
    const byId = new Map(graph.nodes.map(node => [node.nodeId, node]));
    const visible = new Set(revealedNodeIds);
    for (const id of revealedNodeIds)
        for (const next of byId.get(id)?.nextNodeIds ?? [])
            visible.add(next);
    // Only visible nodes may cross the projection boundary. Copy the public
    // scalars and revealed nodes once; cloning the full hidden graph first was
    // redundant and became expensive on each room transition.
    return { ...graph, nodes: graph.nodes.filter(node => visible.has(node.nodeId)).map(node => structuredClone(node)) };
}
