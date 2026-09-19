"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectQModeRun = projectQModeRun;
const route_generation_1 = require("../expeditions/route-generation");
/** Sanitizes the server-owned run for its controller. Echo source account IDs,
 * hidden graph nodes, RNG state and calculated-but-unentitled rewards stay private. */
function projectQModeRun(run) {
    const current = run.graph.nodes.find(node => node.nodeId === run.currentNodeId);
    if (!current)
        throw new Error('invalid_qmode_current_node');
    const revealed = [run.graph.entryNodeId, ...run.persistentState.visitedNodeIds, run.currentNodeId];
    const graph = (0, route_generation_1.coopRouteClientProjection)(run.graph, revealed);
    const visible = new Set(graph.nodes.map(node => node.nodeId));
    const options = run.phase === 'awaiting_choice' ? current.nextNodeIds.filter(id => visible.has(id)).map(id => graph.nodes.find(node => node.nodeId === id)).filter(Boolean) : [];
    const team = run.players.map((player, index) => { const state = run.persistentState.actors[player.id]; if (!state)
        throw new Error('missing_qmode_actor_state'); return { memberId: player.id, displayName: player.name, role: player.role, kind: index === 0 ? 'controller' : 'echo', effectiveLevel: player.level, currentHp: state.hp, maximumHp: player.stats.maxHp, downed: state.downed }; });
    return { runId: run.id, mode: 'qmode', phase: run.phase, tier: run.tier, expeditionId: run.expeditionId, controller: true, team, graph, currentNodeId: run.currentNodeId, options, visitedNodeIds: [...run.persistentState.visitedNodeIds], resources: run.persistentState.resources, boons: [...run.persistentState.boons], artifacts: [...run.persistentState.artifacts], curses: [...run.persistentState.curses], personalEffects: run.persistentState.personalEffects, settlement: { status: (run.phase === 'completed' || run.phase === 'failed') ? 'pending_entitlement' : 'not_ready' } };
}
