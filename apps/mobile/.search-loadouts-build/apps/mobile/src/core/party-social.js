"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARTY_SOCIAL_TUTORIAL_STEPS = exports.EMPTY_RECRUITMENT_FILTERS = void 0;
exports.partyOpenSpots = partyOpenSpots;
exports.shouldShowPartyChat = shouldShowPartyChat;
exports.recruitmentTimeLabel = recruitmentTimeLabel;
exports.contractProgressRatio = contractProgressRatio;
exports.personalContributionEligible = personalContributionEligible;
exports.filterRecruitmentCards = filterRecruitmentCards;
exports.EMPTY_RECRUITMENT_FILTERS = {
    query: '', postTypes: [], focuses: [], roles: [], activityTags: [],
};
function partyOpenSpots(party) {
    return Math.max(0, party.maxMembers - party.members.length);
}
function shouldShowPartyChat(party, accountId) {
    return !!party && party.members.some(member => member.accountId === accountId);
}
function recruitmentTimeLabel(expiresAtMs, nowMs) {
    const remaining = expiresAtMs - nowMs;
    if (remaining <= 0)
        return { text: 'Expired', urgency: 'expired' };
    const hours = Math.ceil(remaining / 3600000);
    if (hours <= 6)
        return { text: `${hours}h left`, urgency: 'soon' };
    if (hours < 24)
        return { text: `${hours}h left`, urgency: 'normal' };
    return { text: `${Math.ceil(hours / 24)}d left`, urgency: 'normal' };
}
function contractProgressRatio(contract) {
    if (contract.targetPoints <= 0)
        return 0;
    return Math.max(0, Math.min(1, contract.totalPoints / contract.targetPoints));
}
function personalContributionEligible(contract) {
    return contract.personalPoints >= contract.minimumPersonalPoints;
}
function lower(value) { return (value ?? '').trim().toLocaleLowerCase(); }
function overlaps(a, b) { return b.length === 0 || b.some(value => a.includes(value)); }
/** Client-side convenience filter for already-authorized active results. Server browse remains authoritative. */
function filterRecruitmentCards(cards, filters, nowMs) {
    const query = lower(filters.query);
    return cards.filter(card => {
        if (card.status && card.status !== 'active')
            return false;
        if (nowMs !== undefined && card.expiresAtMs <= nowMs)
            return false;
        if (filters.postTypes.length && !filters.postTypes.includes(card.postType))
            return false;
        if (filters.focuses.length && !filters.focuses.includes(card.focus))
            return false;
        if (filters.roles.length && !overlaps(card.roles, filters.roles))
            return false;
        if (filters.activityTags.length && !overlaps(card.activityTags, filters.activityTags))
            return false;
        if (filters.playstyleTags?.length && !overlaps(card.playstyleTags, filters.playstyleTags))
            return false;
        if (filters.availabilityTags?.length && !overlaps(card.availabilityTags, filters.availabilityTags))
            return false;
        if (filters.guildInterestTags?.length && !overlaps(card.guildInterestTags, filters.guildInterestTags))
            return false;
        if (filters.activityLevels?.length && (!card.activityLevel || !filters.activityLevels.includes(card.activityLevel)))
            return false;
        if (filters.language && lower(card.language) !== lower(filters.language))
            return false;
        if (filters.region && lower(card.region) !== lower(filters.region))
            return false;
        if (filters.maxMinCombatLevel !== undefined && (card.minCombatLevel ?? 0) > filters.maxMinCombatLevel)
            return false;
        if (filters.maxMinTotalLevel !== undefined && (card.minTotalLevel ?? 0) > filters.maxMinTotalLevel)
            return false;
        if (filters.requireOpenPartySpot && card.postType === 'party_recruiting' && (card.openSpots ?? 0) < 1)
            return false;
        if (!query)
            return true;
        const haystack = [card.title, card.body, card.ownerName, card.guildName, card.partyName, card.focus, card.language, card.region,
            card.activityLevel, card.currentObjective, ...card.roles, ...card.activityTags, ...card.playstyleTags,
            ...card.availabilityTags, ...card.guildInterestTags].map(lower).join(' ');
        return haystack.includes(query);
    });
}
exports.PARTY_SOCIAL_TUTORIAL_STEPS = [
    'Parties are persistent groups of 1–4 players. You can stay together while doing different activities.',
    'Weekly Party Contracts combine verified Combat, Skilling, or Mixed progress. Harder and slower activities are worth more normalized contribution.',
    'Everyone shares Contract progress, but each member must contribute a minimum amount to earn the completion reward.',
    'Looking for Party and Looking for Members adverts last 1 day. Guild and Guild-Seeker adverts normally last 3 days, so old posts disappear automatically.',
    'Use Search and Filters to find the activity focus, role, availability, playstyle, or guild style you want. Your current Contract is only context and never blocks discovery.',
    'Party Chat appears only while you are currently in a Party.',
    'Live Dungeons are separate: they still require exactly 1 Tank, 2 Damage, and 1 Support.',
];
