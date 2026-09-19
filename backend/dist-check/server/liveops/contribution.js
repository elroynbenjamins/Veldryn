"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.contributionEligibleForRules = contributionEligibleForRules;
exports.scoreLiveOpsContribution = scoreLiveOpsContribution;
exports.cappedEventCredit = cappedEventCredit;
const party_contracts_1 = require("../party/party-contracts");
function hasIntersection(a, b) {
    if (!a || a.length === 0)
        return true;
    if (!b || b.length === 0)
        return false;
    const set = new Set(b);
    return a.some((value) => set.has(value));
}
function contributionEligibleForRules(event, rules) {
    if (!rules.allowedCategories.includes(event.profile.category))
        return { eligible: false, reason: 'category_not_eligible' };
    if (rules.allowedActivityKinds && !rules.allowedActivityKinds.includes(event.activityKind))
        return { eligible: false, reason: 'activity_not_eligible' };
    if (rules.allowedRegionIds && (!event.regionId || !rules.allowedRegionIds.includes(event.regionId)))
        return { eligible: false, reason: 'region_not_eligible' };
    if (rules.requiredAnyTags && !hasIntersection(rules.requiredAnyTags, event.tags))
        return { eligible: false, reason: 'event_tag_not_eligible' };
    return { eligible: true };
}
function scoreLiveOpsContribution(event, definition) {
    const eligibility = contributionEligibleForRules(event, definition.contributionRules);
    const basePoints = (0, party_contracts_1.scoreContribution)({ profile: event.profile, units: event.units });
    if (!eligibility.eligible || basePoints <= 0) {
        return { eligible: false, reason: eligibility.reason ?? 'no_points', basePoints, eventPoints: 0, category: event.profile.category, activityKind: event.activityKind };
    }
    const activityMultiplier = definition.contributionRules.activityMultipliers?.[event.activityKind] ?? 1;
    const challengeMultiplier = definition.contributionRules.challengeMultipliers?.[event.profile.challenge] ?? 1;
    const eventPoints = Math.max(1, Math.round(basePoints * activityMultiplier * challengeMultiplier));
    return { eligible: true, basePoints, eventPoints, category: event.profile.category, activityKind: event.activityKind };
}
function cappedEventCredit(rawEventPoints, pointsCreditedToday, dailyCap) {
    if (!Number.isFinite(rawEventPoints) || rawEventPoints <= 0)
        return 0;
    const remaining = Math.max(0, Math.floor(dailyCap) - Math.max(0, Math.floor(pointsCreditedToday)));
    return Math.min(Math.floor(rawEventPoints), remaining);
}
