"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORLD_BOSS_MAX_ATTEMPTS = exports.WORLD_BOSS_EVENT_PROTOTYPE_VERSION = void 0;
exports.createWorldBossEventPrototype = createWorldBossEventPrototype;
exports.worldBossPhaseAtStart = worldBossPhaseAtStart;
exports.applyWorldBossAttemptPrototype = applyWorldBossAttemptPrototype;
const world_boss_round_prototype_1 = require("./world-boss-round-prototype");
exports.WORLD_BOSS_EVENT_PROTOTYPE_VERSION = 'world-boss-v7-draft';
exports.WORLD_BOSS_MAX_ATTEMPTS = 3;
const positiveWhole = (v) => Number.isSafeInteger(v) && v >= 0;
const amount = (v) => Math.max(0, Math.floor(v));
const nonempty = (s) => typeof s === 'string' && s.trim().length > 0 && s.length <= 160;
const receiptKey = (account, request) => JSON.stringify([account, request]);
const committedSeed = (eventId, command) => [
    exports.WORLD_BOSS_EVENT_PROTOTYPE_VERSION, eventId, command.accountId, command.serverSeed ?? command.requestId,
].join(':');
function createWorldBossEventPrototype(input) {
    if (!nonempty(input.eventId) || !positiveWhole(input.startsAtUtcMs) || !positiveWhole(input.endsAtUtcMs) ||
        input.startsAtUtcMs >= input.endsAtUtcMs || !positiveWhole(input.maxHp) || input.maxHp === 0)
        throw Error('world_boss_invalid_event_definition');
    if (!['hollowroot', 'sunscar', 'frostmarch'].includes(input.boss))
        throw Error('world_boss_unknown_boss');
    return { eventId: input.eventId, boss: input.boss, startsAtUtcMs: input.startsAtUtcMs,
        endsAtUtcMs: input.endsAtUtcMs, maxHp: input.maxHp, remainingHp: input.maxHp, revision: 0,
        receipts: {}, crossedThresholds: [] };
}
function worldBossPhaseAtStart(event) {
    const pct = event.remainingHp / event.maxHp;
    if (pct <= .30)
        return 'enraged';
    if (pct <= .70)
        return 'exposed';
    return 'armored';
}
function validateResolvedSquad(command) {
    const list = command.squad;
    if (list.length !== 4)
        throw Error('world_boss_requires_four_fighters');
    if (list[0]?.ownerAccountId !== command.accountId || list[0]?.npc)
        throw Error('world_boss_initiator_must_match_account');
    if (!list.every(x => nonempty(x.snapshotId) && nonempty(x.ownerAccountId)))
        throw Error('world_boss_missing_server_snapshot');
    if (new Set(list.map(x => x.snapshotId)).size !== 4)
        throw Error('world_boss_duplicate_snapshot');
    if (new Set(list.filter(x => !x.npc).map(x => x.ownerAccountId)).size !== list.filter(x => !x.npc).length)
        throw Error('world_boss_duplicate_player_echo');
    const defs = list.map(x => x.resolvedCombatant);
    if (new Set(defs.map(x => x.id)).size !== 4)
        throw Error('world_boss_duplicate_actor');
    if (defs.some(p => p.team !== 'players' || !positiveWhole(p.level) ||
        !Number.isFinite(p.stats.maxHp) || p.stats.maxHp <= 0 ||
        !Number.isFinite(p.stats.attackPower) || p.stats.attackPower <= 0))
        throw Error('world_boss_invalid_combatant');
    const roles = defs.map(x => x.role);
    if (roles.filter(x => x === 'tank').length !== 1 || roles.filter(x => x === 'damage').length !== 2 ||
        roles.filter(x => x === 'support').length !== 1)
        throw Error('world_boss_invalid_formation');
}
function assertEventHealth(state) {
    if (!positiveWhole(state.maxHp) || !positiveWhole(state.remainingHp) || state.remainingHp > state.maxHp ||
        !positiveWhole(state.revision))
        throw Error('world_boss_invalid_health_state');
}
function sameCommand(receipt, command) {
    return receipt.accountId === command.accountId && receipt.characterId === command.characterId &&
        receipt.atUtcMs === command.atUtcMs && receipt.order === command.order &&
        receipt.seed === committedSeed(receipt.eventId, command) &&
        receipt.snapshotDigest === command.snapshotDigest &&
        receipt.snapshotIds.length === command.squad.length &&
        receipt.snapshotIds.every((id, i) => id === command.squad[i].snapshotId);
}
/**
 * Pure serial command reducer — a mock for a future DB transaction with
 * SELECT ... FOR UPDATE / unique (event_id, account_id, request_id).
 * A future service must authenticate the account, resolve equipment snapshots
 * and seed server-side, then lock the event and account receipt row. Do NOT
 * directly expose this prototype to a mobile client or use it to grant currency.
 */
