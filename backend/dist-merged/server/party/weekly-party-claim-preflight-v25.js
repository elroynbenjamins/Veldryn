"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARTY_EVENT_CLAIM_PREFLIGHT_V25_RELEASED = void 0;
exports.verifyServerPartyEventQuoteV25 = verifyServerPartyEventQuoteV25;
exports.preparePrivatePartyClaimPreflightV25 = preparePrivatePartyClaimPreflightV25;
exports.claimPrivatePartyEventRewardV25 = claimPrivatePartyEventRewardV25;
/**
 * Hidden Party Events v25: trusted, non-paying claim preflight.
 *
 * Inputs are ONLY the previously issued reward offer ID and account/character
 * IDs resolved by server authentication. The database determines EP/eligibility,
 * choice, performance band, difficulty, inventory revision and reward amounts.
 *
 * DO NOT expose as a player claim or credit money/XP/materials here.
 */
const weekly_party_rewards_v2_1 = require("./weekly-party-rewards-v2");
exports.PARTY_EVENT_CLAIM_PREFLIGHT_V25_RELEASED = false;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX64 = /^[a-f0-9]{64}$/;
function must(value, reason) {
    if (!value)
        throw new Error('party_event_v25_' + reason);
}
function record(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
function verifyServerPartyEventQuoteV25(difficulty, received) {
    must(record(received), 'invalid_reward_record');
    must(received.version === weekly_party_rewards_v2_1.PARTY_EVENT_REWARD_MODEL_VERSION
        && (received.kind === 'participation' || received.kind === 'warrior'
            || received.kind === 'artisan' || received.kind === 'companion')
        && Number.isSafeInteger(received.performanceBand)
        && Number.isSafeInteger(received.personalPoints)
        && record(received.materials), 'invalid_reward_model');
    const kind = received.kind;
    const expected = (0, weekly_party_rewards_v2_1.partyEventRewardBundle)({
        difficulty, performanceBand: received.performanceBand,
        personalPoints: received.personalPoints,
        choice: kind === 'participation' ? undefined : kind,
    });
    const expectedKeys = Object.keys(expected).sort();
    must(Object.keys(received).sort().join('|') === expectedKeys.join('|'), 'reward_shape_mismatch');
    for (const key of expectedKeys) {
        if (key === 'materials')
            continue;
        must(received[key] === expected[key], 'reward_formula_mismatch:' + key);
    }
    const expectedMaterials = expected.materials;
    const actualMaterials = received.materials;
    const keys = Object.keys(expectedMaterials).sort();
    must(Object.keys(actualMaterials).sort().join('|') === keys.join('|'), 'reward_materials_mismatch');
    for (const key of keys) {
        must(actualMaterials[key] === expectedMaterials[key], 'reward_material_quantity_mismatch:' + key);
    }
}
/**
 * Returns an immutable DRY-RUN receipt, not an economic grant, inventory
 * reservation, claimable entitlement or an Inbox message.
 *
 * A future payout must recheck the inventory at actual atomic commit time.
 */
async function preparePrivatePartyClaimPreflightV25(input) {
    must(input.gateEnabled, 'release_gate_disabled');
    must(UUID.test(input.offerId) && UUID.test(input.trustedAccountId)
        && UUID.test(input.trustedCharacterId), 'invalid_claim_identity');
    // The same offer can never generate two idempotency identities.
    const requestId = 'party-event-v25-preflight:' + input.offerId.toLowerCase();
    const receipt = await input.repository.prepareClaimPreflight({
        offerId: input.offerId, accountId: input.trustedAccountId,
        characterId: input.trustedCharacterId, requestId,
    });
    must(record(receipt)
        && receipt.offerId === input.offerId
        && receipt.accountId === input.trustedAccountId
        && receipt.characterId === input.trustedCharacterId
        && HEX64.test(receipt.rewardHash)
        && (receipt.difficulty === 'standard' || receipt.difficulty === 'veteran'
            || receipt.difficulty === 'heroic')
        && Number.isSafeInteger(receipt.inventoryRevision)
        && receipt.inventoryRevision >= 0
        && (receipt.conservativeSlotsNeeded === 0 || receipt.conservativeSlotsNeeded === 1)
        && typeof receipt.replayed === 'boolean'
        && receipt.preflightRecorded === true
        && receipt.payoutAuthorized === false
        && receipt.claimable === false && receipt.claimed === false
        && receipt.rewardsGranted === false, 'invalid_nonpaying_receipt');
    verifyServerPartyEventQuoteV25(receipt.difficulty, receipt.reward);
    const kind = receipt.reward.kind;
    must(receipt.needsSkillTarget === (kind === 'artisan')
        && receipt.needsCombatXpRouter === (kind === 'warrior')
        && receipt.needsCompanionRouter === (kind === 'companion')
        && receipt.conservativeSlotsNeeded ===
            (Object.values(receipt.reward.materials).some(v => v > 0) ? 1 : 0), 'invalid_reward_routing');
    return Object.freeze(receipt);
}
/** Explicit fail-closed function until economy + Inbox claim is audited. */
function claimPrivatePartyEventRewardV25() {
    throw new Error('party_event_v25_claim_disabled_pending_economy_audit');
}
