"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const weekly_party_rewards_v2_1 = require("../weekly-party-rewards-v2");
const weekly_party_reward_offers_v24_1 = require("../weekly-party-reward-offers-v24");
function assert(ok, message) {
    if (!ok)
        throw Error('weekly-party-reward-offers-v24: ' + message);
}
async function rejects(fn, needle) {
    try {
        await fn();
        throw Error('unexpected_success');
    }
    catch (e) {
        assert(String(e).includes(needle), 'expected ' + needle + ' got ' + String(e));
    }
}
const reservationId = '11111111-1111-4111-8111-111111111111';
const owner = '22222222-2222-4222-8222-222222222222';
const attacker = '33333333-3333-4333-8333-333333333333';
const offerId = '44444444-4444-4444-8444-444444444444';
assert(weekly_party_reward_offers_v24_1.PARTY_EVENT_REWARD_OFFERS_V24_RELEASED === false, 'v24 must remain hidden and never release live rewards');
for (const [points, want] of [
    [0, 'none'], [4, 'none'], [5, 'participation'], [14, 'participation'],
    [15, 'full'], [60, 'full'],
]) {
    assert((0, weekly_party_rewards_v2_1.partyEventRewardEligibility)(points) === want, 'EP threshold mismatch ' + points);
}
assert((0, weekly_party_rewards_v2_1.partyEventRewardOffers)({ difficulty: 'standard', performanceBand: 3,
    personalPoints: 0 }).length === 0, 'under-5 account gets no offer');
assert((0, weekly_party_rewards_v2_1.partyEventRewardOffers)({ difficulty: 'standard', performanceBand: 3,
    personalPoints: 5 }).length === 1, 'participation gets no choice');
assert((0, weekly_party_rewards_v2_1.partyEventRewardOffers)({ difficulty: 'standard', performanceBand: 3,
    personalPoints: 15 }).length === 3, 'full EP unlocks exactly three choices');
