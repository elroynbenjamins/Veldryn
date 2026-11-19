"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARTY_EVENT_BOSS_RESOURCE_AUDIT_V23 = exports.PARTY_EVENT_BOSS_ATTESTATION_V23_RELEASED = void 0;
exports.attestPrivatePartyBossReplayV23 = attestPrivatePartyBossReplayV23;
/**
 * Hidden Party Events v23 — trusted server-only replay -> durable attestation.
 *
 * The caller provides ONLY an issued reservation UUID. The actual combat
 * result must come from v21's privately read, single-MVCC source bundle,
 * audited v22 gameplay items and v20 independent deterministic simulation.
 * A committed attestation is not an economy grant or a claimable reward.
 */
const weekly_party_boss_reader_v21_1 = require("./weekly-party-boss-reader-v21");
exports.PARTY_EVENT_BOSS_ATTESTATION_V23_RELEASED = false;
exports.PARTY_EVENT_BOSS_RESOURCE_AUDIT_V23 = 'greenfields-verified-gathering-v22';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const HEX = /^[a-f0-9]{64}$/;
function assert(ok, code) {
    if (!ok)
        throw new Error('party_event_v23_' + code);
}
/**
 * This call is only valid inside a privileged private worker. No cron/route
 * is wired and the gate remains off until explicit release approval.
 */
async function attestPrivatePartyBossReplayV23(input) {
    assert(input.gateEnabled, 'release_gate_disabled');
    assert(UUID.test(input.reservationId), 'invalid_reservation');
    const verified = await (0, weekly_party_boss_reader_v21_1.replayPrivatePartyEventBossV21)({
        gateEnabled: input.gateEnabled, reservationId: input.reservationId,
        repository: input.repository,
    });
    const proof = verified.proof;
    assert(proof.kind === 'server_replayed_combat_not_reward_grant'
        && proof.combatReplayed === true && proof.rewardGrantAllowed === false
        && HEX.test(verified.sourceDigest) && HEX.test(proof.candidateHash)
        && HEX.test(proof.replayHash) && HEX.test(proof.frozenLoadoutHash)
        && Number.isInteger(proof.tiersCleared)
        && proof.tiersCleared >= 0 && proof.tiersCleared <= 12
        && Number.isInteger(proof.rewardBand)
        && proof.rewardBand >= 1 && proof.rewardBand <= 6, 'invalid_independent_replay_proof');
    // Deterministic request key ensures the same reservation always retries
    // the same private attestation. Caller never supplies a mutable request ID.
    const requestId = 'party-event-v23-replay:' + input.reservationId.toLowerCase();
    const recorded = await input.repository.attestReplayProof({
        reservationId: input.reservationId, requestId,
        sourceDigest: verified.sourceDigest, candidateHash: proof.candidateHash,
        replayHash: proof.replayHash, loadoutHash: proof.frozenLoadoutHash,
        tiersCleared: proof.tiersCleared, rewardBand: proof.rewardBand,
        resourceAudit: exports.PARTY_EVENT_BOSS_RESOURCE_AUDIT_V23,
    });
    assert(recorded.reservationId === input.reservationId
        && recorded.replayHash === proof.replayHash
        && typeof recorded.replayed === 'boolean'
        && recorded.workerReplayAttested === true
        && recorded.combatIndependentlyVerifiedBySql === false
        && recorded.rewardsGranted === false
        && recorded.entitlementsCreated === false, 'attestation_write_inconsistent');
    return Object.freeze({
        kind: 'trusted_worker_replay_attested_no_reward',
        reservationId: input.reservationId, sourceDigest: verified.sourceDigest,
        replayHash: proof.replayHash, tiersCleared: proof.tiersCleared,
        rewardBand: proof.rewardBand, replayed: recorded.replayed,
        rewardsGranted: false, entitlementsCreated: false,
    });
}
