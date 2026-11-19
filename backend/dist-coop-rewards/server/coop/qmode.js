"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QModeService = exports.MemoryQModeRunRepository = void 0;
const snapshot_adapter_1 = require("../combat/snapshot-adapter");
const launch_content_1 = require("../expeditions/content/launch-content");
const node_resolution_1 = require("../expeditions/node-resolution");
const route_generation_1 = require("../expeditions/route-generation");
const rewards_1 = require("../expeditions/rewards");
const reward_base_1 = require("../expeditions/reward-base");
const echo_recruitment_1 = require("./echo-recruitment");
const invariants_1 = require("./invariants");
const dungeon_entry_policy_1 = require("./dungeon-entry-policy");
const regional_power_balance_1 = require("./regional-power-balance");
const potion_modifiers_1 = require("./potion-modifiers");
const room_boon_choices_1 = require("./room-boon-choices");
class MemoryQModeRunRepository {
    runs = new Map();
    requests = new Map();
    get(runId) { const run = this.runs.get(runId); return run ? structuredClone(run) : undefined; }
    getByRequest(accountId, requestId) { const id = this.requests.get(`${accountId}:${requestId}`); return id ? this.get(id) : undefined; }
    save(run) { this.runs.set(run.id, structuredClone(run)); this.requests.set(`${run.controllerAccountId}:${run.requestId}`, run.id); }
}
exports.MemoryQModeRunRepository = MemoryQModeRunRepository;
function combatant(snapshot) { return (0, snapshot_adapter_1.combatantFromVerifiedSnapshot)(snapshot.normalized.snapshot, snapshot.normalized.abilities); }
function regionalCombatant(snapshot, expeditionId, balanceVersion) {
    const base = combatant(snapshot);
    const boost = (0, regional_power_balance_1.regionalCombatPowerBoost)(expeditionId, snapshot.combatPower, balanceVersion === regional_power_balance_1.REGIONAL_DUNGEON_BALANCE_VERSION);
    if (boost === 1)
        return base;
    // Role-defining attack/heal receives the clearest gear benefit. Mitigation
    // and durability grow more gently; no PvP, world combat or legacy run changes.
    const survival = 1 + (boost - 1) * .7;
    return { ...base, stats: { ...base.stats, attackPower: base.stats.attackPower * boost, healingPower: base.stats.healingPower * boost,
            defense: base.stats.defense * survival, maxHp: base.stats.maxHp * survival } };
}
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
        const allies = (0, echo_recruitment_1.recruitQModeAllies)({ serverSecret: this.serverSecret, requestId: input.requestId, controllerAccountId: input.controllerAccountId, controllerRole: input.controllerSnapshot.readiness.role, controllerClassId: input.controllerSnapshot.classId, contentVersion: input.contentVersion, nowMs: input.nowMs, profiles: input.profiles, minimumCombatPower: input.balanceVersion === regional_power_balance_1.REGIONAL_DUNGEON_BALANCE_VERSION ? (0, dungeon_entry_policy_1.regularDungeonTierRequiredPower)(definition, input.tier) : undefined, npcSnapshots: input.npcSnapshots ?? [] });
        const requiredLevel = (0, dungeon_entry_policy_1.regularDungeonTierRequiredLevel)(definition, input.tier);
        for (const snapshot of [input.controllerSnapshot, ...allies.map(ally => ally.snapshot)])
            if ((snapshot.characterLevel ?? snapshot.normalized.before.level) < requiredLevel)
                throw new Error(`character_below_tier_level:${snapshot.characterId}`);
        if (input.balanceVersion === regional_power_balance_1.REGIONAL_DUNGEON_BALANCE_VERSION)
            for (const snapshot of [input.controllerSnapshot, ...allies.map(ally => ally.snapshot)])
                if (!Number.isFinite(snapshot.combatPower) || snapshot.combatPower < (0, dungeon_entry_policy_1.regularDungeonTierRequiredPower)(definition, input.tier))
                    throw new Error('dungeon_power_requirement');
        (0, invariants_1.validateCoopRoster)([{ accountId: input.controllerAccountId, characterId: input.controllerSnapshot.characterId, role: input.controllerSnapshot.readiness.role }, ...allies.map(ally => ({ accountId: ally.snapshot.accountId, characterId: ally.snapshot.characterId, role: ally.snapshot.readiness.role }))]);
        (0, invariants_1.validateUniqueDamageClasses)([input.controllerSnapshot, ...allies.map(ally => ally.snapshot)].map(snapshot => ({ role: snapshot.readiness.role, classId: snapshot.classId })));
        const players = [regionalCombatant(input.controllerSnapshot, input.expeditionId, input.balanceVersion), ...allies.map(ally => regionalCombatant(ally.snapshot, input.expeditionId, input.balanceVersion))];
        return this.createRun({ requestId: input.requestId, runId: input.runId, controllerAccountId: input.controllerAccountId, expeditionId: input.expeditionId, tier: input.tier, contentVersion: input.contentVersion, balanceVersion: input.balanceVersion, players, qmodePressureVersion: 1, echoSourceAccountIds: allies.filter(ally => ally.kind === 'echo').map(ally => ally.snapshot.accountId), npcCharacterIds: allies.filter(ally => ally.kind === 'npc').map(ally => ally.snapshot.characterId) });
    }
    createLive(input) {
        const definition = launch_content_1.EXPEDITIONS[input.expeditionId];
        if (!definition)
            throw new Error('unknown_expedition');
        if (!definition.coopImplemented)
            throw new Error('expedition_not_implemented');
        if (input.snapshots.length !== 4)
            throw new Error('invalid_live_roster');
        const requiredLevel = (0, dungeon_entry_policy_1.regularDungeonTierRequiredLevel)(definition, input.tier);
        for (const snapshot of input.snapshots)
            if ((snapshot.characterLevel ?? snapshot.normalized.before.level) < requiredLevel)
                throw new Error(`character_below_tier_level:${snapshot.characterId}`);
        if (input.balanceVersion === regional_power_balance_1.REGIONAL_DUNGEON_BALANCE_VERSION)
            for (const snapshot of input.snapshots)
                if (!Number.isFinite(snapshot.combatPower) || snapshot.combatPower < (0, dungeon_entry_policy_1.regularDungeonTierRequiredPower)(definition, input.tier))
                    throw new Error('dungeon_power_requirement');
        (0, invariants_1.validateCoopRoster)(input.snapshots.map(snapshot => ({ accountId: snapshot.accountId, characterId: snapshot.characterId, role: snapshot.readiness.role })));
        (0, invariants_1.validateUniqueDamageClasses)(input.snapshots.map(snapshot => ({ role: snapshot.readiness.role, classId: snapshot.classId })));
        return this.createRun({ requestId: input.requestId, runId: input.runId, controllerAccountId: input.controllerAccountId, expeditionId: input.expeditionId, tier: input.tier, contentVersion: input.contentVersion, balanceVersion: input.balanceVersion, players: input.snapshots.map(snapshot => regionalCombatant(snapshot, input.expeditionId, input.balanceVersion)), echoSourceAccountIds: [] });
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
        const offers = (0, room_boon_choices_1.roomBoonOffers)(run, this.serverSecret);
        if (offers.length) {
            // Older supported clients cannot submit a boon choice yet. Choose the
            // first deterministic offer for them instead of blocking existing runs.
            const selectedBoon = input.boonId ?? offers[0].id;
            if (!offers.some(offer => offer.id === selectedBoon))
                throw new Error('invalid_boon_choice');
            (0, room_boon_choices_1.applyRoomBoon)(run, selectedBoon);
        }
        else if (input.boonId)
            throw new Error('invalid_boon_choice');
        const isCombat = selected.kind === 'battle' || selected.kind === 'elite' || selected.kind === 'boss';
        const regional = (0, regional_power_balance_1.regionalPowerMultipliers)(run.expeditionId, run.tier, run.regionalBalanceVersion === 1, selected.contentId);
        // Solar's repeated 5,200-HP Ward disproportionately blocks the Hexweaver/
        // Knife Dancer pairing despite verified entry CP. Slow only that ability on
        // newly versioned regional Tier I runs; keep opening Ward, boss phases and all
        // historical saved-run combat unchanged. The full 2,400-run published roster
        // matrix must keep every composition above the existing 85% clear-rate floor.
        const bossTuning = run.regionalBalanceVersion === 1 && run.tier === 1 && selected.contentId === 'BOSS_EXP_SOLAR'
            ? { profileId: 'sunscar-regional-solar-ward-cadence-v1', abilityCooldownMultipliers: { BOSS_EXP_SOLAR_WARD: 3 } }
            : undefined;
        const result = (0, node_resolution_1.resolveCoopNode)({ runId: run.id, serverSecret: this.serverSecret, node: selected, players: isCombat ? (0, potion_modifiers_1.preparedCoopCombatants)(run.players, run.persistentState.preparedAlchemyPotionIdsByActor) : run.players, state: run.persistentState, tier: run.tierScalingVersion === 2 ? run.tier : undefined, enemyAttackMultiplier: (run.qmodePressureVersion === 1 ? 1.005 : 1) * (regional?.attack ?? 1), enemyHpMultiplier: regional?.hp, enemyDefenseMultiplier: regional?.defense, enemyLevel: regional?.enemyLevel, enemyDamageProfile: run.qmodePressureVersion === 1 ? 'qmode-v1' : undefined, bossTuning, safetyAiPlayerIds: input.safetyAiPlayerIds });
        run.lastResolution = { nodeId: selected.nodeId, result: structuredClone(result) };
        run.persistentState = result.state;
        run.currentNodeId = selected.nodeId;
        if (!result.success)
            run.phase = 'failed';
        else if (selected.kind === 'boss') {
            run.phase = 'completed';
            run.rewardMarks = (0, rewards_1.marksForRun)((0, reward_base_1.frozenRunBaseMarks)(run), run.tier, { cleared: true, routeProgress: 1, reachedFinalBoss: true });
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
    createRun(input) {
        const graph = (0, route_generation_1.generateCoopRouteGraph)(this.serverSecret, input.expeditionId, input.runId, input.contentVersion, input.balanceVersion);
        const run = { id: input.runId, requestId: input.requestId, controllerAccountId: input.controllerAccountId, expeditionId: input.expeditionId, tier: input.tier, rewardBaseMarks: (0, reward_base_1.currentDungeonBaseMarks)(input.expeditionId), graph, currentNodeId: graph.entryNodeId, phase: 'awaiting_choice', players: input.players, persistentState: (0, node_resolution_1.initialPersistentRunState)(input.players), tierScalingVersion: 2, ...(input.balanceVersion === regional_power_balance_1.REGIONAL_DUNGEON_BALANCE_VERSION ? { regionalBalanceVersion: 1 } : {}), qmodePressureVersion: input.qmodePressureVersion, echoSourceAccountIds: input.echoSourceAccountIds, npcCharacterIds: input.npcCharacterIds ?? [] };
        this.repository.save(run);
        return structuredClone(run);
    }
}
exports.QModeService = QModeService;
