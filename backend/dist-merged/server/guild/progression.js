"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GUILD_SKILLS = exports.GUILD_TREE_DEVELOPMENT_GATES = exports.GUILD_TREE_DEVELOPMENT_UNLOCKS = exports.GUILD_TREE_TIER_REQUIREMENTS = exports.GUILD_SKILL_POINT_BUDGET = exports.GUILD_SKILL_POINTS_BY_LEVEL = exports.GUILD_XP_THRESHOLDS = exports.GUILD_MEMBER_CAP_LEVEL_GATES = exports.GUILD_LAUNCH_MEMBER_CAP = exports.GUILD_BASE_MEMBER_CAP = exports.GUILD_LAUNCH_LEVEL_CAP = void 0;
exports.guildTreeDevelopmentCost = guildTreeDevelopmentCost;
exports.guildLevelForXp = guildLevelForXp;
exports.guildXpForNextLevel = guildXpForNextLevel;
exports.guildSkillPointBudgetForLevel = guildSkillPointBudgetForLevel;
exports.validateGuildRanks = validateGuildRanks;
exports.spentPoints = spentPoints;
exports.canAllocate = canAllocate;
exports.guildUpgradeEffects = guildUpgradeEffects;
exports.guildMemberCapForRanks = guildMemberCapForRanks;
exports.bossAttemptAllowed = bossAttemptAllowed;
exports.GUILD_LAUNCH_LEVEL_CAP = 10;
exports.GUILD_BASE_MEMBER_CAP = 12;
exports.GUILD_LAUNCH_MEMBER_CAP = 20;
exports.GUILD_MEMBER_CAP_LEVEL_GATES = Object.freeze([2, 4, 7, 10]);
/** Cumulative Guild XP needed for each launch level. Level 10 is deliberately a long-term launch goal. */
exports.GUILD_XP_THRESHOLDS = Object.freeze([0, 1200, 3200, 6500, 11000, 17000, 24500, 33500, 44000, 56000]);
/** Cumulative skill points available by Guild Level 1..10. */
exports.GUILD_SKILL_POINTS_BY_LEVEL = Object.freeze([0, 3, 6, 9, 14, 17, 20, 23, 26, 31]);
exports.GUILD_SKILL_POINT_BUDGET = exports.GUILD_SKILL_POINTS_BY_LEVEL[exports.GUILD_LAUNCH_LEVEL_CAP - 1];
/**
 * Skill Points buy individual ranks. Resources do not get charged on every click.
 * Instead, communal Development Projects unlock the expensive Tree tiers.
 * materialContributionUnits are normalized project units so content data can map them
 * to current authored materials without hard-coding stale item IDs here.
 */
