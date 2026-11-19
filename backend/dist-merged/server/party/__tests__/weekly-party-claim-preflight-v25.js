"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const weekly_party_rewards_v2_1 = require("../weekly-party-rewards-v2");
const weekly_party_claim_preflight_v25_1 = require("../weekly-party-claim-preflight-v25");
function assert(ok, message) {
    if (!ok)
        throw Error('party_claim_v25_test: ' + message);
}
function rejectSync(fn, needle) {
    try {
        fn();
        throw Error('unexpected_success');
    }
    catch (e) {
        assert(String(e).includes(needle), 'wanted ' + needle + ' got ' + String(e));
    }
}
async function rejectAsync(fn, needle) {
    try {
        await fn();
        throw Error('unexpected_success');
    }
    catch (e) {
        assert(String(e).includes(needle), 'wanted ' + needle + ' got ' + String(e));
    }
}
const clone = (value) => structuredClone(value);
assert(weekly_party_claim_preflight_v25_1.PARTY_EVENT_CLAIM_PREFLIGHT_V25_RELEASED === false, 'actual player payouts must remain disabled');
assert(weekly_party_rewards_v2_1.PARTY_EVENT_REWARD_MODEL_VERSION === 'party-event-rewards-v2', 'review reward economy model if version changes');
// 72 deterministic reward quotes (18 bands/difficulties x 4 eligible
// choices), not user-supplied amounts. Verify shape, rate and materials.
let tested = 0;
const difficulties = ['standard', 'veteran', 'heroic'];
for (const difficulty of difficulties)
    for (let band = 1; band <= 6; band++) {
        const participation = (0, weekly_party_rewards_v2_1.partyEventRewardBundle)({
            difficulty, performanceBand: band, personalPoints: 5,
        });
        (0, weekly_party_claim_preflight_v25_1.verifyServerPartyEventQuoteV25)(difficulty, clone(participation));
        tested++;
        for (const choice of ['warrior', 'artisan', 'companion']) {
            const expected = (0, weekly_party_rewards_v2_1.partyEventRewardBundle)({
                difficulty, performanceBand: band, personalPoints: 15, choice,
            });
            (0, weekly_party_claim_preflight_v25_1.verifyServerPartyEventQuoteV25)(difficulty, clone(expected));
            tested++;
        }
    }
assert(tested === 72, 'incomplete deterministic reward parity matrix');
const quote = (0, weekly_party_rewards_v2_1.partyEventRewardBundle)({ difficulty: 'standard',
    performanceBand: 1, personalPoints: 15, choice: 'artisan' });