const sample = {
    offers: [{
            offerId, reservationId, eventStartsAt: '2026-11-09T00:00:00Z',
            eligibility: 'full', personalPoints: 15, rewardBand: 2,
            selectedChoice: null, choiceLocked: false, status: 'awaiting_choice_preview',
            claimable: false, granted: false, entitlement: false,
        }],
    claimEnabled: false, entitlementsCreated: false, rewardsGranted: false,
};
async function test() {
    let preparationCalls = 0, choiceCalls = 0, readCalls = 0;
    let lockedChoice = null;
    const repo = {
        prepareOffers: async (reservationId, requestId) => {
            preparationCalls++;
            assert(requestId === 'party-event-v24-offers:' + reservationId, 'request ID must be deterministic and server-derived');
            return {
                replayed: preparationCalls > 1, reservationId,
                memberCount: 2, offerCount: 1, offersPrepared: true,
                entitlementsCreated: false, rewardsClaimable: false, rewardsGranted: false,
            };
        },
        lockChoice: async (requestOffer, account, choice, requestId) => {
            choiceCalls++;
            assert(requestOffer === offerId && requestId === 'party-event-v24-choice:' + offerId, 'choice request must be immutable per offer');
            if (account !== owner)
                throw Error('party_event_v24_choice_not_owned');
            if (lockedChoice !== null && choice !== lockedChoice)
                throw Error('party_event_v24_choice_conflict');
            const replayed = lockedChoice !== null;
            lockedChoice = choice;
            return { replayed, offerId: requestOffer, choice, choiceLocked: true,
                rewardsClaimable: false, rewardsGranted: false };
        },
        readInboxPreview: async (accountId) => {
            readCalls++;
            assert(accountId === owner, 'trusted identity required');
            const inbox = structuredClone(sample);
            if (lockedChoice) {
                inbox.offers[0].selectedChoice = lockedChoice;
                inbox.offers[0].choiceLocked = true;
                inbox.offers[0].status = 'choice_locked_preview';
            }
            return inbox;
        },
    };
    await rejects(() => (0, weekly_party_reward_offers_v24_1.preparePrivatePartyRewardOffersV24)({
        gateEnabled: false, reservationId, repository: repo,
    }), 'release_gate_disabled');
    await rejects(() => (0, weekly_party_reward_offers_v24_1.preparePrivatePartyRewardOffersV24)({
        gateEnabled: true, reservationId: 'client', repository: repo,
    }), 'invalid_reservation');
    await rejects(() => (0, weekly_party_reward_offers_v24_1.lockPrivatePartyRewardChoiceV24)({
        gateEnabled: false, offerId, trustedAccountId: owner,
        choice: 'artisan', repository: repo,
    }), 'release_gate_disabled');
    await rejects(() => (0, weekly_party_reward_offers_v24_1.readPrivatePartyRewardInboxV24)({
        gateEnabled: false, trustedAccountId: owner, repository: repo,
    }), 'release_gate_disabled');
    assert(preparationCalls === 0 && choiceCalls === 0 && readCalls === 0, 'feature gate blocks all private operations');
    const first = await (0, weekly_party_reward_offers_v24_1.preparePrivatePartyRewardOffersV24)({
        gateEnabled: true, reservationId, repository: repo,
    });
    const repeat = await (0, weekly_party_reward_offers_v24_1.preparePrivatePartyRewardOffersV24)({
        gateEnabled: true, reservationId, repository: repo,
    });
    assert(!first.replayed && repeat.replayed
        && Number(preparationCalls) === 2 && first.rewardsGranted === false
        && first.entitlementsCreated === false, 'preparation retries must preserve no-loot outcome');
    const initial = await (0, weekly_party_reward_offers_v24_1.readPrivatePartyRewardInboxV24)({
        gateEnabled: true, trustedAccountId: owner, repository: repo,
    });
    assert(initial.offers.length === 1 && !initial.offers[0].choiceLocked
        && !initial.offers[0].claimable, 'preview is not claimable');
    await rejects(() => (0, weekly_party_reward_offers_v24_1.lockPrivatePartyRewardChoiceV24)({
        gateEnabled: true, offerId, trustedAccountId: attacker,
        choice: 'warrior', repository: repo,
    }), 'choice_not_owned');
    const firstLock = await (0, weekly_party_reward_offers_v24_1.lockPrivatePartyRewardChoiceV24)({
        gateEnabled: true, offerId, trustedAccountId: owner,
        choice: 'artisan', repository: repo,
    });
    const repeatLock = await (0, weekly_party_reward_offers_v24_1.lockPrivatePartyRewardChoiceV24)({
        gateEnabled: true, offerId, trustedAccountId: owner,
        choice: 'artisan', repository: repo,
    });
    assert(!firstLock.replayed && repeatLock.replayed
        && !firstLock.rewardsGranted, 'selection locks once and grants nothing');
    await rejects(() => (0, weekly_party_reward_offers_v24_1.lockPrivatePartyRewardChoiceV24)({
        gateEnabled: true, offerId, trustedAccountId: owner,
        choice: 'warrior', repository: repo,
    }), 'choice_conflict');
    const locked = await (0, weekly_party_reward_offers_v24_1.readPrivatePartyRewardInboxV24)({
        gateEnabled: true, trustedAccountId: owner, repository: repo,
    });
    assert(locked.offers[0].selectedChoice === 'artisan'
        && locked.offers[0].status === 'choice_locked_preview'
        && locked.claimEnabled === false, 'choice is frozen but still unclaimable');
    const corrupt = {
        ...repo,
        readInboxPreview: async () => ({ ...structuredClone(sample), rewardsGranted: true }),
    };
    await rejects(() => (0, weekly_party_reward_offers_v24_1.readPrivatePartyRewardInboxV24)({
        gateEnabled: true, trustedAccountId: owner, repository: corrupt,
    }), 'invalid_inbox_flags');
    const inflated = {
        ...repo,
        readInboxPreview: async () => ({ ...structuredClone(sample), offers: [{
                    ...sample.offers[0], personalPoints: 4, eligibility: 'full',
                }] }),
    };
    await rejects(() => (0, weekly_party_reward_offers_v24_1.readPrivatePartyRewardInboxV24)({
        gateEnabled: true, trustedAccountId: owner, repository: inflated,
    }), 'invalid_offer_preview');
    const fakeGrant = {
        ...repo,
        prepareOffers: async () => ({
            replayed: false, reservationId, memberCount: 2, offerCount: 1,
            offersPrepared: true, entitlementsCreated: false,
            rewardsClaimable: true, rewardsGranted: false,
        }),
    };
    await rejects(() => (0, weekly_party_reward_offers_v24_1.preparePrivatePartyRewardOffersV24)({
        gateEnabled: true, reservationId, repository: fakeGrant,
    }), 'invalid_offer_preparation_receipt');
    const participation = {
        ...repo, readInboxPreview: async () => ({
            ...structuredClone(sample),
            offers: [{ ...sample.offers[0], eligibility: 'participation',
                    personalPoints: 5, selectedChoice: null, choiceLocked: false,
                    status: 'participation_preview' }],
        }),
    };
    const one = await (0, weekly_party_reward_offers_v24_1.readPrivatePartyRewardInboxV24)({
        gateEnabled: true, trustedAccountId: owner, repository: participation,
    });
    assert(one.offers.length === 1 && one.offers[0].status === 'participation_preview', 'participation previews have no selection');
    console.log('Party reward v24: EP 0/5/15/60, once-only offer, locked choice, strict no-claim inbox and disabled gate validated');
}
void test().catch(e => { console.error(e); process.exitCode = 1; });