exports.GUILD_TREE_TIER_REQUIREMENTS = [
    { branch: 'professions', tier: 1, requiredGuildLevel: 1, goldCost: 0, materialContributionUnits: 0 },
    { branch: 'professions', tier: 2, requiredGuildLevel: 5, projectKey: 'guild.tree.professions.2', goldCost: 60000, materialContributionUnits: 900 },
    { branch: 'professions', tier: 3, requiredGuildLevel: 9, projectKey: 'guild.tree.professions.3', goldCost: 180000, materialContributionUnits: 2400 },
    { branch: 'fellowship', tier: 1, requiredGuildLevel: 1, goldCost: 0, materialContributionUnits: 0 },
    { branch: 'fellowship', tier: 2, requiredGuildLevel: 4, projectKey: 'guild.tree.fellowship.2', goldCost: 50000, materialContributionUnits: 750 },
    { branch: 'fellowship', tier: 3, requiredGuildLevel: 8, projectKey: 'guild.tree.fellowship.3', goldCost: 150000, materialContributionUnits: 2100 },
    { branch: 'vanguard', tier: 1, requiredGuildLevel: 1, goldCost: 0, materialContributionUnits: 0 },
    { branch: 'vanguard', tier: 2, requiredGuildLevel: 6, projectKey: 'guild.tree.vanguard.2', goldCost: 90000, materialContributionUnits: 1200 },
    { branch: 'vanguard', tier: 3, requiredGuildLevel: 10, projectKey: 'guild.tree.vanguard.3', goldCost: 250000, materialContributionUnits: 3200 },
];
const PROFESSION_COSTS = [1, 1, 1, 2, 2, 3];
const FELLOWSHIP_COSTS = [2, 2, 3, 4];
const VANGUARD_COSTS = [1, 2, 2, 3, 3, 4];
exports.GUILD_TREE_DEVELOPMENT_UNLOCKS = Object.freeze({
    professionsTier2: 'guild.tree.professions.tier2',
    professionsTier3: 'guild.tree.professions.tier3',
    fellowshipTier2: 'guild.tree.fellowship.tier2',
    fellowshipTier3: 'guild.tree.fellowship.tier3',
    vanguardTier2: 'guild.tree.vanguard.tier2',
    vanguardTier3: 'guild.tree.vanguard.tier3',
});
exports.GUILD_TREE_DEVELOPMENT_GATES = [
    { unlockKey: exports.GUILD_TREE_DEVELOPMENT_UNLOCKS.professionsTier2, branch: 'professions', tier: 2, requiredGuildLevel: 5, baseGold: 75000, goldPerActiveMember: 7500, baseWeightedResources: 4500, weightedResourcesPerActiveMember: 450, expectedDays: 4, resourceThemes: ['ore', 'logs', 'fish', 'herbs', 'processed materials'] },
    { unlockKey: exports.GUILD_TREE_DEVELOPMENT_UNLOCKS.professionsTier3, branch: 'professions', tier: 3, requiredGuildLevel: 9, baseGold: 200000, goldPerActiveMember: 15000, baseWeightedResources: 12000, weightedResourcesPerActiveMember: 900, expectedDays: 7, resourceThemes: ['regional resources', 'refined materials', 'crafted components'] },
    { unlockKey: exports.GUILD_TREE_DEVELOPMENT_UNLOCKS.fellowshipTier2, branch: 'fellowship', tier: 2, requiredGuildLevel: 5, baseGold: 90000, goldPerActiveMember: 8000, baseWeightedResources: 4000, weightedResourcesPerActiveMember: 400, expectedDays: 4, resourceThemes: ['logs', 'food', 'cloth/leather', 'construction materials'] },
    { unlockKey: exports.GUILD_TREE_DEVELOPMENT_UNLOCKS.fellowshipTier3, branch: 'fellowship', tier: 3, requiredGuildLevel: 9, baseGold: 225000, goldPerActiveMember: 16000, baseWeightedResources: 11000, weightedResourcesPerActiveMember: 850, expectedDays: 7, resourceThemes: ['regional supplies', 'crafted components', 'rare construction materials'] },
    { unlockKey: exports.GUILD_TREE_DEVELOPMENT_UNLOCKS.vanguardTier2, branch: 'vanguard', tier: 2, requiredGuildLevel: 6, baseGold: 100000, goldPerActiveMember: 9000, baseWeightedResources: 4500, weightedResourcesPerActiveMember: 450, expectedDays: 4, resourceThemes: ['ingots', 'hides', 'monster drops', 'combat supplies'] },
    { unlockKey: exports.GUILD_TREE_DEVELOPMENT_UNLOCKS.vanguardTier3, branch: 'vanguard', tier: 3, requiredGuildLevel: 10, baseGold: 250000, goldPerActiveMember: 18000, baseWeightedResources: 13000, weightedResourcesPerActiveMember: 1000, expectedDays: 7, resourceThemes: ['regional combat drops', 'refined metals', 'rare monster materials'] },
];
function guildTreeDevelopmentCost(gate, activeMembers) {
    const members = Math.max(2, Math.min(20, Math.floor(activeMembers || 0)));
    return { gold: gate.baseGold + gate.goldPerActiveMember * members, weightedResources: gate.baseWeightedResources + gate.weightedResourcesPerActiveMember * members };
}
exports.GUILD_SKILLS = [
    { id: 'professions_training', branch: 'professions', name: 'Skilling Mentorship', description: 'Six small ranks of non-combat Skill XP. Max +6%.', maxRank: 6, costPerRank: [...PROFESSION_COSTS], effectKey: 'skillXpBps', effectPerRank: 100, requiredGuildLevelByRank: [2, 3, 4, 6, 8, 10], scope: 'all_skilling' },
    { id: 'professions_gathering', branch: 'professions', name: "Gatherer's Network", description: 'Six small ranks of gathering action speed. Max +6%.', maxRank: 6, costPerRank: [...PROFESSION_COSTS], effectKey: 'gatheringSpeedBps', effectPerRank: 100, requiredGuildLevelByRank: [2, 3, 5, 6, 8, 10], scope: 'all_skilling' },
    { id: 'professions_production', branch: 'professions', name: 'Workshop Rhythm', description: 'Six small ranks of crafting and processing speed. Max +6%.', maxRank: 6, costPerRank: [...PROFESSION_COSTS], effectKey: 'productionSpeedBps', effectPerRank: 100, requiredGuildLevelByRank: [3, 4, 5, 7, 9, 10], scope: 'all_skilling' },
    { id: 'member_capacity', branch: 'fellowship', name: 'Open Halls', description: 'Expands the launch Guild member cap by 2 per rank.', maxRank: 4, costPerRank: [...FELLOWSHIP_COSTS], effectKey: 'memberCap', effectPerRank: 2, requiredGuildLevelByRank: [...exports.GUILD_MEMBER_CAP_LEVEL_GATES], scope: 'guild_system' },
    { id: 'fellowship_projects', branch: 'fellowship', name: 'Project Council', description: 'Unlocks extra Project-board choice and coordination tiers.', maxRank: 4, costPerRank: [...FELLOWSHIP_COSTS], effectKey: 'projectDraftChoices', effectPerRank: 1, requiredGuildLevelByRank: [3, 5, 7, 10], scope: 'guild_system' },
    { id: 'fellowship_quests', branch: 'fellowship', name: 'Guild Quests', description: 'Unlocks deeper cooperative Guild quest tiers.', maxRank: 4, costPerRank: [...FELLOWSHIP_COSTS], effectKey: 'guildQuestTier', effectPerRank: 1, requiredGuildLevelByRank: [3, 5, 7, 10], scope: 'guild_system' },
    { id: 'fellowship_network', branch: 'fellowship', name: 'Fellowship Network', description: 'Unlocks Decree and future cooperative-system tiers.', maxRank: 4, costPerRank: [...FELLOWSHIP_COSTS], effectKey: 'fellowshipUnlockTier', effectPerRank: 1, requiredGuildLevelByRank: [4, 6, 8, 10], scope: 'guild_system' },
    { id: 'vanguard_assault', branch: 'vanguard', name: 'Guild Assault Drills', description: 'Six costly ranks of damage only inside Guild combat. Max +6%.', maxRank: 6, costPerRank: [...VANGUARD_COSTS], effectKey: 'guildCombatDamageBps', effectPerRank: 100, requiredGuildLevelByRank: [3, 4, 5, 6, 8, 10], scope: 'guild_combat_only' },
    { id: 'vanguard_guard', branch: 'vanguard', name: 'Guild Guard Drills', description: 'Six costly ranks of mitigation only inside Guild combat. Max +6%.', maxRank: 6, costPerRank: [...VANGUARD_COSTS], effectKey: 'guildCombatDefenseBps', effectPerRank: 100, requiredGuildLevelByRank: [3, 4, 5, 6, 8, 10], scope: 'guild_combat_only' },
    { id: 'vanguard_support', branch: 'vanguard', name: 'Guild Support Drills', description: 'Six costly ranks of healing/support power only inside Guild combat. Max +6%.', maxRank: 6, costPerRank: [...VANGUARD_COSTS], effectKey: 'guildSupportPowerBps', effectPerRank: 100, requiredGuildLevelByRank: [4, 5, 6, 7, 9, 10], scope: 'guild_combat_only' },
    { id: 'vanguard_boss', branch: 'vanguard', name: 'Boss Coordination', description: 'Six costly ranks of Guild boss/raid contribution. Max +6%.', maxRank: 6, costPerRank: [...VANGUARD_COSTS], effectKey: 'guildBossContributionBps', effectPerRank: 100, requiredGuildLevelByRank: [4, 5, 6, 7, 9, 10], scope: 'guild_combat_only' },
];
function guildLevelForXp(xp) {
    const safe = Math.max(0, Math.floor(Number.isFinite(xp) ? xp : 0));
    let level = 1;
    for (let i = 1; i < exports.GUILD_XP_THRESHOLDS.length; i++) {
        if (safe >= exports.GUILD_XP_THRESHOLDS[i])
            level = i + 1;
        else
            break;
    }
    return Math.min(exports.GUILD_LAUNCH_LEVEL_CAP, level);
}
function guildXpForNextLevel(level) {
    const safe = Math.max(1, Math.min(exports.GUILD_LAUNCH_LEVEL_CAP, Math.floor(level)));
    return safe >= exports.GUILD_LAUNCH_LEVEL_CAP ? null : exports.GUILD_XP_THRESHOLDS[safe];
}
function guildSkillPointBudgetForLevel(level) {
    const safe = Math.max(1, Math.min(exports.GUILD_LAUNCH_LEVEL_CAP, Math.floor(level)));
    return exports.GUILD_SKILL_POINTS_BY_LEVEL[safe - 1];
}
function validateGuildRanks(ranks, skills = exports.GUILD_SKILLS) { const known = new Set(skills.map(s => s.id)); return Object.keys(ranks).every(id => known.has(id)) && skills.every(s => Number.isInteger(ranks[s.id] ?? 0) && (ranks[s.id] ?? 0) >= 0 && (ranks[s.id] ?? 0) <= s.maxRank); }
function spentPoints(ranks, skills = exports.GUILD_SKILLS) { if (!validateGuildRanks(ranks, skills))
    return Infinity; return skills.reduce((sum, s) => sum + s.costPerRank.slice(0, ranks[s.id] ?? 0).reduce((a, b) => a + b, 0), 0); }
