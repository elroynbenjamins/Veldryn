"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARTY_EVENT_REPLAY_SNAPSHOT_V21 = exports.PARTY_EVENT_BOSS_READER_V21_RELEASED = void 0;
exports.replayPrivatePartyEventBossV21 = replayPrivatePartyEventBossV21;
/**
 * Hidden Party Events v21 — the only intended SQL -> combat replay adapter.
 *
 * The repository implementation MUST call the service-only
 * private.read_party_event_boss_replay_snapshot_v21(reservation UUID)
 * ONCE, without any client-supplied record JSON. The separate catalog reader
 * must build an audited, level-accessible canonical resource list from
 * trusted server content, never the mobile request.
 *
 * This is an in-memory, non-granting proof boundary. It is NOT a public RPC,
 * worker loop, reward settlement or economic credit.
 */
const weekly_party_boss_replay_v20_1 = require("./weekly-party-boss-replay-v20");
exports.PARTY_EVENT_BOSS_READER_V21_RELEASED = false;
exports.PARTY_EVENT_REPLAY_SNAPSHOT_V21 = 'private-party-event-replay-snapshot-v21';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX = /^[a-f0-9]{64}$/;
function assert(value, reason) {
    if (!value)
        throw new Error('party_event_v21_' + reason);
}
function object(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
/**
 * This function does NOT accept a candidate object from the caller: its only
 * identity parameter is a previously issued reservation UUID. No public route
 * invokes it, and the full Party Events feature gate is still off.
 */
async function replayPrivatePartyEventBossV21(input) {
    assert(input.gateEnabled, 'release_gate_disabled');
    assert(UUID.test(input.reservationId), 'invalid_reservation');
    const bundle = await input.repository.readReplayBundle(input.reservationId);
    assert(object(bundle)
        && bundle.version === exports.PARTY_EVENT_REPLAY_SNAPSHOT_V21
        && HEX.test(bundle.sourceDigest)
        && Number.isSafeInteger(bundle.serverNowMs) && bundle.serverNowMs > 0
        && bundle.auditedCatalogIncluded === false
        && bundle.combatReplayed === false
        && bundle.rewardGrantAllowed === false
        && object(bundle.payload), 'invalid_sql_replay_bundle');
    const p = bundle.payload;
    assert(object(p.week) && Array.isArray(p.roster)
        && Array.isArray(p.loadouts) && Array.isArray(p.orders)
        && Array.isArray(p.seals) && Array.isArray(p.votes)
        && Array.isArray(p.transitions) && object(p.finale)
        && object(p.reservation) && object(p.candidate)
        && p.reservation.id === input.reservationId
        && p.candidate.reservation_id === input.reservationId, 'reservation_bundle_mismatch');
    // Explicitly external to SQL snapshot: SQL v16 only knows item IDs and
    // category, not verified tier, gather rate or level-accessible source.
    const catalog = await input.repository.loadCanonicalResourceCatalog(bundle);
    assert(Array.isArray(catalog) && catalog.length > 0, 'canonical_resource_catalog_missing');
    const proof = (0, weekly_party_boss_replay_v20_1.replayAndVerifyPartyEventBossV20)({
        ...p, serverNowMs: bundle.serverNowMs, auditedCatalog: catalog,
    });
    assert(proof.reservationId === input.reservationId
        && proof.combatReplayed === true
        && proof.rewardGrantAllowed === false, 'replay_proof_invalid');
    return Object.freeze({
        kind: 'private_non_rewarding_replay',
        sourceDigest: bundle.sourceDigest, proof, rewardsGranted: false,
    });
}
