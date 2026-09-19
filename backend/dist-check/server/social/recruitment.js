"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RECRUITMENT_REFRESH_COOLDOWN_MS = void 0;
exports.defaultRecruitmentDuration = defaultRecruitmentDuration;
exports.allowedRecruitmentDurations = allowedRecruitmentDurations;
exports.validateRecruitmentDuration = validateRecruitmentDuration;
exports.recruitmentExpiry = recruitmentExpiry;
exports.effectiveRecruitmentStatus = effectiveRecruitmentStatus;
exports.isRecruitmentPostVisible = isRecruitmentPostVisible;
exports.canRefreshRecruitmentPost = canRefreshRecruitmentPost;
exports.canPublishRecruitmentPost = canPublishRecruitmentPost;
exports.recruitmentTimeRemainingMs = recruitmentTimeRemainingMs;
exports.validateRecruitmentPostShape = validateRecruitmentPostShape;
exports.matchesRecruitmentFilters = matchesRecruitmentFilters;
exports.filterRecruitmentPosts = filterRecruitmentPosts;
exports.guildRequirementsMet = guildRequirementsMet;
exports.scorePartyCompatibility = scorePartyCompatibility;
exports.scoreGuildCompatibility = scoreGuildCompatibility;
exports.RECRUITMENT_REFRESH_COOLDOWN_MS = 6 * 60 * 60 * 1000;
function defaultRecruitmentDuration(postType) {
    return postType === 'looking_for_party' || postType === 'party_recruiting' ? 1 : 3;
}
function allowedRecruitmentDurations(postType) {
    return postType === 'looking_for_party' || postType === 'party_recruiting' ? [1] : [1, 3];
}
function validateRecruitmentDuration(postType, durationDays) {
    if (!allowedRecruitmentDurations(postType).includes(durationDays)) {
        throw new Error('invalid_recruitment_duration');
    }
}
function recruitmentExpiry(fromMs, durationDays, postType) {
    if (postType)
        validateRecruitmentDuration(postType, durationDays);
    return fromMs + durationDays * 24 * 60 * 60 * 1000;
}
function effectiveRecruitmentStatus(post, nowMs) {
    if (post.status !== 'active')
        return post.status;
    return post.expiresAtMs <= nowMs ? 'expired' : 'active';
}
function isRecruitmentPostVisible(post, nowMs) {
    return effectiveRecruitmentStatus(post, nowMs) === 'active';
}
function canRefreshRecruitmentPost(post, nowMs) {
    if (effectiveRecruitmentStatus(post, nowMs) === 'closed') {
        return { allowed: false, retryAfterSeconds: 0, reason: 'post_closed' };
    }
    const remaining = exports.RECRUITMENT_REFRESH_COOLDOWN_MS - (nowMs - post.refreshedAtMs);
    if (remaining > 0) {
        return { allowed: false, retryAfterSeconds: Math.ceil(remaining / 1000), reason: 'refresh_cooldown' };
    }
    return { allowed: true, retryAfterSeconds: 0 };
}
/**
 * Publishing a replacement uses the same six-hour anti-bump window. Closing an advert and
 * immediately reposting therefore cannot bypass the refresh cooldown.
 */