function canAllocate(ranks, skill, newRank, budgetOrLevel = exports.GUILD_LAUNCH_LEVEL_CAP, guildLevel, unlocks = new Set()) {
    const level = guildLevel ?? budgetOrLevel, budget = guildLevel == null ? guildSkillPointBudgetForLevel(level) : budgetOrLevel;
    const current = ranks[skill.id] ?? 0, requiredLevel = skill.requiredGuildLevelByRank[newRank - 1] ?? exports.GUILD_LAUNCH_LEVEL_CAP + 1, requiredUnlock = skill.requiredDevelopmentUnlockByRank?.[newRank - 1] ?? null;
    return newRank === current + 1 && newRank <= skill.maxRank && Number.isInteger(level) && level >= requiredLevel && level <= exports.GUILD_LAUNCH_LEVEL_CAP && (!requiredUnlock || unlocks.has(requiredUnlock)) && spentPoints({ ...ranks, [skill.id]: newRank }) <= budget;
}
function guildUpgradeEffects(ranks, skills = exports.GUILD_SKILLS) {
    if (!validateGuildRanks(ranks, skills))
        throw new Error('invalid_guild_skill_ranks');
    const keys = ['memberCap', 'projectDraftChoices', 'guildQuestTier', 'fellowshipUnlockTier', 'skillXpBps', 'gatheringSpeedBps', 'productionSpeedBps', 'guildCombatDamageBps', 'guildCombatDefenseBps', 'guildSupportPowerBps', 'guildBossContributionBps'];
    const out = Object.fromEntries(keys.map(key => [key, 0]));
    for (const s of skills)
        out[s.effectKey] += (ranks[s.id] ?? 0) * s.effectPerRank;
    return out;
}
function guildMemberCapForRanks(ranks) { return Math.min(exports.GUILD_LAUNCH_MEMBER_CAP, exports.GUILD_BASE_MEMBER_CAP + guildUpgradeEffects(ranks).memberCap); }
function bossAttemptAllowed(existing, max = 3) { return Number.isInteger(existing) && existing >= 0 && existing < max; }
