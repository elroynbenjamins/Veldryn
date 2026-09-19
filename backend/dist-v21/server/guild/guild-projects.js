"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GUILD_DEVELOPMENT_PROJECTS = exports.GUILD_WEEKLY_PROJECT_POOL = exports.GUILD_PROJECT_LATE_JOIN_MIN_MEMBERSHIP_HOURS = exports.GUILD_PROJECT_LATE_JOIN_PROGRESS_CUTOFF = exports.GUILD_PROJECT_MIXED_MINIMUM_FRACTION = exports.GUILD_PROJECT_MEANINGFUL_FRACTION = exports.GUILD_PROJECT_MEANINGFUL_FLOOR = exports.GUILD_PROJECT_PERSONAL_REWARD_FRACTION = exports.GUILD_PROJECT_PERSONAL_REWARD_FLOOR = exports.GUILD_PROJECT_DAILY_CREDIT_CAP = void 0;
exports.guildProjectSlotCap = guildProjectSlotCap;
exports.deriveGuildWeeklyProjectBalance = deriveGuildWeeklyProjectBalance;
exports.creditGuildProjectContribution = creditGuildProjectContribution;
exports.evaluateGuildProject = evaluateGuildProject;
exports.memberEligibleForGuildProjectCompletionReward = memberEligibleForGuildProjectCompletionReward;
exports.reachedPersonalMilestones = reachedPersonalMilestones;
exports.reachedGuildMilestones = reachedGuildMilestones;
exports.isContributionCategoryEligible = isContributionCategoryEligible;
const party_contracts_1 = require("../party/party-contracts");
exports.GUILD_PROJECT_DAILY_CREDIT_CAP = 2400;
exports.GUILD_PROJECT_PERSONAL_REWARD_FLOOR = 300;
exports.GUILD_PROJECT_PERSONAL_REWARD_FRACTION = 0.02;
exports.GUILD_PROJECT_MEANINGFUL_FLOOR = 250;
exports.GUILD_PROJECT_MEANINGFUL_FRACTION = 0.015;
exports.GUILD_PROJECT_MIXED_MINIMUM_FRACTION = 0.30;
exports.GUILD_PROJECT_LATE_JOIN_PROGRESS_CUTOFF = 0.70;
exports.GUILD_PROJECT_LATE_JOIN_MIN_MEMBERSHIP_HOURS = 48;
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function guildProjectSlotCap(guildLevel) {
    if (guildLevel < 5)
        return 0;
    if (guildLevel < 10)
        return 1;
    if (guildLevel < 25)
        return 2;
    return 3;
}
function deriveGuildWeeklyProjectBalance(activeMemberSnapshot) {
    const active = clamp(Math.floor(activeMemberSnapshot || 0), 2, 40);
    const targetPoints = clamp(4000 + active * 700, 6000, 32000);
    const minimumMeaningfulContributors = clamp(Math.ceil(active * 0.20), 2, 10);
    let singleAccountCompletionShareCap = 0.30;
    if (active <= 2)
        singleAccountCompletionShareCap = 0.60;
    else if (active <= 5)
        singleAccountCompletionShareCap = 0.50;
    else if (active <= 12)
        singleAccountCompletionShareCap = 0.40;
    else if (active <= 25)
        singleAccountCompletionShareCap = 0.35;
    const personalRewardThreshold = Math.max(exports.GUILD_PROJECT_PERSONAL_REWARD_FLOOR, Math.ceil(targetPoints * exports.GUILD_PROJECT_PERSONAL_REWARD_FRACTION));
    const meaningfulContributorThreshold = Math.max(exports.GUILD_PROJECT_MEANINGFUL_FLOOR, Math.ceil(targetPoints * exports.GUILD_PROJECT_MEANINGFUL_FRACTION));
    return {
        activeMemberSnapshot: active,
        targetPoints,
        minimumMeaningfulContributors,
        singleAccountCompletionShareCap,
        personalRewardThreshold,
        meaningfulContributorThreshold,
        mixedMinimumFraction: exports.GUILD_PROJECT_MIXED_MINIMUM_FRACTION,
    };
}
function creditGuildProjectContribution(input) {
    const rawPoints = Math.max(0, Math.floor((0, party_contracts_1.scoreContribution)({ profile: input.profile, units: input.units })));
    const dailyCapRemaining = Math.max(0, exports.GUILD_PROJECT_DAILY_CREDIT_CAP - Math.max(0, Math.floor(input.pointsCreditedToday)));
    const dailyCreditedPoints = Math.min(rawPoints, dailyCapRemaining);
    const accountShareCap = Math.ceil(input.balance.targetPoints * input.balance.singleAccountCompletionShareCap);
    const completionShareCapRemaining = Math.max(0, accountShareCap - Math.max(0, Math.floor(input.completionPointsByAccount)));
    const completionCreditedPoints = Math.min(dailyCreditedPoints, completionShareCapRemaining);
    return {
        rawPoints,
        dailyCreditedPoints,
        completionCreditedPoints,
        dailyCapRemaining: Math.max(0, dailyCapRemaining - dailyCreditedPoints),
        completionShareCapRemaining: Math.max(0, completionShareCapRemaining - completionCreditedPoints),
    };
}
function evaluateGuildProject(definition, balance, memberProgress) {
    const completionPoints = memberProgress.reduce((sum, row) => sum + Math.max(0, row.completionPoints), 0);
    const combatPoints = memberProgress.reduce((sum, row) => sum + Math.max(0, row.combatPoints), 0);
    const skillingPoints = memberProgress.reduce((sum, row) => sum + Math.max(0, row.skillingPoints), 0);
    const qualifyingContributors = memberProgress
        .filter((row) => row.rawPoints >= balance.meaningfulContributorThreshold)
        .map((row) => row.accountId);
    const missing = [];
    if (completionPoints < balance.targetPoints)
        missing.push('guild_points');
    if (qualifyingContributors.length < balance.minimumMeaningfulContributors)
        missing.push('distinct_contributors');
    if (definition.focus === 'combat' && combatPoints < balance.targetPoints)
        missing.push('combat_points');
    if (definition.focus === 'skilling' && skillingPoints < balance.targetPoints)
        missing.push('skilling_points');
    if (definition.focus === 'mixed') {
        const fraction = definition.mixedMinimumFraction ?? balance.mixedMinimumFraction;
        const minimum = Math.ceil(balance.targetPoints * fraction);
        if (combatPoints < minimum)
            missing.push('mixed_combat_share');
        if (skillingPoints < minimum)
            missing.push('mixed_skilling_share');
    }
    return { complete: missing.length === 0, completionPoints, combatPoints, skillingPoints, qualifyingContributors, missing };
}
function memberEligibleForGuildProjectCompletionReward(balance, progress, membership) {
    if (!progress || !membership.currentMember)
        return false;
    if (progress.rawPoints < balance.personalRewardThreshold)
        return false;
    if (membership.wasMemberAtStart)
        return true;
    const joinProgress = membership.progressFractionAtJoin ?? 1;
    if (joinProgress > exports.GUILD_PROJECT_LATE_JOIN_PROGRESS_CUTOFF)
        return false;
    if (membership.joinedAtMs == null)
        return false;
    const membershipHours = (membership.projectCompletedAtMs - membership.joinedAtMs) / 3_600_000;
    return membershipHours >= exports.GUILD_PROJECT_LATE_JOIN_MIN_MEMBERSHIP_HOURS;
}
function reachedPersonalMilestones(points) {
    const thresholds = [300, 750, 1500, 2500];
    return thresholds.filter((threshold) => points >= threshold);
}
function reachedGuildMilestones(points, targetPoints) {
    const fractions = [0.25, 0.50, 0.75, 1, 1.25];
    return fractions.filter((fraction) => points >= Math.ceil(targetPoints * fraction)).map((fraction) => Math.round(fraction * 100));
}
exports.GUILD_WEEKLY_PROJECT_POOL = [
    { id: 'guild_weekly_borderwatch', version: 1, name: 'Borderwatch Offensive', description: 'Defeat hostile forces, elites and bosses through normal eligible combat.', kind: 'weekly_campaign', focus: 'combat', minGuildLevel: 10, rewardTier: 'standard', guildXpReward: 1800, repeatable: true, estimatedDays: 7 },
    { id: 'guild_weekly_warden_call', version: 1, name: "Warden's Call", description: 'Push dangerous combat content. Challenge weighting rewards difficult encounters without requiring one exact enemy.', kind: 'weekly_campaign', focus: 'combat', minGuildLevel: 20, rewardTier: 'enhanced', guildXpReward: 2200, repeatable: true, estimatedDays: 7 },
    { id: 'guild_weekly_elite_suppression', version: 1, name: 'Elite Suppression', description: 'Support regional security through meaningful combat, with elites and bosses naturally scoring more effort.', kind: 'weekly_campaign', focus: 'combat', minGuildLevel: 20, rewardTier: 'enhanced', guildXpReward: 2400, repeatable: true, estimatedDays: 7 },
    { id: 'guild_weekly_road_relief', version: 1, name: "King's Road Relief", description: 'Gather, process and craft supplies across eligible skills. Slower/higher-tier actions earn proportional effort points.', kind: 'weekly_campaign', focus: 'skilling', minGuildLevel: 10, rewardTier: 'standard', guildXpReward: 1800, repeatable: true, estimatedDays: 7 },
    { id: 'guild_weekly_makers_drive', version: 1, name: "Makers' Supply Drive", description: 'A broad skilling campaign for gathering, processing, crafting, fishing, hunting and alchemy.', kind: 'weekly_campaign', focus: 'skilling', minGuildLevel: 20, rewardTier: 'enhanced', guildXpReward: 2200, repeatable: true, estimatedDays: 7 },
    { id: 'guild_weekly_reconstruction', version: 1, name: 'Asterfall Reconstruction', description: 'Contribute productive effort to reconstruction without forcing every member into the same profession.', kind: 'weekly_campaign', focus: 'skilling', minGuildLevel: 20, rewardTier: 'enhanced', guildXpReward: 2400, repeatable: true, estimatedDays: 7 },
    { id: 'guild_weekly_rift_containment', version: 1, name: 'Rift Containment', description: 'Balance combat response with supply work. Combat and Skilling must each provide at least 30% of the target.', kind: 'weekly_campaign', focus: 'mixed', minGuildLevel: 10, rewardTier: 'enhanced', mixedMinimumFraction: 0.30, guildXpReward: 2200, repeatable: true, estimatedDays: 7 },
    { id: 'guild_weekly_frontier_relief', version: 1, name: 'Frontier Relief', description: 'Fight threats and support the region through a balanced mix of Combat and Skilling contribution.', kind: 'weekly_campaign', focus: 'mixed', minGuildLevel: 20, rewardTier: 'enhanced', mixedMinimumFraction: 0.30, guildXpReward: 2400, repeatable: true, estimatedDays: 7 },
    { id: 'guild_weekly_watchtower', version: 1, name: 'Watchtower Renewal', description: 'Protect the work crews while rebuilding the frontier. Neither Combat nor Skilling can carry the project alone.', kind: 'weekly_campaign', focus: 'mixed', minGuildLevel: 20, rewardTier: 'prestige', mixedMinimumFraction: 0.30, guildXpReward: 2600, repeatable: true, estimatedDays: 7 },
];
/**
 * Development projects preserve the existing VELDRYN guild-progression intent: communal resource sinks that unlock
 * permanent guild progression. Item IDs are reference IDs from the supplied design database and MUST be validated
 * against the current repository content registry during merge. No Market/procurement dependency exists in v18.
 */