const tamper = (mutate, needle) => {
    const copy = clone(quote);
    mutate(copy);
    rejectSync(() => (0, weekly_party_claim_preflight_v25_1.verifyServerPartyEventQuoteV25)('standard', copy), needle);
};
tamper(x => { x.gold += 1000; }, 'reward_formula_mismatch');
tamper(x => { x.skillXp = 0; }, 'reward_formula_mismatch');
tamper(x => { x.materials.GEM_DUST = 100; }, 'reward_material_quantity_mismatch');
tamper(x => { x.materials.CHEAT_LOOT = 1; }, 'reward_materials_mismatch');
tamper(x => { x.personalPoints = 5; }, 'party_event_participation_has_no_cache');
tamper(x => { x.kind = 'warrior'; }, 'reward_formula_mismatch');
tamper(x => { x.partyRenown = 100; }, 'reward_formula_mismatch');
tamper(x => { x.untrustedExtra = true; }, 'reward_shape_mismatch');
const offerId = '11111111-1111-4111-8111-111111111111';
const accountId = '22222222-2222-4222-8222-222222222222';
const characterId = '33333333-3333-4333-8333-333333333333';
const base = {
    replayed: false, offerId, accountId, characterId, difficulty: 'standard',
    rewardHash: 'a'.repeat(64), reward: quote, inventoryRevision: 13,
    conservativeSlotsNeeded: 1, needsSkillTarget: true,
    needsCombatXpRouter: false, needsCompanionRouter: false,
    preflightRecorded: true, payoutAuthorized: false, claimable: false,
    claimed: false, rewardsGranted: false,
};
async function main() {
    let calls = 0;
    const repo = {
        prepareClaimPreflight: async (args) => {
            calls++;
            assert(args.offerId === offerId
                && args.accountId === accountId
                && args.characterId === characterId
                && args.requestId === 'party-event-v25-preflight:' + offerId, 'server must derive offer-owner identity and replay request ID');
            return { ...clone(base), replayed: calls > 1 };
        },
    };
    await rejectAsync(() => (0, weekly_party_claim_preflight_v25_1.preparePrivatePartyClaimPreflightV25)({
        gateEnabled: false, offerId, trustedAccountId: accountId,
        trustedCharacterId: characterId, repository: repo,
    }), 'release_gate_disabled');
    await rejectAsync(() => (0, weekly_party_claim_preflight_v25_1.preparePrivatePartyClaimPreflightV25)({
        gateEnabled: true, offerId: 'client-crafted-offer',
        trustedAccountId: accountId, trustedCharacterId: characterId, repository: repo,
    }), 'invalid_claim_identity');
    assert(calls === 0, 'disabled/invalid request cannot touch private SQL');
    const first = await (0, weekly_party_claim_preflight_v25_1.preparePrivatePartyClaimPreflightV25)({
        gateEnabled: true, offerId, trustedAccountId: accountId,
        trustedCharacterId: characterId, repository: repo,
    });
    const repeat = await (0, weekly_party_claim_preflight_v25_1.preparePrivatePartyClaimPreflightV25)({
        gateEnabled: true, offerId, trustedAccountId: accountId,
        trustedCharacterId: characterId, repository: repo,
    });
    assert(Number(calls) === 2 && !first.replayed && repeat.replayed
        && first.reward.kind === 'artisan' && first.reward.gold === 1700
        && first.reward.skillXp === 2250 && first.needsSkillTarget
        && first.payoutAuthorized === false && first.rewardsGranted === false
        && repeat.rewardHash === first.rewardHash, 'exact retry must not credit item/currency or mutate quote');
    await rejectAsync(() => (0, weekly_party_claim_preflight_v25_1.preparePrivatePartyClaimPreflightV25)({
        gateEnabled: true, offerId, trustedAccountId: accountId,
        trustedCharacterId: characterId,
        repository: { prepareClaimPreflight: async () => ({
                ...clone(base), payoutAuthorized: true,
            }) },
    }), 'invalid_nonpaying_receipt');
    await rejectAsync(() => (0, weekly_party_claim_preflight_v25_1.preparePrivatePartyClaimPreflightV25)({
        gateEnabled: true, offerId, trustedAccountId: accountId,
        trustedCharacterId: characterId,
        repository: { prepareClaimPreflight: async () => ({
                ...clone(base), reward: { ...quote, gold: 999999 },
            }) },
    }), 'reward_formula_mismatch');
    await rejectAsync(() => (0, weekly_party_claim_preflight_v25_1.preparePrivatePartyClaimPreflightV25)({
        gateEnabled: true, offerId, trustedAccountId: accountId,
        trustedCharacterId: characterId,
        repository: { prepareClaimPreflight: async () => ({
                ...clone(base), needsSkillTarget: false,
            }) },
    }), 'invalid_reward_routing');
    await rejectAsync(() => (0, weekly_party_claim_preflight_v25_1.preparePrivatePartyClaimPreflightV25)({
        gateEnabled: true, offerId, trustedAccountId: accountId,
        trustedCharacterId: characterId,
        repository: { prepareClaimPreflight: async () => ({
                ...clone(base), characterId: '44444444-4444-4444-8444-444444444444',
            }) },
    }), 'invalid_nonpaying_receipt');
    const participation = (0, weekly_party_rewards_v2_1.partyEventRewardBundle)({
        difficulty: 'standard', performanceBand: 1, personalPoints: 5,
    });
    const participant = {
        ...clone(base), reward: participation, conservativeSlotsNeeded: 0,
        needsSkillTarget: false, needsCombatXpRouter: false,
        needsCompanionRouter: false,
    };
    const partReceipt = await (0, weekly_party_claim_preflight_v25_1.preparePrivatePartyClaimPreflightV25)({
        gateEnabled: true, offerId, trustedAccountId: accountId,
        trustedCharacterId: characterId,
        repository: { prepareClaimPreflight: async () => participant },
    });
    assert(partReceipt.reward.kind === 'participation'
        && partReceipt.conservativeSlotsNeeded === 0
        && partReceipt.payoutAuthorized === false, 'participation non-inventory quote stays nonpaying');
    rejectSync(() => (0, weekly_party_claim_preflight_v25_1.claimPrivatePartyEventRewardV25)(), 'claim_disabled_pending_economy_audit');
    console.log('PASS: v25 72 TS reward model quotes, safe preflight rerun, ownership, routing, no payout');
}
void main().catch(e => { console.error(e); process.exitCode = 1; });