function applyWorldBossAttemptPrototype(event, command) {
    assertEventHealth(event);
    if (!nonempty(command.accountId) || !nonempty(command.characterId) || !nonempty(command.requestId) ||
        !positiveWhole(command.atUtcMs))
        throw Error('world_boss_invalid_attempt_identifiers');
    const key = receiptKey(command.accountId, command.requestId);
    const existing = event.receipts[key];
    // Replay works after the event has ended or the boss has died. No re-simulation.
    if (existing) {
        if (!sameCommand(existing, command))
            throw Error('world_boss_idempotency_payload_mismatch');
        return { event, receipt: existing, repeated: true };
    }
    if (command.atUtcMs < event.startsAtUtcMs || command.atUtcMs >= event.endsAtUtcMs)
        throw Error('world_boss_event_not_active');
    const used = Object.values(event.receipts).filter(r => r.accountId === command.accountId).length;
    if (used >= exports.WORLD_BOSS_MAX_ATTEMPTS)
        throw Error('world_boss_attempt_limit');
    validateResolvedSquad(command);
    const phase = worldBossPhaseAtStart(event);
    if (command.serverSeed !== undefined && (!/^[A-Za-z0-9:_-]{24,512}$/.test(command.serverSeed)))
        throw Error('world_boss_invalid_server_seed');
    if (command.snapshotDigest !== undefined && !/^[a-f0-9]{64}$/.test(command.snapshotDigest))
        throw Error('world_boss_invalid_snapshot_digest');
    const seed = committedSeed(event.eventId, command);
    // Pure local simulation first. Any exception means zero new attempts or world HP mutation.
    // No caller-supplied combat damage is accepted.
    const battle = (0, world_boss_round_prototype_1.simulateWorldBossRounds)({
        seed, boss: event.boss, phase,
        players: command.squad.map(x => x.resolvedCombatant), order: command.order,
    });
    const originalHp = event.remainingHp;
    const residualEcho = originalHp === 0;
    const worldHpCredited = residualEcho ? 0 : Math.min(originalHp, amount(battle.bossHpDamage));
    const after = originalHp - worldHpCredited;
    const newThresholds = [...event.crossedThresholds];
    for (const [pct, threshold] of [[70, .70], [30, .30], [0, 0]]) {
        if (!newThresholds.includes(pct) && originalHp / event.maxHp > threshold && after / event.maxHp <= threshold)
            newThresholds.push(pct);
    }
    const receipt = {
        eventId: event.eventId, requestId: command.requestId, accountId: command.accountId,
        characterId: command.characterId, ordinal: used + 1, atUtcMs: command.atUtcMs,
        phase, boss: event.boss, order: command.order, engineVersion: exports.WORLD_BOSS_EVENT_PROTOTYPE_VERSION,
        seed, snapshotIds: command.squad.map(x => x.snapshotId), snapshotDigest: command.snapshotDigest,
        completedRounds: battle.roundsCompleted, survived: battle.survived,
        rawCombatDamage: battle.bossHpDamage, localGuardDamage: battle.localGuardDamage,
        hpBefore: originalHp, hpAfter: after, worldHpCredited, residualEcho,
        hypotheticalBaseSigils: battle.survived && battle.roundsCompleted === 14 ? 10 : 5,
        replay: battle,
    };
    const next = {
        ...event, remainingHp: after, revision: event.revision + 1,
        receipts: { ...event.receipts, [key]: receipt }, crossedThresholds: newThresholds,
    };
    return { event: next, receipt, repeated: false };
}
