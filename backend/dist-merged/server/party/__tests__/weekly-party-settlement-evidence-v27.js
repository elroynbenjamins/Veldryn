"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const weekly_party_settlement_evidence_v27_1 = require("../weekly-party-settlement-evidence-v27");
const weekly_party_rewards_v2_1 = require("../weekly-party-rewards-v2");
const offer = '11111111-1111-4111-8111-111111111111';
const account = '22222222-2222-4222-8222-222222222222';
const character = '33333333-3333-4333-8333-333333333333';
const party = '44444444-4444-4444-8444-444444444444';
const reservation = '55555555-5555-4555-8555-555555555555';
const start = '2026-11-01T00:00:00+00:00';
const hash = 'a'.repeat(64), candidate = 'b'.repeat(64), replay = 'c'.repeat(64);
const reward = (0, weekly_party_rewards_v2_1.partyEventRewardBundle)({
    difficulty: 'standard', performanceBand: 2, personalPoints: 20, choice: 'artisan',
});
function must(ok, label) {
    if (!ok)
        throw Error('party-v27-test: ' + label);
}
function denies(fn, message) {
    try {
        fn();
        throw Error('unexpected_success');
    }
    catch (e) {
        must(String(e).includes(message), 'expected ' + message + ' got ' + String(e));
    }
}
async function deniesAsync(fn, message) {
    try {
        await fn();
        throw Error('unexpected_success');
    }
    catch (e) {
        must(String(e).includes(message), 'expected ' + message + ' got ' + String(e));
    }
}
function clean() {
    const base = {
        offerId: offer, accountId: account, characterId: character,
        reservationId: reservation, eventStartsAt: start,
        rewardKind: 'artisan', rewardModel: 'party-event-rewards-v2',
        quote: { ...reward, materials: { ...reward.materials } },
        quoteHash: hash, grantsDisabled: true,
    };
    return {
        offerId: offer, accountId: account, partyId: party, reservationId: reservation,
        eventStartsAt: start, frozenCharacterId: character, activeCharacterId: character,
        savedCharacterId: character, characterOwned: true, rosterRole: 'damage',
        difficulty: 'standard', weekStatus: 'closed', weekStage: 3,
        settlementWindowOpen: true, eligibility: 'full', personalPoints: 20,
        rewardBand: 2, rewardModel: 'party-event-rewards-v2',
        lockedChoice: 'artisan', choiceOwned: true, choicePayoutFlagsDisabled: true,
        batchCandidateHash: candidate, attestedCandidateHash: candidate,
        batchReplayHash: replay, attestedReplayHash: replay,
        attestedRewardBand: 2, attestedRuleset: 'party-event-day8-combat-v4',
        attestedResourceAudit: 'greenfields-verified-gathering-v22',
        attestedGrantsDisabled: true, batchGrantsDisabled: true,
        offerGrantsDisabled: true, onlineRevision: 15,
        walletGold: '1500', projectedCharacterGold: '1500',
        savedCharacterGold: '1500',
        intent: { ...base, onlineRevision: 10, walletBefore: '1000' },
        preflight: { ...base, onlineRevision: 12, difficulty: 'standard',
            sourceCandidateHash: candidate, sourceReplayHash: replay },
        claimQuote: { ...base, difficulty: 'standard' },
    };
}
function check(input) {
    return (0, weekly_party_settlement_evidence_v27_1.verifyPrivatePartyEventEvidenceV27)({
        offerId: offer, trustedAccountId: account, proof: input,
    });
}
const valid = check(clean());
// A successfully sealed/boss-attested event may become globally settled
// before every enrolled character can open their one-time reward Inbox.
const afterSettled = check({ ...clean(), weekStatus: 'settled' });
must(afterSettled.evidenceReconciled && !afterSettled.claimable, 'post-settlement unpaid offer remains reviewable');
denies(() => check({ ...clean(), weekStatus: 'cancelled' }), 'invalid_week_or_settlement_window');
must(!weekly_party_settlement_evidence_v27_1.PARTY_EVENT_EVIDENCE_V27_RELEASED, 'read prototype remains hidden');
must(valid.evidenceReconciled && valid.historicalSnapshotsStale
    && valid.reward.gold === 2150
    && !valid.payoutEnabled && !valid.economyApplied
    && !valid.claimable && !valid.claimed && !valid.entitled
    && !valid.inboxDelivered && valid.blockers.length === 3, 'validated proof stays nonpaying even with a complete chain');
