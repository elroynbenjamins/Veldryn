"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnlineQModeRuntime = void 0;
const node_crypto_1 = require("node:crypto");
const launch_content_1 = require("../src/server/expeditions/content/launch-content");
const config_1 = require("../src/server/coop/config");
const qmode_1 = require("../src/server/coop/qmode");
const qmode_public_projection_1 = require("../src/server/coop/qmode-public-projection");
const loadout_snapshots_1 = require("../src/server/coop/loadout-snapshots");
const rewards_1 = require("../src/server/expeditions/rewards");
const coop_loadout_1 = require("./coop-loadout");
const gameplay_1 = require("./gameplay");
const digest = (value) => (0, node_crypto_1.createHash)('sha256').update(JSON.stringify(value)).digest('hex');
const content = coop_loadout_1.ONLINE_COOP_BALANCE_VERSION;
const projection = (run, version) => ({ ...(0, qmode_public_projection_1.projectQModeRun)(run), stateVersion: version, decisionId: run.currentNodeId, decisionRevision: version });
function settlement(run, version) {
    const definition = launch_content_1.EXPEDITIONS[run.expeditionId], last = run.lastResolution;
    const node = run.graph.nodes.find(row => row.nodeId === last.nodeId);
    const cleared = run.persistentState.visitedNodeIds.filter(id => id !== run.graph.bossNodeId).length;
    const terminal = run.phase === 'completed' || run.phase === 'failed';
    return { projection: projection(run, version), enhancedMarks: terminal ? (0, rewards_1.marksForRun)(definition.baseMarks, run.tier, { cleared: run.phase === 'completed', routeProgress: cleared / run.graph.preBossNodeCount, reachedFinalBoss: node.kind === 'boss' }) : null, assistanceMarks: terminal ? Math.max(1, Math.round(definition.baseMarks * .1)) : null };
}
/** Composes the existing Q-Mode domain with transactional persistence. Pending
 * combat remains private until database time reaches its simulated duration. */
