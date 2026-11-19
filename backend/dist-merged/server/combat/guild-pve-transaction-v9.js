"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GuildPveV9TransactionService = exports.InMemoryGuildPveV9Store = exports.GUILD_PVE_V9_LIVE = void 0;
exports.makeGuildPveV9Run = makeGuildPveV9Run;
exports.registerGuildPveV9TestRun = registerGuildPveV9TestRun;
/**
 * Veldryn Guild Expeditions V9 — HIDDEN transactional PORT contract.
 *
 * Domain logic runs against a fully atomic SERIALIZABLE transaction port.
 * InMemoryGuildPveV9Store is a pure test double which serializes & rolls back;
 * it is not a database, service endpoint, outbox, wallet or migration.
 *
 * The production adapter must guarantee transaction isolation + durability
 * across workers and *authenticate* principalAccountId before calling run().
 * No existing Guild Hunt table is used or modified.
 */
const node_crypto_1 = require("node:crypto");
const guild_pve_shared_v8_1 = require("./guild-pve-shared-v8");
const guild_pve_broken_forge_v7_1 = require("./guild-pve-broken-forge-v7");
exports.GUILD_PVE_V9_LIVE = false;
const DAY = 86400000;
const safe = (s) => typeof s === 'string' && /^[A-Za-z0-9][A-Za-z0-9:_-]{1,99}$/.test(s);
const round = (x) => Number(Math.max(0, x).toFixed(2));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const sha = (data) => (0, node_crypto_1.createHash)('sha256').update(JSON.stringify(data)).digest('hex');
const difficultyWeight = { Scout: 1, Veteran: 1.24, Mythic: 1.5 };
const nodeIndex = new Map(guild_pve_shared_v8_1.GUILD_PVE_V8_MANIFEST.map(x => [x.id, x]));
(0, guild_pve_shared_v8_1.verifyGuildPveV8Manifest)();
const runKey = (cycle, guild) => JSON.stringify([cycle, guild]);
const bindingKey = (cycle, account) => JSON.stringify([cycle, account]);
const receiptKey = (cycle, account, request) => JSON.stringify([cycle, account, request]);
/** Creates immutable parameters for one guild's candidate 14-day run.
 * Campaign HP formula is V8's UNAPPROVED synthetic calibration. The SQL
 * version must freeze real verified HP, roster & profile under server policy.
 */
function makeGuildPveV9Run(input) {
    if (!safe(input.cycleId) || !safe(input.guildId) ||
        !Number.isSafeInteger(input.startMs) || input.startMs <= 0 ||
        new Date(input.startMs).getUTCDay() !== 1 ||
        new Date(input.startMs).getUTCHours() !== 0 ||
        new Date(input.startMs).getUTCMinutes() !== 0 ||
        input.startMs % 60000 !== 0 ||
        !Object.hasOwn(difficultyWeight, input.difficulty) ||
        input.accountIds.length === 0 ||
        input.accountIds.some(x => !safe(x)) ||
        new Set(input.accountIds).size !== input.accountIds.length)
        throw Error('guild_pve_v9_invalid_run');
    (0, guild_pve_broken_forge_v7_1.verifyGuildPveReferenceV7)(input.reference);
    const scaled = Math.max(4, input.accountIds.length);
    const nodes = Object.fromEntries(guild_pve_shared_v8_1.GUILD_PVE_V8_MANIFEST.map(n => {
        const hp = n.boss ? Math.ceil(input.reference.attack * 24 * scaled *
            (n.weight ?? 0) * difficultyWeight[input.difficulty]) : 0;
        const phase = n.boss ? guild_pve_broken_forge_v7_1.GUILD_PVE_V7_PHASES[n.boss][0] : null;
        return [n.id, { hp, maxHp: hp, phase, phaseTriggers: [], cleared: n.kind === 'start' }];
    }));
    return {
        cycleId: input.cycleId, guildId: input.guildId, startMs: input.startMs,
        endMs: input.startMs + 14 * DAY, difficulty: input.difficulty,
        reference: structuredClone(input.reference),
        pressure: 0, revision: 0, nodes,
        members: Object.fromEntries(input.accountIds.map(id => [id, { sealsSpent: 0, ordersSpent: 0 }])),
    };
}
/** Test-only portable storage; callers may reinstantiate services with the
 * same store to simulate loss of application process-local caches.
 * This object itself must not be called durable: its memory still disappears.
 */
