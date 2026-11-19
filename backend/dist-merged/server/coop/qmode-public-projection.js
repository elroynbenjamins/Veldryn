"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicCoopRoomOutcome = publicCoopRoomOutcome;
exports.projectQModeRun = projectQModeRun;
const route_generation_1 = require("../expeditions/route-generation");
const combat_replay_projection_1 = require("./combat-replay-projection");
const expedition_combat_service_1 = require("../combat/expedition-combat-service");
const room_boon_choices_1 = require("./room-boon-choices");
// Static encounter intel is determined solely by the content ID; do not
// regenerate its combat catalog for every server projection or room update.
const encounterPreviewCache = new Map();
const bossTelegraphCache = new Map();
const cachedEncounterPreview = (id) => { if (!encounterPreviewCache.has(id))
    encounterPreviewCache.set(id, (0, expedition_combat_service_1.expeditionEncounterPreview)(id)); return encounterPreviewCache.get(id); };
const cachedBossTelegraph = (id) => { if (!bossTelegraphCache.has(id))
    bossTelegraphCache.set(id, (0, expedition_combat_service_1.expeditionBossTelegraph)(id)); return bossTelegraphCache.get(id); };
/** Never publish RNG rolls, hidden graph nodes, private state or account IDs in room feedback. */
function publicCoopRoomOutcome(nodeId, summary) {
    if (!nodeId || !summary)
        return undefined;
    const kind = summary.kind;
    if (typeof kind !== 'string' || !['camp', 'shrine', 'forge', 'treasure', 'secret', 'event', 'risk', 'echo', 'merchant', 'merchant_purchase'].includes(kind))
        return undefined;
    const count = (key) => typeof summary[key] === 'number' && Number.isFinite(summary[key]) ? Math.max(0, summary[key]) : 0;
    const delta = typeof summary.resourcesDelta === 'number' && Number.isFinite(summary.resourcesDelta) ? summary.resourcesDelta : 0;
    return { nodeId, kind, resourcesDelta: delta, healedHp: count('healedHp'), damagedHp: count('damagedHp'), revivedCount: count('revivedCount'), boonCount: count('boonCount'), artifactCount: count('artifactCount'), curseCount: count('curseCount'), ...(kind === 'merchant_purchase' && typeof summary.offerKind === 'string' ? { offerKind: summary.offerKind } : {}) };
}
/** Sanitizes the server-owned run for its controller. Echo source account IDs,
 * hidden graph nodes, RNG state and calculated-but-unentitled rewards stay private. */
function projectQModeRun(run, mode = 'qmode', serverSecret) {
    const current = run.graph.nodes.find(node => node.nodeId === run.currentNodeId);
    if (!current)
        throw new Error('invalid_qmode_current_node');
    const bossNode = run.graph.nodes.find(node => node.kind === 'boss');
    const revealed = [run.graph.entryNodeId, ...run.persistentState.visitedNodeIds, run.currentNodeId];
    const graph = (0, route_generation_1.coopRouteClientProjection)(run.graph, revealed);
    const visible = new Set(graph.nodes.map(node => node.nodeId));
    // A regional boss roll remains a surprise until the final room is reachable.
    // Otherwise this private telegraph would reveal the 50/50 result on entry.
    const bossTelegraph = bossNode && visible.has(bossNode.nodeId) ? cachedBossTelegraph(bossNode.contentId) : undefined;
    const options = run.phase === 'awaiting_choice' ? current.nextNodeIds.filter(id => visible.has(id)).map(id => graph.nodes.find(node => node.nodeId === id)).filter(Boolean).map(node => ({ ...node, ...(['battle', 'elite', 'boss'].includes(node.kind) ? { encounterPreview: cachedEncounterPreview(node.contentId) } : {}) })) : [];
    const lastRoomOutcome = publicCoopRoomOutcome(run.lastResolution?.nodeId, run.lastResolution?.result.summary);
    const boonOffers = mode === 'qmode' && serverSecret ? (0, room_boon_choices_1.roomBoonOffers)(run, serverSecret) : [];
    const resolvedNode = run.graph.nodes.find(node => node.nodeId === run.lastResolution?.nodeId);
    const lastCombatMarks = run.lastResolution?.result.success && run.lastResolution.result.summary.kind === 'combat' ? (resolvedNode?.kind === 'elite' ? 5 : resolvedNode?.kind === 'battle' ? 3 : undefined) : undefined;
    const team = run.players.map((player, index) => { const state = run.persistentState.actors[player.id]; if (!state)
        throw new Error('missing_qmode_actor_state'); const companionId = (player.tags ?? []).find(tag => tag.startsWith('companion:'))?.slice('companion:'.length), bodyTag = (player.tags ?? []).find(tag => tag.startsWith('body:'))?.slice('body:'.length), bodyPresentation = bodyTag === 'female' ? 'female' : bodyTag === 'male' ? 'male' : undefined; return { memberId: player.id, displayName: player.name, role: player.role, classId: player.classId ?? '', bodyPresentation, companionId, kind: index === 0 ? 'controller' : run.npcCharacterIds?.includes(player.id) ? 'npc' : 'echo', effectiveLevel: player.level, currentHp: state.hp, maximumHp: player.stats.maxHp, downed: state.downed }; });
    return { runId: run.id, mode, phase: run.phase, tier: run.tier, expeditionId: run.expeditionId, controller: true, team: mode === 'live' ? team.map(member => ({ ...member, kind: 'controller' })) : team, graph, currentNodeId: run.currentNodeId, options, visitedNodeIds: [...run.persistentState.visitedNodeIds], resources: run.persistentState.resources, boons: [...run.persistentState.boons], artifacts: [...run.persistentState.artifacts], curses: [...run.persistentState.curses], personalEffects: run.persistentState.personalEffects, potionChargeCapacity: [3, 3, 4, 4, 5][run.tier - 1], healingPotionUsesByActor: run.persistentState.healingPotionUsesByActor ?? {}, potionPreparationOpen: run.phase === 'awaiting_choice' && !run.persistentState.visitedNodeIds.length, preparedAlchemyPotionIdsByActor: run.persistentState.preparedAlchemyPotionIdsByActor ?? {}, ...(bossTelegraph ? { bossMechanic: { label: 'Dungeon boss mechanics', summary: 'Read the cast telegraphs and interrupt dangerous abilities before the final phase.', tone: 'mixed', telegraph: bossTelegraph } } : {}), lastCombat: (0, combat_replay_projection_1.projectCombatReplay)(run.lastResolution), ...(boonOffers.length ? { boonOffers } : {}), ...(lastRoomOutcome ? { lastRoomOutcome } : {}), ...(lastCombatMarks ? { lastCombatMarks } : {}), settlement: { status: (run.phase === 'completed' || run.phase === 'failed') ? 'pending_entitlement' : 'not_ready' } };
}
