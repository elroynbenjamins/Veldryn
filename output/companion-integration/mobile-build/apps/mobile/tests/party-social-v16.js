"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const party_social_1 = require("../src/core/party-social");
function assert(value, message) { if (!value)
    throw new Error(message); }
const party = { id: 'p', focus: 'mixed', maxMembers: 4, members: [{ accountId: 'a1', characterId: 'c1', characterName: 'A', className: 'Wayfinder', role: 'damage', isLeader: true }] };
assert((0, party_social_1.partyOpenSpots)(party) === 3, 'party open spots');
assert((0, party_social_1.shouldShowPartyChat)(party, 'a1'), 'member sees party chat');
assert(!(0, party_social_1.shouldShowPartyChat)(party, 'a2'), 'nonmember must not see party chat');
assert(!(0, party_social_1.shouldShowPartyChat)(null, 'a1'), 'Party Chat disappears after leaving or disbanding');
const contract = { id: 'c', name: 'Weekly', category: 'mixed', cadence: 'weekly', endsAtMs: 10, totalPoints: 100, targetPoints: 500, minimumPersonalPoints: 40, personalPoints: 39, objectives: [] };
assert(!(0, party_social_1.personalContributionEligible)(contract), 'minimum personal contribution should be visible to client');
const now = Date.UTC(2026, 8, 12, 12);
assert((0, party_social_1.recruitmentTimeLabel)(now + 5 * 3600000, now).urgency === 'soon', 'six-hour expiry warning');
const card = { id: 'r', postType: 'looking_for_party', ownerName: 'A', title: 'Weekend party', body: 'Mixed contracts', roles: ['damage'], focus: 'mixed', activityTags: ['contracts'], playstyleTags: ['casual'], availabilityTags: ['weekends'], guildInterestTags: [], expiresAtMs: now + 86400000 };
assert((0, party_social_1.filterRecruitmentCards)([card], { query: 'weekend', postTypes: ['looking_for_party'], focuses: ['mixed'], roles: ['damage'], activityTags: ['contracts'] }).length === 1, 'filters should compose');
const filters = { query: '', postTypes: [], focuses: [], roles: [], activityTags: [], availabilityTags: ['weekends'], playstyleTags: ['casual'], region: 'eu', maxMinCombatLevel: 20 };
assert((0, party_social_1.filterRecruitmentCards)([{ ...card, region: 'EU', minCombatLevel: 10 }], filters, now).length === 1, 'extended availability/playstyle/region/level filters');
assert((0, party_social_1.filterRecruitmentCards)([{ ...card, expiresAtMs: now }], { ...filters, region: undefined }, now).length === 0, 'expired cards disappear at the exact deadline');
assert((0, party_social_1.filterRecruitmentCards)([{ ...card, status: 'closed' }], { ...filters, region: undefined }, now).length === 0, 'closed advert cannot remain visible');
console.log('mobile party social v16 tests passed');
