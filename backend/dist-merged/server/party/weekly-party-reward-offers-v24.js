"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARTY_EVENT_REWARD_OFFERS_V24_RELEASED = void 0;
exports.preparePrivatePartyRewardOffersV24 = preparePrivatePartyRewardOffersV24;
exports.lockPrivatePartyRewardChoiceV24 = lockPrivatePartyRewardChoiceV24;
exports.readPrivatePartyRewardInboxV24 = readPrivatePartyRewardInboxV24;
/**
 * Hidden Party Events v24: private, nonpaying reward-offer orchestration.
 *
 * Never accept Event Points, performance bands, offer amounts or player IDs
 * from a mobile request. The SQL writer resolves those from v14/v15 verified
 * EP, v19 immutable previews and v23 worker replay attestation.
 *
 * This does NOT construct a spendable entitlement or deliver an Inbox item.
 */
const weekly_party_rewards_v2_1 = require("./weekly-party-rewards-v2");
exports.PARTY_EVENT_REWARD_OFFERS_V24_RELEASED = false;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function must(ok, code) {
    if (!ok)
        throw new Error('party_event_v24_' + code);
}
function requireGate(enabled) {
    must(enabled, 'release_gate_disabled');
}
/** The request id is fixed by the server, never a user-supplied dedupe key. */
async function preparePrivatePartyRewardOffersV24(input) {
    requireGate(input.gateEnabled);
    must(UUID.test(input.reservationId), 'invalid_reservation');
    const result = await input.repository.prepareOffers(input.reservationId, 'party-event-v24-offers:' + input.reservationId.toLowerCase());
    must(result.reservationId === input.reservationId
        && result.offersPrepared === true
        && result.entitlementsCreated === false
        && result.rewardsClaimable === false
        && result.rewardsGranted === false
        && typeof result.replayed === 'boolean'
        && Number.isInteger(result.memberCount)
        && result.memberCount >= 2 && result.memberCount <= 4
        && Number.isInteger(result.offerCount)
        && result.offerCount >= 0 && result.offerCount <= result.memberCount, 'invalid_offer_preparation_receipt');
    return result;
}
/**
 * Only a server-authenticated owner may select a reward. This helper has no
 * HTTP route and never trusts client-asserted ownership.
 */
async function lockPrivatePartyRewardChoiceV24(input) {
    requireGate(input.gateEnabled);
    must(UUID.test(input.offerId) && UUID.test(input.trustedAccountId), 'invalid_offer_identity');
    must(weekly_party_rewards_v2_1.PARTY_EVENT_CACHE_CHOICES.includes(input.choice), 'invalid_choice');
    const result = await input.repository.lockChoice(input.offerId, input.trustedAccountId, input.choice, 'party-event-v24-choice:' + input.offerId.toLowerCase());
    must(result.offerId === input.offerId
        && result.choice === input.choice
        && result.choiceLocked === true
        && typeof result.replayed === 'boolean'
        && result.rewardsClaimable === false && result.rewardsGranted === false, 'invalid_choice_lock_receipt');
    return result;
}
/**
 * Private preview reader; it cannot return a spendable reward, regardless of
 * the viewer's EP or selected choice.
 */
async function readPrivatePartyRewardInboxV24(input) {
    requireGate(input.gateEnabled);
    must(UUID.test(input.trustedAccountId), 'invalid_account');
    const inbox = await input.repository.readInboxPreview(input.trustedAccountId);
    must(Array.isArray(inbox?.offers)
        && inbox.claimEnabled === false
        && inbox.entitlementsCreated === false
        && inbox.rewardsGranted === false, 'invalid_inbox_flags');
    const seen = new Set();
    for (const row of inbox.offers) {
        must(UUID.test(row.offerId) && UUID.test(row.reservationId)
            && typeof row.eventStartsAt === 'string'
            && Number.isInteger(row.personalPoints)
            && row.personalPoints >= 5 && row.personalPoints <= 60
            && Number.isInteger(row.rewardBand)
            && row.rewardBand >= 1 && row.rewardBand <= 6
            && row.claimable === false && row.granted === false && row.entitlement === false
            && !seen.has(row.offerId), 'invalid_offer_preview');
        seen.add(row.offerId);
        must((0, weekly_party_rewards_v2_1.partyEventRewardEligibility)(row.personalPoints) === row.eligibility, 'offer_eligibility_mismatch');
        if (row.eligibility === 'participation') {
            must(row.status === 'participation_preview'
                && row.selectedChoice === null && row.choiceLocked === false, 'invalid_participation_offer');
        }
        else if (row.choiceLocked) {
            must(row.status === 'choice_locked_preview'
                && row.selectedChoice !== null
                && weekly_party_rewards_v2_1.PARTY_EVENT_CACHE_CHOICES.includes(row.selectedChoice), 'invalid_locked_choice_offer');
        }
        else {
            must(row.status === 'awaiting_choice_preview'
                && row.selectedChoice === null, 'invalid_awaiting_choice_offer');
        }
    }
    return inbox;
}