class OnlineQModeRuntime {
    services;
    constructor(services) {
        this.services = services;
    }
    async receipt(accountId, operation, resource, requestId, hash) {
        const prior = await this.services.rpc('read_online_coop_receipt_server_v1', { p_account_id: accountId, p_operation: operation, p_resource_id: resource, p_request_id: requestId });
        if (prior && prior.requestHash !== hash)
            throw new gameplay_1.GameplayError('idempotency_key_conflict', 409);
        return prior;
    }
    async start(accountId, request) {
        if (request.mode !== 'qmode')
            throw new gameplay_1.GameplayError('invalid_mode');
        const hash = digest(request), prior = await this.receipt(accountId, 'qmode_start_v1', accountId, request.requestId, hash);
        if (prior)
            return prior.response;
        const definition = launch_content_1.EXPEDITIONS[request.dungeonId];
        if (!definition?.coopImplemented)
            throw new gameplay_1.GameplayError('dungeon_unavailable');
        const game = await this.services.rpc('load_online_game_server_v1', { p_account_id: accountId });
        if (!game.state?.character)
            throw new gameplay_1.GameplayError('character_required');
        const record = (0, coop_loadout_1.deriveOnlineCoopLoadout)(accountId, game.state, game.version);
        const minimum = (0, config_1.coopRequiredLevel)(definition.minLevel, request.tier), sync = definition.recommendedLevel;
        const freeze = (source) => (0, loadout_snapshots_1.resolveAndFreezeLoadout)({ accountId: source.accountId, characterId: source.characterId, loadoutId: source.loadoutId, expectedRevision: source.revision, minLevel: minimum, syncLevel: sync, repository: { getOwnedLoadout: () => source } });
        if (record.characterId !== request.characterId || request.loadoutId !== 'current')
            throw new gameplay_1.GameplayError('loadout_not_owned');
        if (request.loadoutRevision !== record.revision) {
            const replay = await this.receipt(accountId, 'qmode_start_v1', accountId, request.requestId, hash);
            if (replay)
                return replay.response;
            throw new gameplay_1.GameplayError('stale_game_version', 409);
        }
        const controller = freeze(record);
        const raw = await this.services.rpc('eligible_online_coop_echoes_server_v1', { p_actor_account_id: accountId, p_min_level: minimum });
        const profiles = [];
        for (const echo of raw) {
            // Old or ineligible profiles cannot turn an entire valid donor pool into a failure.
            if (echo.record.accountId !== echo.sourceAccountId)
                continue;
            try {
                profiles.push({ profileId: echo.profileId, sourceAccountId: echo.sourceAccountId, publishedAtMs: echo.publishedAtMs, optedIn: true, contentVersion: content, blockedAccountIds: [], snapshot: freeze(echo.record) });
            }
            catch {
                continue;
            }
        }
        const seed = this.services.randomId() + this.services.randomId(), id = this.services.randomId();
        const domain = new qmode_1.QModeService(new qmode_1.MemoryQModeRunRepository(), seed);
        const run = domain.create({ requestId: request.requestId, runId: id, controllerAccountId: accountId, controllerSnapshot: controller, expeditionId: definition.id, tier: request.tier, contentVersion: content, balanceVersion: content, nowMs: game.serverNow, profiles });
        const members = [{ snapshot: controller, sourceHash: (0, coop_loadout_1.onlineCoopLoadoutHash)(record), profileId: null }, ...run.echoSourceAccountIds.map((owner, index) => {
                const selected = profiles.find(row => row.sourceAccountId === owner && row.snapshot.characterId === run.players[index + 1].id);
                const source = raw.find(row => row.profileId === selected.profileId);
                return { snapshot: selected.snapshot, sourceHash: (0, coop_loadout_1.onlineCoopLoadoutHash)(source.record), profileId: selected.profileId };
            })];
        return this.services.rpc('start_online_qmode_server_v1', { p_account_id: accountId, p_game_version: game.version, p_request_id: request.requestId, p_request_hash: hash, p_run_id: id, p_private_state: { run, seed }, p_client_projection: projection(run, 1), p_members: members, p_seed_hash: digest(seed) });
    }
    async load(accountId, runId) {
        const loaded = await this.services.rpc('load_online_qmode_server_v1', { p_account_id: accountId, p_run_id: runId });
        const pending = loaded.privateState.pending;
        if (!pending || loaded.serverNow < pending.resolvesAtMs)
            return loaded.clientProjection;
        const run = pending.run, last = run.lastResolution, final = settlement(run, loaded.stateVersion + 1);
        return this.services.rpc('finalize_online_qmode_node_server_v1', { p_account_id: accountId, p_run_id: runId, p_expected_version: loaded.stateVersion, p_private_state: { run, seed: loaded.privateState.seed }, p_client_projection: final.projection, p_node_id: last.nodeId, p_result: last.result, p_start_state_hash: pending.startStateHash, p_enhanced_marks: final.enhancedMarks, p_assistance_marks: final.assistanceMarks });
    }
    async choose(accountId, runId, request) {
        const hash = digest(request), prior = await this.receipt(accountId, 'qmode_choose_v1', runId, request.requestId, hash);
        if (prior)
            return prior.response;
        const loaded = await this.services.rpc('load_online_qmode_server_v1', { p_account_id: accountId, p_run_id: runId });
        if (loaded.privateState.pending) {
            const replay = await this.receipt(accountId, 'qmode_choose_v1', runId, request.requestId, hash);
            if (replay)
                return replay.response;
            throw new gameplay_1.GameplayError('node_resolving', 409);
        }
        if (request.decisionRevision !== loaded.stateVersion || request.decisionId !== loaded.privateState.run.currentNodeId) {
            const replay = await this.receipt(accountId, 'qmode_choose_v1', runId, request.requestId, hash);
            if (replay)
                return replay.response;
            throw new gameplay_1.GameplayError('stale_state', 409);
        }
        const { run: before, seed } = loaded.privateState, repository = new qmode_1.MemoryQModeRunRepository();
        repository.save(before);
        const domain = new qmode_1.QModeService(repository, seed), run = domain.choose({ runId, controllerAccountId: accountId, optionNodeId: request.optionId });
        const duration = Math.max(0, Number(run.lastResolution.result.summary.durationMs ?? 0));
        const resolvesAtMs = loaded.serverNow + duration;
        const client = { ...projection(before, loaded.stateVersion + 1), phase: 'resolving_node', options: [], selectedNodeId: request.optionId, resolvesAtMs };
        return this.services.rpc('queue_online_qmode_node_server_v1', { p_account_id: accountId, p_run_id: runId, p_expected_version: loaded.stateVersion, p_request_id: request.requestId, p_request_hash: hash, p_private_state: { run: before, seed, pending: { run, resolvesAtMs, startStateHash: digest(before.persistentState), settlement: settlement(run, loaded.stateVersion + 2) } }, p_client_projection: client });
    }
}
exports.OnlineQModeRuntime = OnlineQModeRuntime;
