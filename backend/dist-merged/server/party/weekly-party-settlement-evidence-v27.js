"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARTY_EVENT_EVIDENCE_V27_RELEASED = void 0;
exports.verifyPrivatePartyEventEvidenceV27 = verifyPrivatePartyEventEvidenceV27;
exports.readVerifiedPrivatePartyEvidenceV27 = readVerifiedPrivatePartyEvidenceV27;
exports.claimPrivatePartyEventRewardV27 = claimPrivatePartyEventRewardV27;
/**
 * Hidden Party Events v27: reconcile three immutable v25 claim previews.
 *
 * This is a read-only evidence audit. It cannot reserve a claim, modify the
 * online save, create an entitlement or deliver Inbox loot. No public route.
 */
const weekly_party_claim_preflight_v25_1 = require("./weekly-party-claim-preflight-v25");
exports.PARTY_EVENT_EVIDENCE_V27_RELEASED = false;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const HASH = /^[a-f0-9]{64}$/;
const IDENTITY_ROLES = new Set(['tank', 'damage', 'support']);
function must(value, reason) {
    if (!value)
        throw new Error('party_event_v27_' + reason);
}
function object(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
function intactHash(hash) {
    return typeof hash === 'string' && HASH.test(hash);
}
function exactReward(a, b) {
    // Both bundles are first validated against the versioned deterministic
    // model; this checks exact arrays/maps without trusting a caller's order.
    const keys = Object.keys(a.materials).sort(), other = Object.keys(b.materials).sort();
    return a.kind === b.kind && a.version === b.version
        && a.performanceBand === b.performanceBand
        && a.personalPoints === b.personalPoints
        && a.gold === b.gold && a.combatXp === b.combatXp && a.skillXp === b.skillXp
        && a.companionEssence === b.companionEssence
        && a.bondstones === b.bondstones && a.partyRenown === b.partyRenown
        && JSON.stringify(keys) === JSON.stringify(other)
        && keys.every(k => a.materials[k] === b.materials[k]);
}
function verifyPrivatePartyEventEvidenceV27(input) {
    const { proof: p } = input;
    must(UUID.test(input.trustedAccountId) && UUID.test(input.offerId), 'invalid_trusted_identity');
    must(object(p), 'invalid_proof');
    must(p.accountId === input.trustedAccountId
        && p.offerId === input.offerId
        && UUID.test(p.partyId) && UUID.test(p.reservationId)
        && UUID.test(p.frozenCharacterId), 'offer_identity_mismatch');
    must(typeof p.eventStartsAt === 'string'
        && Number.isFinite(Date.parse(p.eventStartsAt)), 'invalid_event_window');
    must(p.characterOwned === true
        && p.activeCharacterId === p.frozenCharacterId
        && p.savedCharacterId === p.frozenCharacterId, 'frozen_character_not_active');
    must(IDENTITY_ROLES.has(p.rosterRole)
        && ['standard', 'veteran', 'heroic'].includes(p.difficulty)
        && p.weekStage === 3 && ['active', 'closed', 'settled'].includes(p.weekStatus)
        && p.settlementWindowOpen === true, 'invalid_week_or_settlement_window');
    must(p.rewardModel === 'party-event-rewards-v2'
        && Number.isInteger(p.rewardBand) && p.rewardBand >= 1 && p.rewardBand <= 6
        && Number.isInteger(p.personalPoints)
        && p.personalPoints >= 5 && p.personalPoints <= 60, 'invalid_offer_reward');
    const kind = p.eligibility === 'participation' ? 'participation' : p.lockedChoice;
    must((p.eligibility === 'participation' && p.personalPoints <= 14
        && p.lockedChoice === null)
        || (p.eligibility === 'full' && p.personalPoints >= 15
            && ['warrior', 'artisan', 'companion'].includes(p.lockedChoice ?? '')
            && p.choiceOwned === true
            && p.choicePayoutFlagsDisabled === true), 'invalid_immutable_choice');
    must(p.batchGrantsDisabled === true
        && p.attestedGrantsDisabled === true && p.offerGrantsDisabled === true, 'historical_grants_flag_enabled');
    for (const v of [p.batchCandidateHash, p.attestedCandidateHash,
        p.batchReplayHash, p.attestedReplayHash])
        must(intactHash(v), 'invalid_proof_hash');
    must(p.batchCandidateHash === p.attestedCandidateHash
        && p.batchReplayHash === p.attestedReplayHash
        && p.attestedRewardBand === p.rewardBand
        && p.attestedRuleset === 'party-event-day8-combat-v4'
        && p.attestedResourceAudit === 'greenfields-verified-gathering-v22', 'replay_provenance_mismatch');
    const sections = [p.intent, p.preflight, p.claimQuote];
    must(sections.every(s => object(s)), 'incomplete_v25_preflight');
    const [intent, preflight, quote] = sections;
    if (!intent || !preflight || !quote)
        throw new Error('party_event_v27_incomplete_v25_preflight');
    for (const s of sections) {
        if (!s)
            continue;
        must(s.offerId === p.offerId && s.accountId === p.accountId
            && s.characterId === p.frozenCharacterId
            && s.reservationId === p.reservationId
            && s.eventStartsAt === p.eventStartsAt
            && s.rewardModel === p.rewardModel
            && s.rewardKind === kind
            && s.grantsDisabled === true
            && intactHash(s.quoteHash), 'v25_record_identity_mismatch');
        (0, weekly_party_claim_preflight_v25_1.verifyServerPartyEventQuoteV25)(p.difficulty, s.quote);
        must(s.quote.personalPoints === p.personalPoints
            && s.quote.performanceBand === p.rewardBand
            && s.quote.kind === kind, 'v25_reward_offer_mismatch');
    }
    must(preflight.difficulty === p.difficulty
        && quote.difficulty === p.difficulty
        && preflight.sourceCandidateHash === p.attestedCandidateHash
        && preflight.sourceReplayHash === p.attestedReplayHash, 'v25_source_hash_mismatch');
    must(intent.quoteHash === preflight.quoteHash
        && intent.quoteHash === quote.quoteHash
        && exactReward(intent.quote, preflight.quote)
        && exactReward(intent.quote, quote.quote), 'v25_quote_conflict');
    // The three v25 revisions and the wallet-before are historical previews:
    // subsequent ordinary gameplay may legitimately advance them. Never reuse
    // these values as optimistic-lock requirements for a future payout.
    must(typeof p.onlineRevision === 'number'
        && Number.isSafeInteger(p.onlineRevision) && p.onlineRevision >= 0, 'online_state_missing');
    must(Number.isSafeInteger(intent.onlineRevision)
        && Number.isSafeInteger(preflight.onlineRevision)
        && intent.onlineRevision >= 0 && preflight.onlineRevision >= 0, 'historical_revision_invalid');
    const g = p.walletGold, c = p.projectedCharacterGold, s = p.savedCharacterGold;
    must(typeof g === 'string' && typeof c === 'string' && typeof s === 'string'
        && /^\d+$/.test(g) && /^\d+$/.test(c) && /^\d+$/.test(s)
        && BigInt(g) <= 9223372036854775807n
        && g === c && g === s, 'gold_projection_conflict');
    must(typeof intent.walletBefore === 'string'
        && /^\d+$/.test(intent.walletBefore)
        && BigInt(intent.walletBefore) <= 9223372036854775807n, 'historical_wallet_invalid');
    const historicalSnapshotsStale = p.onlineRevision !== intent.onlineRevision
        || p.onlineRevision !== preflight.onlineRevision
        || g !== intent.walletBefore;
    return {
        offerId: p.offerId, partyId: p.partyId, reservationId: p.reservationId,
        eventStartsAt: p.eventStartsAt, trustedAccountId: p.accountId,
        frozenCharacterId: p.frozenCharacterId,
        quoteHash: intent.quoteHash, difficulty: p.difficulty, reward: intent.quote,
        historicalSnapshotsStale, onlineRevision: p.onlineRevision,
        evidenceReconciled: true, claimable: false, entitled: false, claimed: false,
        economyApplied: false, inboxDelivered: false, payoutEnabled: false,
        blockers: [
            'party_renown_destination_not_verified',
            'xp_progression_and_online_commit_not_verified',
            'atomic_inbox_delivery_not_implemented',
        ],
    };
}
/** This gate controls the private read-only prototype, never payout. */
async function readVerifiedPrivatePartyEvidenceV27(input) {
    must(input.gateEnabled, 'release_gate_disabled');
    must(UUID.test(input.offerId) && UUID.test(input.trustedAccountId), 'invalid_trusted_identity');
    const proof = await input.reader.readEvidence(input.offerId, input.trustedAccountId);
    return verifyPrivatePartyEventEvidenceV27({
        offerId: input.offerId, trustedAccountId: input.trustedAccountId, proof,
    });
}
/** Never expose the proof as a user-selectable payout action. */
async function claimPrivatePartyEventRewardV27() {
    throw new Error('party_event_v27_atomic_payout_unreleased');
}