exports.GUILD_DEVELOPMENT_PROJECTS = [
    {
        id: 'guild_dev_reinforce_hall', version: 1, name: 'Reinforce the Guild Hall', description: 'Permanent communal construction project for the next Guild Hall stage.', kind: 'development', focus: 'development', minGuildLevel: 5, requiredBuildingKey: 'guild.upgrade.hall_1', rewardTier: 'prestige', guildXpReward: 1800, repeatable: false, estimatedDays: 3,
        donationRequirements: [{ resourceKind: 'gold', resourceId: 'gold', quantity: 50000 }, { resourceKind: 'item', resourceId: 'ITEM_0008', quantity: 600 }, { resourceKind: 'item', resourceId: 'ITEM_0010', quantity: 300 }, { resourceKind: 'item', resourceId: 'ITEM_0070', quantity: 150 }], completionUnlockKey: 'guild.upgrade.hall_2'
    },
    {
        id: 'guild_dev_stock_lodge', version: 1, name: 'Stock the Expedition Lodge', description: 'Permanent supply project for guild expedition infrastructure.', kind: 'development', focus: 'development', minGuildLevel: 12, requiredBuildingKey: 'guild.upgrade.lodge_1', rewardTier: 'prestige', guildXpReward: 2000, repeatable: false, estimatedDays: 3,
        donationRequirements: [{ resourceKind: 'gold', resourceId: 'gold', quantity: 65000 }, { resourceKind: 'item', resourceId: 'ITEM_0033', quantity: 180 }, { resourceKind: 'item', resourceId: 'ITEM_0043', quantity: 200 }, { resourceKind: 'item', resourceId: 'ITEM_0037', quantity: 300 }], completionUnlockKey: 'guild.expedition.supply_chest'
    },
    {
        id: 'guild_dev_runebound_research', version: 1, name: 'Runebound Research', description: 'Permanent research project that expands advanced decree/research options.', kind: 'development', focus: 'development', minGuildLevel: 20, requiredBuildingKey: 'guild.upgrade.library_2', rewardTier: 'prestige', guildXpReward: 2600, repeatable: false, estimatedDays: 4,
        donationRequirements: [{ resourceKind: 'gold', resourceId: 'gold', quantity: 90000 }, { resourceKind: 'item', resourceId: 'ITEM_0029', quantity: 120 }, { resourceKind: 'item', resourceId: 'ITEM_0078', quantity: 50 }, { resourceKind: 'item', resourceId: 'ITEM_0074', quantity: 100 }], completionUnlockKey: 'guild.decree.advanced_slot'
    },
    {
        id: 'guild_dev_war_standards', version: 1, name: 'Forge the War Standards', description: 'Permanent guild-war preparation project. Safe to leave disabled until Guild War is implemented.', kind: 'development', focus: 'development', minGuildLevel: 10, requiredBuildingKey: 'guild.upgrade.warroom_1', rewardTier: 'prestige', guildXpReward: 2200, repeatable: false, estimatedDays: 3,
        donationRequirements: [{ resourceKind: 'gold', resourceId: 'gold', quantity: 75000 }, { resourceKind: 'item', resourceId: 'ITEM_0081', quantity: 180 }, { resourceKind: 'item', resourceId: 'ITEM_0079', quantity: 250 }, { resourceKind: 'item', resourceId: 'ITEM_0030', quantity: 80 }], completionUnlockKey: 'guild.war.banner.customization'
    },
];
function isContributionCategoryEligible(focus, category) {
    if (focus === 'development')
        return false;
    if (focus === 'mixed')
        return true;
    return focus === category;
}
