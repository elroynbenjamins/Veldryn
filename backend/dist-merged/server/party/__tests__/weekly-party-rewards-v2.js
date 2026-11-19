"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const weekly_party_rewards_v2_1 = require("../weekly-party-rewards-v2");
function assert(cond, label) {
    if (!cond)
        throw new Error('party_event_rewards_v2: ' + label);
}
function rejects(fn, code) {
    try {
        fn();
        throw new Error('unexpected_success');
    }
    catch (err) {
        assert(String(err).includes(code), 'expected ' + code + ' got ' + String(err));
    }
}
assert((0, weekly_party_rewards_v2_1.partyEventRewardEligibility)(0) === 'none', 'zero effort does not receive rewards');
assert((0, weekly_party_rewards_v2_1.partyEventRewardEligibility)(4) === 'none', 'below participation floor');
assert((0, weekly_party_rewards_v2_1.partyEventRewardEligibility)(5) === 'participation', 'minimum participation');
assert((0, weekly_party_rewards_v2_1.partyEventRewardEligibility)(14) === 'participation', 'not a full chest yet');
assert((0, weekly_party_rewards_v2_1.partyEventRewardEligibility)(15) === 'full', 'full chest starts at 15 EP');
assert((0, weekly_party_rewards_v2_1.partyEventRewardEligibility)(60) === 'full', 'maximum EP is valid');
assert((0, weekly_party_rewards_v2_1.partyEventRewardOffers)({ difficulty: 'standard', performanceBand: 2, personalPoints: 0 }).length === 0, 'inactive members get nothing');
const casual = (0, weekly_party_rewards_v2_1.partyEventRewardOffers)({ difficulty: 'standard', performanceBand: 2, personalPoints: 5 });
assert(casual.length === 1 && casual[0]?.kind === 'participation'
    && casual[0]?.gold > 0 && casual[0]?.partyRenown === 0, 'minimal participation gets consolation only');
for (const difficulty of ['standard', 'veteran', 'heroic']) {
    let lastGold = 0;
    for (let band = 1; band <= 6; band++) {
        const offers = (0, weekly_party_rewards_v2_1.partyEventRewardOffers)({ difficulty, performanceBand: band, personalPoints: 15 });
        assert(offers.length === 3, 'full eligible members choose from exactly three caches');
        assert(offers.every(o => o.performanceBand === band), 'same party performance band for every role');
        assert(offers[0].gold >= lastGold, 'boss tier increases reward value');
        lastGold = offers[0].gold;
        assert(offers.every(o => o.partyRenown > 0), 'full chest includes Party Renown');
        assert(offers.every(o => o.gold > 0), 'all choices retain Gold baseline');
        assert(offers.find(o => o.kind === 'warrior').combatXp > 0, 'Warrior cache has combat XP');
        assert(offers.find(o => o.kind === 'artisan').skillXp > 0, 'Artisan cache has skilling XP');
        assert(offers.find(o => o.kind === 'companion').companionEssence > 0, 'Companion cache has canonical Essence economy reward');
        assert(offers.every(o => o.bondstones <= 2), 'Bondstones remain controlled');
        assert(offers.every(o => o.gold < 25000), 'rewards cannot explode');
    }
}
assert(weekly_party_rewards_v2_1.PARTY_EVENT_CACHE_CHOICES.join('|') === 'warrior|artisan|companion', 'same stable reward choices');
const low = (0, weekly_party_rewards_v2_1.partyEventRewardBundle)({ difficulty: 'standard', performanceBand: 1, personalPoints: 15, choice: 'warrior' });
const high = (0, weekly_party_rewards_v2_1.partyEventRewardBundle)({ difficulty: 'heroic', performanceBand: 1, personalPoints: 15, choice: 'warrior' });
assert(high.gold > low.gold, 'higher difficulty adds controlled benefits');
assert(high.partyRenown === 14 && low.partyRenown === 10, 'difficulty renown fixed');
const comp = (0, weekly_party_rewards_v2_1.partyEventRewardBundle)({ difficulty: 'standard', performanceBand: 6, personalPoints: 15, choice: 'companion' });
assert(comp.bondstones === 2, 'top bands earn small extra Bondstones');
rejects(() => (0, weekly_party_rewards_v2_1.partyEventRewardBundle)({ difficulty: 'standard', performanceBand: 2, personalPoints: 14, choice: 'warrior' }), 'party_event_participation_has_no_cache');
rejects(() => (0, weekly_party_rewards_v2_1.partyEventRewardBundle)({ difficulty: 'standard', performanceBand: 2, personalPoints: 15 }), 'party_event_reward_choice_required');
rejects(() => (0, weekly_party_rewards_v2_1.partyEventRewardBundle)({ difficulty: 'standard', performanceBand: 0, personalPoints: 15, choice: 'warrior' }), 'party_event_invalid_reward_band');
rejects(() => (0, weekly_party_rewards_v2_1.partyEventRewardEligibility)(61), 'invalid_party_event_personal_points');
