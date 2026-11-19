"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const weekly_party_claim_intents_v25_1 = require("../weekly-party-claim-intents-v25");
const weekly_party_rewards_v2_1 = require("../weekly-party-rewards-v2");
function must(ok, s) {
    if (!ok)
        throw Error('party-v25-test: ' + s);
}
async function rejects(fn, expected) {
    try {
        await fn();
        throw Error('unexpected_success');
    }
    catch (e) {
        must(String(e).includes(expected), 'expected ' + expected + ' got ' + String(e));
    }
}
const id = '11111111-1111-4111-8111-111111111111', account = '22222222-2222-4222-8222-222222222222', intent = '33333333-3333-4333-8333-333333333333';
must(weekly_party_claim_intents_v25_1.PARTY_EVENT_CLAIM_INTENTS_V25_RELEASED === false, 'feature stays hidden');
const expected = (0, weekly_party_rewards_v2_1.partyEventRewardBundle)({ difficulty: 'standard', performanceBand: 1,
    personalPoints: 15, choice: 'artisan' });
const incoming = (0, weekly_party_rewards_v2_1.partyEventRewardBundle)({ difficulty: 'standard', performanceBand: 1,
    personalPoints: 5 });
let quotes = 0, reserves = 0, reads = 0;
const repo = {
    quoteOffer: async (offerId, owner) => {
        quotes++;
        must(offerId === id && owner === account, 'trusted quote identity');
        return structuredClone(expected);
    },
    reserveIntent: async (offerId, owner, requestId) => {
        reserves++;
        must(offerId === id && owner === account
            && requestId === 'party-event-v25-intent:' + id, 'server-derived, fixed claim ID only');
        return { intentId: intent, offerId: id, replayed: reserves > 1,
            quoteHash: 'f'.repeat(64), claimReady: false,
            claimable: false, claimed: false, rewardsGranted: false };
    },
    readInbox: async (owner) => {
        reads++;
        must(owner === account, 'account-scoped preview');
        return { items: [{ intentId: intent, offerId: id, reservationId: id,
                    rewardKind: 'artisan', quoteHash: 'f'.repeat(64),
                    state: 'blocked_unreleased', claimable: false,
                    claimed: false, rewardsGranted: false }],
            claimEnabled: false, rewardsGranted: false, economyTransfers: 0 };
    }
};
async function test() {
    for (const [kind, points, choice] of [
        ['participation', 5, undefined],
        ['warrior', 15, 'warrior'], ['artisan', 15, 'artisan'],
        ['companion', 15, 'companion'],
    ]) {
        const result = (0, weekly_party_rewards_v2_1.partyEventRewardBundle)({
            difficulty: 'standard', performanceBand: 1,
            personalPoints: points, choice
        });
        must(result.kind === kind, 'v2 choice model parity');
    }
    must(expected.gold === 1700 && expected.skillXp === 2250
        && expected.materials.GEM_DUST === 4
        && incoming.gold === 420, 'v25 SQL economic formula cross-check');
    await rejects(() => (0, weekly_party_claim_intents_v25_1.quotePrivatePartyClaimV25)({
        gateEnabled: false, offerId: id, trustedAccountId: account, repository: repo,
    }), 'release_gate_disabled');
    await rejects(() => (0, weekly_party_claim_intents_v25_1.preparePrivatePartyClaimIntentV25)({
        gateEnabled: false, offerId: id, trustedAccountId: account, repository: repo,
    }), 'release_gate_disabled');
    await rejects(() => (0, weekly_party_claim_intents_v25_1.readPrivatePartyClaimInboxV25)({
        gateEnabled: false, trustedAccountId: account, repository: repo,
    }), 'release_gate_disabled');
    must(quotes === 0 && reserves === 0 && reads === 0, 'off switch must avoid DB');
    await rejects(() => (0, weekly_party_claim_intents_v25_1.preparePrivatePartyClaimIntentV25)({
        gateEnabled: true, offerId: 'client-id', trustedAccountId: account, repository: repo,
    }), 'invalid_offer');
    must(reserves === 0, 'malformed identity cannot cause write');
    const q = await (0, weekly_party_claim_intents_v25_1.quotePrivatePartyClaimV25)({
        gateEnabled: true, offerId: id, trustedAccountId: account, repository: repo,
    });
    must(JSON.stringify(q) === JSON.stringify(expected), 'quote must come from trusted v2 model');
    const first = await (0, weekly_party_claim_intents_v25_1.preparePrivatePartyClaimIntentV25)({
        gateEnabled: true, offerId: id, trustedAccountId: account, repository: repo,
    });
    const retry = await (0, weekly_party_claim_intents_v25_1.preparePrivatePartyClaimIntentV25)({
        gateEnabled: true, offerId: id, trustedAccountId: account, repository: repo,
    });
    must(!first.replayed && retry.replayed && Number(reserves) === 2
        && !first.claimReady && !first.claimed && !first.claimable, 'one-time claim intent and safe duplicate retry');
    const inbox = await (0, weekly_party_claim_intents_v25_1.readPrivatePartyClaimInboxV25)({
        gateEnabled: true, trustedAccountId: account, repository: repo,
    });
    must(inbox.items.length === 1 && !inbox.claimEnabled && inbox.economyTransfers === 0, 'claim reservation is not a payout');
    await rejects(() => (0, weekly_party_claim_intents_v25_1.claimPrivatePartyRewardV25)({ offerId: id, trustedAccountId: account }), 'payout_not_released');
    await rejects(() => (0, weekly_party_claim_intents_v25_1.quotePrivatePartyClaimV25)({
        gateEnabled: true, offerId: id, trustedAccountId: account,
        repository: { ...repo, quoteOffer: async () => ({ ...expected, gold: 1000001 }) },
    }), 'invalid_quote_amount');
    await rejects(() => (0, weekly_party_claim_intents_v25_1.quotePrivatePartyClaimV25)({
        gateEnabled: true, offerId: id, trustedAccountId: account,
        repository: { ...repo, quoteOffer: async () => ({ ...expected, materials: { GEM_DUST: 5, INVENTED: 1 } }) },
    }), 'unapproved_material');
    await rejects(() => (0, weekly_party_claim_intents_v25_1.quotePrivatePartyClaimV25)({
        gateEnabled: true, offerId: id, trustedAccountId: account,
        repository: { ...repo, quoteOffer: async () => ({ ...expected, kind: 'participation' }) },
    }), 'inconsistent_reward_eligibility');
    await rejects(() => (0, weekly_party_claim_intents_v25_1.preparePrivatePartyClaimIntentV25)({
        gateEnabled: true, offerId: id, trustedAccountId: account,
        repository: { ...repo, reserveIntent: async () => ({
                intentId: intent, offerId: id, replayed: false, claimReady: true,
                claimable: false, claimed: false, rewardsGranted: false,
            }) },
    }), 'claim_intent_receipt_not_blocked');
    const malformed = {
        items: [{ intentId: intent, offerId: id, reservationId: id,
                rewardKind: 'artisan', quoteHash: 'f'.repeat(64),
                state: 'blocked_unreleased', claimable: false,
                claimed: false, rewardsGranted: true }],
        claimEnabled: false, rewardsGranted: false, economyTransfers: 0,
    };
    await rejects(() => (0, weekly_party_claim_intents_v25_1.readPrivatePartyClaimInboxV25)({
        gateEnabled: true, trustedAccountId: account,
        repository: { ...repo, readInbox: async () => malformed },
    }), 'invalid_claim_intent_item');
    console.log('Party Events v25: v2 model parity, fixed account/request IDs, exact retry, no payout, fail-closed malicious flags');
}
void test().catch(e => { console.error(e); process.exitCode = 1; });
