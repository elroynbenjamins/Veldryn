"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QModeService = exports.MemoryQModeRunRepository = void 0;
const snapshot_adapter_1 = require("../combat/snapshot-adapter");
const launch_content_1 = require("../expeditions/content/launch-content");
const node_resolution_1 = require("../expeditions/node-resolution");
const route_generation_1 = require("../expeditions/route-generation");
const rewards_1 = require("../expeditions/rewards");
const echo_recruitment_1 = require("./echo-recruitment");
const invariants_1 = require("./invariants");
const config_1 = require("./config");
class MemoryQModeRunRepository {
    runs = new Map();
    requests = new Map();
    get(runId) { const run = this.runs.get(runId); return run ? structuredClone(run) : undefined; }
    getByRequest(accountId, requestId) { const id = this.requests.get(`${accountId}:${requestId}`); return id ? this.get(id) : undefined; }
    save(run) { this.runs.set(run.id, structuredClone(run)); this.requests.set(`${run.controllerAccountId}:${run.requestId}`, run.id); }
}
exports.MemoryQModeRunRepository = MemoryQModeRunRepository;
function combatant(snapshot) { return (0, snapshot_adapter_1.combatantFromVerifiedSnapshot)(snapshot.normalized.snapshot, snapshot.normalized.abilities); }
class QModeService {
    repository;
    serverSecret;
    constructor(repository, serverSecret) {
        this.repository = repository;
        this.serverSecret = serverSecret;
    }
    create(input) {
        const prior = this.repository.getByRequest(input.controllerAccountId, input.requestId);
        if (prior)
            return prior;
        const definition = launch_content_1.EXPEDITIONS[input.expeditionId];
        if (!definition)
            throw new Error('unknown_expedition');
        if (!definition.coopImplemented)
            throw new Error('expedition_not_implemented');
        const echoes = (0, echo_recruitment_1.recruitEligibleEchoes)({ serverSecret: this.serverSecret, requestId: input.requestId, controllerAccountId: input.controllerAccountId, controllerRole: input.controllerSnapshot.readiness.role, contentVersion: input.contentVersion, nowMs: input.nowMs, profiles: input.profiles });
        const requiredLevel = (0, config_1.coopRequiredLevel)(definition.minLevel, input.tier);
        for (const snapshot of [input.controllerSnapshot, ...echoes.map(echo => echo.snapshot)])
            if (snapshot.normalized.before.level < requiredLevel)
                throw new Error(`character_below_tier_level:${snapshot.characterId}`);
        (0, invariants_1.validateCoopRoster)([{ accountId: input.controllerAccountId, characterId: input.controllerSnapshot.characterId, role: input.controllerSnapshot.readiness.role }, ...echoes.map(echo => ({ accountId: echo.sourceAccountId, characterId: echo.snapshot.characterId, role: echo.snapshot.readiness.role }))]);
        const players = [combatant(input.controllerSnapshot), ...echoes.map(echo => combatant(echo.snapshot))];
        const graph = (0, route_generation_1.generateCoopRouteGraph)(this.serverSecret, input.expeditionId, input.runId, input.contentVersion, input.balanceVersion);
        const run = { id: input.runId, requestId: input.requestId, controllerAccountId: input.controllerAccountId, expeditionId: input.expeditionId, tier: input.tier, graph, currentNodeId: graph.entryNodeId, phase: 'awaiting_choice', players, persistentState: (0, node_resolution_1.initialPersistentRunState)(players), echoSourceAccountIds: echoes.map(echo => echo.sourceAccountId) };
        this.repository.save(run);
        return structuredClone(run);
    }
    getAuthorized(runId, accountId) { const run = this.repository.get(runId); if (!run)
        throw new Error('run_not_found'); if (run.controllerAccountId !== accountId)
        throw new Error('not_participant'); return run; }
    choose(input) {
        const run = this.getAuthorized(input.runId, input.controllerAccountId);
        if (run.phase !== 'awaiting_choice')
            throw new Error('run_not_awaiting_choice');
        const current = run.graph.nodes.find(node => node.nodeId === run.currentNodeId);
        if (!current || !current.nextNodeIds.includes(input.optionNodeId))
            throw new Error('invalid_option');
        const selected = run.graph.nodes.find(node => node.nodeId === input.optionNodeId);
        if (!selected)
            throw new Error('invalid_option');
        const result = (0, node_resolution_1.resolveCoopNode)({ runId: run.id, serverSecret: this.serverSecret, node: selected, players: run.players, state: run.persistentState });
        run.lastResolution = { nodeId: selected.nodeId, result: structuredClone(result) };
        run.persistentState = result.state;
        run.currentNodeId = selected.nodeId;
        if (!result.success)
            run.phase = 'failed';
        else if (selected.kind === 'boss') {
            run.phase = 'completed';
            const def = launch_content_1.EXPEDITIONS[run.expeditionId];
            run.rewardMarks = (0, rewards_1.marksForRun)(def.baseMarks, run.tier, { cleared: true, routeProgress: 1, reachedFinalBoss: true });
        }
        this.repository.save(run);
        return structuredClone(run);
    }
    purchaseMerchant(input) {
        const run = this.getAuthorized(input.runId, input.controllerAccountId);
        if (run.phase !== 'awaiting_choice')
            throw new Error('run_not_awaiting_choice');
        const node = run.graph.nodes.find(item => item.nodeId === run.currentNodeId);
        if (!node)
            throw new Error('run_node_not_found');
        const result = (0, node_resolution_1.purchaseMerchantOffer)({ runId: run.id, node, actorId: input.actorId, offerId: input.offerId, state: run.persistentState, players: run.players });
        run.lastResolution = { nodeId: node.nodeId, result: structuredClone(result) };
        run.persistentState = result.state;
        this.repository.save(run);
        return structuredClone(run);
    }
}
exports.QModeService = QModeService;