function canPublishRecruitmentPost(posts, ownerAccountId, postType, nowMs, scope = {}) {
    const sameScope = (post) => {
        if (post.postType !== postType)
            return false;
        if (postType === 'guild_recruiting' && scope.guildId)
            return post.ownerAccountId === ownerAccountId || post.guildId === scope.guildId;
        if (postType === 'party_recruiting' && scope.partyId)
            return post.ownerAccountId === ownerAccountId || post.partyId === scope.partyId;
        return post.ownerAccountId === ownerAccountId;
    };
    const scopedPosts = posts.filter(sameScope).sort((a, b) => b.refreshedAtMs - a.refreshedAtMs);
    const newest = scopedPosts[0];
    if (!newest)
        return { allowed: true, retryAfterSeconds: 0 };
    const remaining = exports.RECRUITMENT_REFRESH_COOLDOWN_MS - (nowMs - newest.refreshedAtMs);
    if (remaining > 0) {
        return { allowed: false, retryAfterSeconds: Math.ceil(remaining / 1000), reason: 'publish_cooldown' };
    }
    const replacePost = scopedPosts.find(post => isRecruitmentPostVisible(post, nowMs));
    return { allowed: true, retryAfterSeconds: 0, replacePostId: replacePost?.id };
}
function recruitmentTimeRemainingMs(post, nowMs) {
    return Math.max(0, post.expiresAtMs - nowMs);
}
function validateRecruitmentPostShape(post) {
    if (!post.id || !post.ownerAccountId)
        throw new Error('recruitment_missing_identity');
    if (post.title.trim().length < 3 || post.title.trim().length > 80)
        throw new Error('recruitment_title_length');
    if (post.body.length > 600)
        throw new Error('recruitment_body_length');
    if (post.currentObjective && post.currentObjective.length > 120)
        throw new Error('recruitment_objective_length');
    if (post.openSpots !== undefined && (!Number.isInteger(post.openSpots) || post.openSpots < 0 || post.openSpots > 3)) {
        throw new Error('recruitment_open_spots_invalid');
    }
    if ((post.minCombatLevel ?? 0) < 0 || (post.minTotalLevel ?? 0) < 0)
        throw new Error('recruitment_level_invalid');
    if (post.postType === 'party_recruiting' && !post.partyId)
        throw new Error('party_recruitment_requires_party');
    if (post.postType === 'party_recruiting' && post.openSpots === undefined)
        throw new Error('party_recruitment_requires_open_spots');
    if (post.postType === 'guild_recruiting' && !post.guildId)
        throw new Error('guild_recruitment_requires_guild');
    if (post.postType === 'looking_for_party' && (post.guildId || post.partyId))
        throw new Error('lfg_must_be_individual');
    if (post.postType === 'looking_for_guild' && (post.guildId || post.partyId))
        throw new Error('guild_seeker_must_be_individual');
    if (post.postType !== 'party_recruiting' && post.openSpots !== undefined)
        throw new Error('open_spots_only_for_party_recruitment');
}
function overlaps(left, right) {
    return right.length === 0 || right.some(value => left.includes(value));
}
function normalized(value) {
    return (value ?? '').trim().toLocaleLowerCase();
}
function matchesRecruitmentFilters(post, filters, nowMs) {
    if (!isRecruitmentPostVisible(post, nowMs))
        return false;
    if (filters.postTypes?.length && !filters.postTypes.includes(post.postType))
        return false;
    if (filters.roles?.length && !overlaps(post.roles, filters.roles))
        return false;
    if (filters.focuses?.length && !filters.focuses.includes(post.focus))
        return false;
    if (filters.activityTags?.length && !overlaps(post.activityTags, filters.activityTags))
        return false;
    if (filters.playstyleTags?.length && !overlaps(post.playstyleTags, filters.playstyleTags))
        return false;
    if (filters.availabilityTags?.length && !overlaps(post.availabilityTags, filters.availabilityTags))
        return false;
    if (filters.guildInterestTags?.length && !overlaps(post.guildInterestTags, filters.guildInterestTags))
        return false;
    if (filters.activityLevels?.length && (!post.activityLevel || !filters.activityLevels.includes(post.activityLevel)))
        return false;
    if (filters.language && normalized(post.language) !== normalized(filters.language))
        return false;
    if (filters.region && normalized(post.region) !== normalized(filters.region))
        return false;
    if (filters.maxMinCombatLevel !== undefined && (post.minCombatLevel ?? 0) > filters.maxMinCombatLevel)
        return false;
    if (filters.maxMinTotalLevel !== undefined && (post.minTotalLevel ?? 0) > filters.maxMinTotalLevel)
        return false;
    if (filters.requireOpenPartySpot && post.postType === 'party_recruiting' && (post.openSpots ?? 0) <= 0)
        return false;
    const q = normalized(filters.search);
    if (q) {
        const haystack = [
            post.title,
            post.body,
            post.language,
            post.region,
            post.focus,
            post.activityLevel,
            post.currentObjective,
            ...post.roles,
            ...post.activityTags,
            ...post.playstyleTags,
            ...post.availabilityTags,
            ...post.guildInterestTags,
        ]
            .map(normalized)
            .join(' ');
        if (!haystack.includes(q))
            return false;
    }
    return true;
}
function filterRecruitmentPosts(posts, filters, nowMs) {
    return posts
        .filter(post => matchesRecruitmentFilters(post, filters, nowMs))
        .sort((a, b) => b.refreshedAtMs - a.refreshedAtMs || b.createdAtMs - a.createdAtMs);
}
const tagOverlap = (a, b) => a && b ? a.filter(value => b.includes(value)) : [];
const styleScore = (a, b) => a === b ? 20 : 12;
function guildRequirementsMet(seeker, guild) {
    const req = guild.requirements;
    return !req || ((req.minCombatLevel === undefined || (seeker.combatLevel ?? 0) >= req.minCombatLevel) && (req.minTotalLevel === undefined || (seeker.totalLevel ?? 0) >= req.minTotalLevel));
}
function scorePartyCompatibility(seeker, party) {
    let score = seeker.activityPreference === party.activityPreference || seeker.activityPreference === 'mixed' || party.activityPreference === 'mixed' ? 45 : 5;
    const reasons = [];
    score += styleScore(seeker.playStyle, party.playStyle);
    score += Math.min(25, seeker.goalTags.filter(tag => party.goalTags.includes(tag)).length * 8);
    score += Math.min(10, (tagOverlap(seeker.activeEventTags, party.activeEventTags)?.length ?? 0) * 5);
    if (party.memberCount < party.maxMembers)
        score += 5;
    return { score: Math.min(100, score), reasons };
}
function scoreGuildCompatibility(seeker, guild) {
    if (!guildRequirementsMet(seeker, guild))
        return { score: 0, reasons: ['requirements_not_met'] };
    let score = styleScore(seeker.playStyle, guild.playStyle) + Math.min(55, seeker.desiredFocusTags.filter(tag => guild.focusTags.includes(tag)).length * 18) + Math.min(10, (tagOverlap(seeker.activeEventTags, guild.activeEventTags)?.length ?? 0) * 5);
    if (guild.memberCount < guild.memberCap)
        score += 15;
    return { score: Math.min(100, score), reasons: [] };
}