class InMemoryGuildPveV9Store {
    state = { guildRuns: {}, cycleBindings: {}, receipts: {} };
    queue = Promise.resolve();
    injectedAbort = false;
    abortNextTransactionBeforeCommit() { this.injectedAbort = true; }
    async transaction(job) {
        const process = async () => {
            const candidate = structuredClone(this.state);
            const value = await job(candidate);
            if (this.injectedAbort) {
                this.injectedAbort = false;
                throw Error('guild_pve_v9_injected_commit_abort');
            }
            this.state = candidate;
            return structuredClone(value);
        };
        const current = this.queue.then(process);
        this.queue = current.then(() => undefined, () => undefined);
        return current;
    }
    inspect() { return structuredClone(this.state); }
}
exports.InMemoryGuildPveV9Store = InMemoryGuildPveV9Store;
async function registerGuildPveV9TestRun(port, run) {
    await port.transaction(async (state) => {
        const key = runKey(run.cycleId, run.guildId);
        if (state.guildRuns[key])
            throw Error('guild_pve_v9_duplicate_guild_run');
        state.guildRuns[key] = structuredClone(run);
    });
}
function isAccessible(run, id) {
    const node = nodeIndex.get(id);
    return node.all.every(x => run.nodes[x].cleared) &&
        (!node.any || node.any.some(x => run.nodes[x].cleared));
}
function nextGuardianPhase(boss, remaining, max) {
    const cut = boss === 'gatekeeper' ? [.6, .2] : boss === 'seer' ? [.65, .3] : [.7, .3];
    const p = guild_pve_broken_forge_v7_1.GUILD_PVE_V7_PHASES[boss];
    return remaining / max > cut[0] ? p[0] : remaining / max > cut[1] ? p[1] : p[2];
}
class GuildPveV9TransactionService {
    storage;
    loader;
    constructor(storage, loader) {
        this.storage = storage;
        this.loader = loader;
    }
    async commit(server, action) {
        if (!safe(server.principalAccountId) || !safe(action.cycleId) ||
            !safe(action.guildId) || !safe(action.characterId) ||
            !safe(action.requestId) || !nodeIndex.has(action.nodeId) ||
            !Number.isSafeInteger(server.nowUtcMs) || server.nowUtcMs <= 0)
            throw Error('guild_pve_v9_invalid_command');
        if (action.kind === 'battle' && !['Assault', 'Guard', 'Rally'].includes(action.stance ?? ''))
            throw Error('guild_pve_v9_invalid_stance');
        if (action.kind === 'exploration' && action.stance !== undefined)
            throw Error('guild_pve_v9_exploration_has_stance');
        if (!['battle', 'exploration'].includes(action.kind))
            throw Error('guild_pve_v9_invalid_action_kind');
        const account = server.principalAccountId;
        const key = receiptKey(action.cycleId, account, action.requestId);
        const fingerprint = sha([action.cycleId, action.guildId, action.characterId,
            action.nodeId, action.kind, action.stance ?? null]);
        return this.storage.transaction(async (state) => {
            const previous = state.receipts[key];
            if (previous) {
                if (previous.fingerprint !== fingerprint)
                    throw Error('guild_pve_v9_idempotency_key_conflict');
                return previous.value;
            }
            const run = state.guildRuns[runKey(action.cycleId, action.guildId)];
            if (!run)
                throw Error('guild_pve_v9_unknown_run');
            const member = run.members[account];
            if (!member)
                throw Error('guild_pve_v9_not_in_frozen_roster');
            if (server.nowUtcMs < run.startMs || server.nowUtcMs >= run.endMs)
                throw Error('guild_pve_v9_run_not_active');
            const def = nodeIndex.get(action.nodeId), node = run.nodes[action.nodeId];
            const canFight = def.kind === 'combat' || def.kind === 'guardian' || def.kind === 'final';
            const canExplore = def.kind === 'explore' || def.kind === 'dual';
            if (action.kind === 'battle' && !canFight ||
                action.kind === 'exploration' && !canExplore)
                throw Error('guild_pve_v9_unsupported_node_action');
            const binding = state.cycleBindings[bindingKey(action.cycleId, account)];
            if (binding && binding !== action.guildId)
                throw Error('guild_pve_v9_already_bound_to_other_guild');
            const oldHp = node.hp, oldPressure = run.pressure;
            const receipt = (status, combat, transitions) => ({
                cycleId: action.cycleId, guildId: action.guildId, accountId: account,
                characterId: action.characterId, requestId: action.requestId, nodeId: action.nodeId,
                kind: action.kind, status, costSeals: status === 'committed' && action.kind === 'battle' ? 1 : 0,
                costOrders: status === 'committed' && action.kind === 'exploration' ? 1 : 0,
                beforeHp: oldHp, afterHp: node.hp, creditedHp: round(oldHp - node.hp),
                beforePressure: oldPressure, afterPressure: run.pressure,
                phaseTransitions: transitions, guildRevision: run.revision, combat,
                rewardMinted: false, inventorySpent: false, databasePersisted: false,
            });
            const save = (value) => {
                state.receipts[key] = { fingerprint, value };
                return value;
            };
            // A cycle-bound account cannot probe another guild via a free stale
            // result. Even a zero-cost saved receipt requires correct guild binding.
            if (node.cleared)
                return save(receipt('stale', null, []));
            if (!isAccessible(run, action.nodeId))
                throw Error('guild_pve_v9_node_locked');
            const week2 = server.nowUtcMs >= run.startMs + 7 * DAY;
            if (action.kind === 'battle' && member.sealsSpent >= (week2 ? 8 : 4))
                throw Error('guild_pve_v9_no_assault_seals');
            if (action.kind === 'exploration' && member.ordersSpent >= (week2 ? 6 : 3))
                throw Error('guild_pve_v9_no_exploration_orders');
            let combat = null;
            let transitions = [];
            if (action.kind === 'battle') {
                const actor = await this.loader.resolveOwnedActor(account, action.characterId);
                if (!actor || actor.characterId !== action.characterId ||
                    actor.actor?.id !== action.characterId ||
                    actor.actor.team !== 'players' ||
                    !['tank', 'damage', 'support'].includes(actor.actor.role) ||
                    !Number.isSafeInteger(actor.gameRevision) || actor.gameRevision < 1 ||
                    !/^[a-f0-9]{64}$/.test(actor.sourceHash))
                    throw Error('guild_pve_v9_unverified_actor');
                const seed = sha([run.cycleId, run.guildId, account, action.characterId,
                    action.requestId, action.nodeId, run.revision, actor.gameRevision, actor.sourceHash]);
                combat = (0, guild_pve_broken_forge_v7_1.previewBrokenForgeAttemptV7)({
                    boss: def.boss, phase: node.phase, difficulty: run.difficulty,
                    reference: run.reference, player: actor.actor, stance: action.stance, seed,
                });
                node.hp = round(Math.max(0, node.hp - Math.min(node.hp, combat.bossHpRemoved)));
                if (def.kind === 'guardian' || def.kind === 'final') {
                    const phases = guild_pve_broken_forge_v7_1.GUILD_PVE_V7_PHASES[def.boss];
                    const first = phases.indexOf(node.phase);
                    const last = phases.indexOf(node.hp === 0 ? phases[2] :
                        nextGuardianPhase(def.boss, node.hp, node.maxHp));
                    transitions = phases.slice(first + 1, last + 1);
                    for (const phase of transitions)
                        if (!node.phaseTriggers.includes(phase))
                            node.phaseTriggers.push(phase);
                    node.phase = phases[last];
                }
                node.cleared = node.hp === 0;
                const drumBonus = action.nodeId === 'C3-06' && action.stance === 'Assault' &&
                    run.nodes['C3-02'].cleared ? 3 : 0;
                const raw = action.stance === 'Assault' ? 15 : action.stance === 'Guard' ? -12 : -8;
                run.pressure = clamp(run.pressure + raw - 4 - drumBonus, 0, 100);
                member.sealsSpent++;
            }
            else {
                node.cleared = true;
                member.ordersSpent++;
            }
            state.cycleBindings[bindingKey(action.cycleId, account)] = action.guildId;
            run.revision++;
            return save(receipt('committed', combat, transitions));
        });
    }
}
exports.GuildPveV9TransactionService = GuildPveV9TransactionService;
