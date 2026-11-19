"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARTY_EVENT_CACHE_CHOICES = exports.PARTY_EVENT_REWARD_MODEL_VERSION = void 0;
exports.partyEventRewardEligibility = partyEventRewardEligibility;
exports.partyEventRewardBundle = partyEventRewardBundle;
exports.partyEventRewardOffers = partyEventRewardOffers;
exports.PARTY_EVENT_REWARD_MODEL_VERSION = 'party-event-rewards-v2';
exports.PARTY_EVENT_CACHE_CHOICES = [
    'warrior', 'artisan', 'companion',
];
function partyEventRewardEligibility(personalPoints) {
    if (!Number.isInteger(personalPoints) || personalPoints < 0 || personalPoints > 60)
        throw new Error('invalid_party_event_personal_points');
    return personalPoints >= 15 ? 'full' : personalPoints >= 5 ? 'participation' : 'none';
}
/** Applies diminishing returns to higher damage tiers, never per-player DPS. */
function partyEventRewardBundle(input) {
    const { difficulty, performanceBand, personalPoints } = input;
    const eligibility = partyEventRewardEligibility(personalPoints);
    if (eligibility === 'none')
        throw new Error('party_event_reward_not_eligible');
    if (!Number.isInteger(performanceBand) || performanceBand < 1 || performanceBand > 6)
        throw new Error('party_event_invalid_reward_band');
    const multiplier = { standard: 1, veteran: 1.2, heroic: 1.35 }[difficulty];
    if (!multiplier)
        throw new Error('party_event_invalid_reward_difficulty');
    if (eligibility === 'full' && !input.choice)
        throw new Error('party_event_reward_choice_required');
    if (input.choice && !exports.PARTY_EVENT_CACHE_CHOICES.includes(input.choice))
        throw new Error('party_event_invalid_reward_choice');
    if (eligibility === 'participation' && input.choice)
        throw new Error('party_event_participation_has_no_cache');
    const band = performanceBand;
    const kind = eligibility === 'participation' ? 'participation' : input.choice;
    const scale = (value) => Math.round(value * multiplier);
    const empty = {
        version: exports.PARTY_EVENT_REWARD_MODEL_VERSION, kind, performanceBand: band,
        personalPoints, gold: 0, combatXp: 0, skillXp: 0, companionEssence: 0,
        bondstones: 0, partyRenown: 0, materials: {},
    };
    if (kind === 'participation')
        return {
            ...empty, gold: scale(300 + band * 120),
        };
    const base = scale(1250 + band * 450);
    const partyRenown = { standard: 10, veteran: 12, heroic: 14 }[difficulty];
    switch (kind) {
        case 'warrior':
            return { ...empty, gold: base, partyRenown,
                combatXp: scale(1300 + band * 350),
                materials: { GEM_DUST: Math.max(1, Math.round(3 + band * .7)) } };
        case 'artisan':
            return { ...empty, gold: base, partyRenown,
                skillXp: scale(1800 + band * 450),
                materials: { GEM_DUST: Math.max(1, Math.round(3 + band * .7)) } };
        case 'companion':
            return { ...empty, gold: base, partyRenown,
                companionEssence: scale(80 + band * 45),
                bondstones: band >= 5 ? 2 : band >= 3 ? 1 : 0 };
    }
}
/** Display-only choices, based on the locked account-week entitlement. */
function partyEventRewardOffers(input) {
    const eligibility = partyEventRewardEligibility(input.personalPoints);
    if (eligibility === 'none')
        return [];
    if (eligibility === 'participation')
        return [partyEventRewardBundle(input)];
    return exports.PARTY_EVENT_CACHE_CHOICES.map(choice => partyEventRewardBundle({ ...input, choice }));
}
