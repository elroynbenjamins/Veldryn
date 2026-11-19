"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const recruitment_1 = require("./recruitment");
function assert(value, message) {
    if (!value)
        throw new Error(message);
}
const now = Date.UTC(2026, 8, 12, 12, 0, 0);
const base = {
    id: 'p1', ownerAccountId: 'a1', postType: 'guild_recruiting', guildId: 'g1',
    title: 'Dutch PvE Guild', body: 'Looking for support for guild projects and dungeons',
    roles: ['support'], focus: 'mixed', activityTags: ['dungeons', 'guild-projects'], playstyleTags: ['casual'],
    availabilityTags: ['weekday-evenings', 'weekends'], guildInterestTags: ['pve', 'social'], activityLevel: 'regular',
    language: 'EN', region: 'EU', minCombatLevel: 40, minTotalLevel: 200,
    createdAtMs: now - 60_000, refreshedAtMs: now - 60_000,
    expiresAtMs: (0, recruitment_1.recruitmentExpiry)(now - 60_000, 3, 'guild_recruiting'), status: 'active',
};
(0, recruitment_1.validateRecruitmentPostShape)(base);
assert((0, recruitment_1.defaultRecruitmentDuration)('looking_for_party') === 1, 'party posts should default to 1 day');
assert((0, recruitment_1.defaultRecruitmentDuration)('guild_recruiting') === 3, 'guild posts should default to 3 days');
assert((0, recruitment_1.allowedRecruitmentDurations)('looking_for_party').length === 1, 'party posts must stay fresh at one day');
assert((0, recruitment_1.allowedRecruitmentDurations)('looking_for_guild').includes(1) && (0, recruitment_1.allowedRecruitmentDurations)('looking_for_guild').includes(3), 'guild posts may use one or three days');
const expired = { ...base, id: 'expired', expiresAtMs: now - 1 };
const visible = (0, recruitment_1.filterRecruitmentPosts)([expired, base], { roles: ['support'], focuses: ['mixed'], availabilityTags: ['weekends'], region: 'eu', search: 'dungeons' }, now);
assert(visible.length === 1 && visible[0].id === 'p1', 'expired posts must never appear in filtered results');
const cooldown = (0, recruitment_1.canRefreshRecruitmentPost)(base, now);
assert(!cooldown.allowed && cooldown.reason === 'refresh_cooldown', 'refresh cooldown should prevent bump spam');
assert(!(0, recruitment_1.canPublishRecruitmentPost)([base], 'a1', 'guild_recruiting', now).allowed, 'close/repost must not bypass bump cooldown');
const sameGuildDifferentOfficer = { ...base, id: 'p2', ownerAccountId: 'officer-2' };
assert(!(0, recruitment_1.canPublishRecruitmentPost)([sameGuildDifferentOfficer], 'officer-3', 'guild_recruiting', now, { guildId: 'g1' }).allowed, 'different guild officers must share the same guild advert bump cooldown');
const refreshable = { ...base, refreshedAtMs: now - 7 * 60 * 60 * 1000 };
assert((0, recruitment_1.canRefreshRecruitmentPost)(refreshable, now).allowed, 'post should refresh after six hours');
const publishable = (0, recruitment_1.canPublishRecruitmentPost)([refreshable], 'a1', 'guild_recruiting', now);
assert(publishable.allowed && publishable.replacePostId === 'p1', 'replacement should identify the previous active post after cooldown');
const lfm = {
    ...base,
    id: 'lfm',
    postType: 'party_recruiting',
    guildId: undefined,
    partyId: 'party-1',
    title: 'Mixed weekly contract',
    focus: 'mixed',
    openSpots: 0,
    currentObjective: 'Supply the Roads',
    expiresAtMs: (0, recruitment_1.recruitmentExpiry)(now - 60_000, 1, 'party_recruiting'),
};
(0, recruitment_1.validateRecruitmentPostShape)(lfm);
assert((0, recruitment_1.filterRecruitmentPosts)([lfm], { requireOpenPartySpot: true }, now).length === 0, 'full party adverts should be filterable');
const seeker = {
    ...base,
    id: 'guild-seeker',
    ownerAccountId: 'a9',
    postType: 'looking_for_guild',
    guildId: undefined,
    title: 'Looking for active social guild',
    body: 'Mostly skilling and weekly group goals',
    roles: [],
    focus: 'skilling',
    guildInterestTags: ['social', 'projects'],
    expiresAtMs: (0, recruitment_1.recruitmentExpiry)(now - 60_000, 3, 'looking_for_guild'),
};
(0, recruitment_1.validateRecruitmentPostShape)(seeker);
assert((0, recruitment_1.filterRecruitmentPosts)([seeker], { postTypes: ['looking_for_guild'], guildInterestTags: ['projects'] }, now).length === 1, 'guilds should be able to browse compatible guild seekers');
console.log('recruitment tests passed');