const same = clean();
if (same.intent && same.preflight) {
    same.intent.onlineRevision = 15;
    same.intent.walletBefore = '1500';
    same.preflight.onlineRevision = 15;
}
must(!check(same).historicalSnapshotsStale, 'fresh historical snapshots');
denies(() => check({ ...clean(), activeCharacterId: account }), 'frozen_character_not_active');
denies(() => check({ ...clean(), savedCharacterId: null }), 'frozen_character_not_active');
denies(() => check({ ...clean(), accountId: character }), 'offer_identity_mismatch');
denies(() => check({ ...clean(), weekStage: 2 }), 'invalid_week_or_settlement_window');
denies(() => check({ ...clean(), settlementWindowOpen: false }), 'invalid_week_or_settlement_window');
denies(() => check({ ...clean(), lockedChoice: 'warrior' }), 'v25_record_identity_mismatch');
denies(() => check({ ...clean(), attestedReplayHash: 'd'.repeat(64) }), 'replay_provenance_mismatch');
denies(() => check({ ...clean(), attestedGrantsDisabled: false }), 'historical_grants_flag_enabled');
denies(() => check({ ...clean(), intent: null }), 'incomplete_v25_preflight');
denies(() => check({ ...clean(), claimQuote: null }), 'incomplete_v25_preflight');
denies(() => check({ ...clean(), walletGold: '1501' }), 'gold_projection_conflict');
denies(() => check({ ...clean(), intent: { ...clean().intent, quoteHash: 'f'.repeat(64) } }), 'v25_quote_conflict');
denies(() => check({ ...clean(), intent: {
        ...clean().intent, accountId: character,
    } }), 'v25_record_identity_mismatch');
denies(() => check({ ...clean(), preflight: {
        ...clean().preflight, sourceCandidateHash: 'f'.repeat(64),
    } }), 'v25_source_hash_mismatch');
denies(() => check({ ...clean(), claimQuote: {
        ...clean().claimQuote, quote: { ...reward, gold: 987654 },
    } }), 'reward_formula_mismatch');
denies(() => check({ ...clean(), intent: {
        ...clean().intent, quote: { ...reward, materials: { ...reward.materials, GEM_DUST: 10 } },
    } }), 'reward_material_quantity_mismatch');
denies(() => check({ ...clean(), preflight: {
        ...clean().preflight, grantsDisabled: false,
    } }), 'v25_record_identity_mismatch');
async function test() {
    let called = 0;
    const reader = {
        readEvidence: async (o, a) => {
            called++;
            must(o === offer && a === account, 'trusted exact-query identity');
            return clean();
        },
    };
    await deniesAsync(() => (0, weekly_party_settlement_evidence_v27_1.readVerifiedPrivatePartyEvidenceV27)({
        gateEnabled: false, offerId: offer, trustedAccountId: account, reader,
    }), 'release_gate_disabled');
    must(called === 0, 'disabled gate must not access private rows');
    await deniesAsync(() => (0, weekly_party_settlement_evidence_v27_1.readVerifiedPrivatePartyEvidenceV27)({
        gateEnabled: true, offerId: 'bad', trustedAccountId: account, reader,
    }), 'invalid_trusted_identity');
    must(called === 0, 'invalid IDs must not reach SQL');
    const v = await (0, weekly_party_settlement_evidence_v27_1.readVerifiedPrivatePartyEvidenceV27)({
        gateEnabled: true, offerId: offer, trustedAccountId: account, reader,
    });
    must(Number(called) === 1 && v.offerId === offer && !v.payoutEnabled, 'private evidence verified but payout remains disabled');
    await deniesAsync(() => (0, weekly_party_settlement_evidence_v27_1.claimPrivatePartyEventRewardV27)(), 'atomic_payout_unreleased');
    console.log('Party Events v27: immutable v25 agreement, provenance, stale revisions, owned character, all payouts denied');
}
void test().catch(e => { console.error(e); process.exitCode = 1; });
