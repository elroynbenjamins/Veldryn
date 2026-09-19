"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRoute = generateRoute;
exports.generateCoopRouteGraph = generateCoopRouteGraph;
exports.validateCoopRouteGraph = validateCoopRouteGraph;
exports.coopRouteClientProjection = coopRouteClientProjection;
const launch_content_1 = require("./content/launch-content");
const rng_1 = require("./rng");
const config_1 = require("../coop/config");
const invariants_1 = require("../coop/invariants");
const coop_route_content_1 = require("./content/coop-route-content");
function weightedNode(secret, expeditionId, index) {
    const def = launch_content_1.EXPEDITIONS[expeditionId];
    if (!def)
        throw new Error('unknown_expedition');
    const entries = Object.entries(def.nodeWeights);
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
        if (i === 0 && ['boss', 'secret', 'merchant', 'forge'].includes(type))
            type = 'battle';
        if (i === count - 1)
            type = 'boss';
        nodes.push({ index: i, type, depth: i, risk: type === 'risk' ? 1.15 : type === 'elite' ? 1.08 : 1.0 });
    }
    return nodes;
}
const MODIFIERS = ['steady', 'thorned', 'volatile', 'warded', 'swift', 'attrition'];
function coopKind(secret, expeditionId, runId, contentVersion, balanceVersion, depth, choice) {
    if (depth <= 2)
        return 'battle';
    if (choice === 0)
        return 'battle';
    if (depth === 3 && choice === 1)
        return 'camp';
    const def = launch_content_1.EXPEDITIONS[expeditionId];
    const entries = Object.entries(def.nodeWeights).filter(([kind]) => kind !== 'boss');
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
        for (let choice = 0; choice < config_1.COOP_ROGUELITE_CONFIG.choicesPerDepth; choice++) {
            const kind = coopKind(secret, expeditionId, runId, contentVersion, balanceVersion, depth, choice);
            const contentPool = (0, coop_route_content_1.coopContentPool)(expeditionId, kind);
            const contentIndex = (0, rng_1.deterministicInt)(secret, 0, contentPool.length - 1, generatorVersion, runId, expeditionId, contentVersion, balanceVersion, 'content', depth, choice);
            const modifierIndex = (layerModifierOffset + choice) % MODIFIERS.length;
            nodes.push({ nodeId: `d${depth}-c${choice}`, depth, kind, contentId: contentPool[contentIndex], modifierId: MODIFIERS[modifierIndex], risk: kind === 'risk' ? 1.15 : kind === 'elite' ? 1.08 : 1, rewardTag: kind, nextNodeIds: depth === preBossNodeCount ? ['boss'] : idsAt(depth + 1) });
        }
    }
    nodes.push({ nodeId: 'boss', depth: preBossNodeCount + 1, kind: 'boss', contentId: def.bossId, modifierId: 'final', risk: 1.25, rewardTag: 'boss', nextNodeIds: [] });
    const graph = { schemaVersion: 1, generatorVersion, runId, expeditionId, contentVersion, balanceVersion, preBossNodeCount, entryNodeId: 'entry', bossNodeId: 'boss', nodes };
    validateCoopRouteGraph(graph);
    return graph;
}
function validateCoopRouteGraph(graph) {
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
        if (depth <= 2 && layer.some(node => node.kind !== 'battle'))
            throw new Error('mandatory_combat_missing');
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
    return { ...structuredClone(graph), nodes: graph.nodes.filter(node => visible.has(node.nodeId)).map(node => structuredClone(node)) };
}
