"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCoopRouteGraphView = validateCoopRouteGraphView;
exports.coopRouteProgress = coopRouteProgress;
exports.tallyCoopVotes = tallyCoopVotes;
exports.buildCoopDecisionIntent = buildCoopDecisionIntent;
exports.validatePersonalOffer = validatePersonalOffer;
function validateCoopRouteGraphView(graph) {
    if (graph.preBossNodeCount !== 5)
        throw new Error('invalid_preboss_count');
    const byId = new Map(graph.nodes.map(node => [node.nodeId, node]));
    if (byId.size !== graph.nodes.length || !byId.has(graph.entryNodeId) || !byId.has(graph.bossNodeId))
        throw new Error('invalid_route_identity');
    const boss = byId.get(graph.bossNodeId);
    if (boss.kind !== 'boss' || boss.depth !== graph.preBossNodeCount + 1 || boss.nextNodeIds.length)
        throw new Error('invalid_boss');
    for (const node of graph.nodes) {
        for (const nextId of node.nextNodeIds) {
            const next = byId.get(nextId);
            if (!next)
                throw new Error('missing_route_edge');
            if (next.depth !== node.depth + 1)
                throw new Error('non_forward_edge');
        }
    }
    for (let depth = 0; depth < graph.preBossNodeCount; depth++) {
        const reachable = graph.nodes.filter(node => node.depth === depth && node.status !== 'hidden').flatMap(node => node.nextNodeIds);
        if (new Set(reachable).size < 3)
            throw new Error('insufficient_route_choices');
    }
    const completed = new Set(graph.completedNodeIds);
    if (completed.size !== graph.completedNodeIds.length || completed.size > graph.preBossNodeCount)
        throw new Error('invalid_completed_path');
}
function coopRouteProgress(graph) { validateCoopRouteGraphView(graph); return { completed: new Set(graph.completedNodeIds).size, total: graph.preBossNodeCount, bossUnlocked: new Set(graph.completedNodeIds).size === graph.preBossNodeCount }; }
function tallyCoopVotes(decision) {
    if (decision.options.length < 3 || new Set(decision.options.map(option => option.nodeId)).size !== decision.options.length)
        throw new Error('invalid_decision_options');
    if (decision.mode === 'qmode') {
        if (decision.votes?.length || decision.expiresAt || decision.eligibleVoterIds?.length)
            throw new Error('qmode_live_fields_forbidden');
        return Object.fromEntries(decision.options.map(option => [option.nodeId, 0]));
    }
    const eligible = new Set(decision.eligibleVoterIds ?? []), seen = new Set(), valid = new Set(decision.options.map(option => option.nodeId)), counts = Object.fromEntries([...valid].map(id => [id, 0]));
    for (const vote of decision.votes ?? []) {
        if (!eligible.has(vote.participantId) || !valid.has(vote.optionId) || seen.has(vote.participantId))
            throw new Error('invalid_vote_projection');
        seen.add(vote.participantId);
        counts[vote.optionId]++;
    }
    return counts;
}
function buildCoopDecisionIntent(decision, optionId, requestId) {
    if (decision.status !== 'open' || decision.options.every(option => option.nodeId !== optionId))
        throw new Error('decision_not_actionable');
    if (requestId.length < 8)
        throw new Error('invalid_request_id');
    if (decision.mode === 'live' && !(decision.eligibleVoterIds?.length))
        throw new Error('vote_not_authorized');
    if (decision.mode === 'qmode' && !decision.isController)
        throw new Error('choose_not_authorized');
    return { requestId, runId: decision.runId, decisionId: decision.decisionId, decisionRevision: decision.revision, optionId, kind: decision.mode === 'live' ? 'vote' : 'choose' };
}
function validatePersonalOffer(offer) {
    if (offer.kind === 'camp' && offer.options.some(option => /loadout|equipment/i.test(`${option.name} ${option.effectText}`)))
        throw new Error('camp_loadout_edit_forbidden');
    if (offer.status === 'open' && offer.options.length < 1)
        throw new Error('empty_open_offer');
}
