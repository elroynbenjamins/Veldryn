"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORLD_BOSS_V16_ATTEMPT_COMMAND_LIVE = void 0;
exports.prepareOrResumeWorldBossAttemptV16 = prepareOrResumeWorldBossAttemptV16;
/**
 * World Boss V16 — DISABLED, server-only attempt idempotency boundary.
 *
 * A retry MUST read the (event, principal, request) reservation BEFORE calling
 * prepareWorldBossRosterV9. Otherwise a new random seed / roster may be
 * generated and an entirely legitimate lost-ACK retry can fail or reroll.
 *
 * The store MUST be an authenticated, transactionally safe server service.
 * This adapter neither authenticates users nor implements a PostgreSQL store.
 * Its tests inject the older single-process V10 emulator ONLY. No API route,
 * staging/production DB, wallet, events, inventory, or player data are used.
 */
const world_boss_verified_roster_v9_1 = require("./world-boss-verified-roster-v9");
exports.WORLD_BOSS_V16_ATTEMPT_COMMAND_LIVE = false;
const SAFE = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,159}$/;
const REQUEST = /^[A-Za-z0-9_-]{8,128}$/;
const valid = (value) => typeof value === 'string' && SAFE.test(value);
/**
 * Service-only coordinator; the command holds ONLY a character selector,
 * event, request key and War Order. Never accept a mobile-submitted roster,
 * source GameState, CP, class, phase, war supplies, seed, or replay here.
 *
 * A racing worker may prepare a different seed after observing no record;
 * if the storage transaction rejects the stale insert as an idempotency
 * conflict, return the ORIGINAL reservation after a second verified read.
 * Never overwrite the winning attempt or replay the losing candidate.
 */
async function prepareOrResumeWorldBossAttemptV16(input) {
    const { command, loader, store } = input;
    if (!command || !loader || !store ||
        !valid(loader.principalAccountId) || !valid(command.eventId) ||
        !valid(command.characterId) || !REQUEST.test(command.requestId) ||
        !['break_armor', 'steady_assault', 'hold_line'].includes(command.order) ||
        typeof store.read !== 'function' || typeof store.reserveAtomic !== 'function' ||
        typeof loader.nowUtcMs !== 'function' ||
        typeof loader.randomSeed !== 'function' ||
        typeof loader.loadCurrentCharacter !== 'function' ||
        typeof loader.listEligibleEchoes !== 'function')
        throw Error('world_boss_v16_invalid_server_command');
    const accountId = loader.principalAccountId;
    const query = { eventId: command.eventId, accountId, requestId: command.requestId };
    function verifyExisting(reservation) {
        if (reservation.eventId !== query.eventId ||
            reservation.accountId !== query.accountId ||
            reservation.requestId !== query.requestId)
            throw Error('world_boss_v16_store_returned_foreign_reservation');
        if (reservation.characterId !== command.characterId ||
            reservation.order !== command.order)
            throw Error('world_boss_v16_request_id_reused_with_different_intent');
        if (!['reserved', 'committed', 'voided'].includes(reservation.status) ||
            !Number.isInteger(reservation.ordinal) ||
            reservation.ordinal < 1 || reservation.ordinal > 3 ||
            !reservation.command ||
            reservation.command.accountId !== query.accountId ||
            reservation.command.characterId !== command.characterId ||
            reservation.command.requestId !== command.requestId ||
            reservation.command.order !== command.order ||
            reservation.command.serverSeed !== reservation.serverSeed ||
            reservation.command.snapshotDigest !== reservation.snapshotDigest ||
            !/^[a-f0-9]{64}$/.test(reservation.snapshotDigest) ||
            !/^[A-Za-z0-9:_-]{24,512}$/.test(reservation.serverSeed) ||
            (reservation.status === 'committed' &&
                (!reservation.settlement ||
                    reservation.settlement.eventId !== query.eventId ||
                    reservation.settlement.accountId !== query.accountId ||
                    reservation.settlement.requestId !== query.requestId)) ||
            (reservation.status !== 'committed' && Boolean(reservation.settlement)))
            throw Error('world_boss_v16_invalid_reservation_receipt');
        return structuredClone(reservation);
    }
    const existing = await store.read(query);
    if (existing) {
        return { reservation: verifyExisting(existing), repeated: true,
            freshlyPrepared: false, persistedByRealDatabase: false };
    }
    const now = loader.nowUtcMs();
    if (!Number.isSafeInteger(now) || now <= 0)
        throw Error('world_boss_v16_invalid_server_clock');
    // V9 includes the request object in JSON.stringify before SHA256; normalize
    // the exact property order expected by V10's canonical digest verifier.
    const canonicalCommand = {
        eventId: command.eventId, characterId: command.characterId,
        requestId: command.requestId, order: command.order,
    };
    const prepared = await (0, world_boss_verified_roster_v9_1.prepareWorldBossRosterV9)(loader, canonicalCommand);
    if (prepared.command.accountId !== accountId ||
        prepared.command.characterId !== command.characterId)
        throw Error('world_boss_v16_preparation_identity_mismatch');
    try {
        const reply = await store.reserveAtomic({ eventId: command.eventId, prepared, nowUtcMs: now });
        const canonical = verifyExisting(reply.reservation);
        // A store may report repeated=true if a concurrent insert won. Never tell
        // the caller that a losing freshly generated roster is the committed one.
        return { reservation: canonical, repeated: reply.repeated,
            freshlyPrepared: !reply.repeated, persistedByRealDatabase: false };
    }
    catch (error) {
        // Recover ONLY the known reservation conflict, never broad DB failures.
        if (!(error instanceof Error) ||
            error.message !== 'world_boss_v10_idempotency_payload_mismatch')
            throw error;
        const canonical = await store.read(query);
        if (!canonical)
            throw error;
        return { reservation: verifyExisting(canonical), repeated: true,
            freshlyPrepared: false, persistedByRealDatabase: false };
    }
}
