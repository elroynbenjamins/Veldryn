"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REGIONAL_CRISIS_TEMPLATE_POOL = void 0;
exports.deriveRegionalCrisisScale = deriveRegionalCrisisScale;
exports.validateRegionalCrisisDefinition = validateRegionalCrisisDefinition;
exports.scoreRegionalCrisisContribution = scoreRegionalCrisisContribution;
exports.evaluateRegionalCrisis = evaluateRegionalCrisis;
exports.reachedCrisisPersonalMilestones = reachedCrisisPersonalMilestones;
const contribution_1 = require("../liveops/contribution");
const party_contracts_1 = require("../party/party-contracts");
const STANDARD_POINTS_PER_HOUR = 1000;
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function deriveRegionalCrisisScale(input) {
    const eligible = Math.max(1, Math.floor(input.eligibleActiveAccounts7d));
    const participation = clamp(input.expectedParticipationFraction ?? 0.45, 0.15, 0.85);
    const minutes = clamp(input.expectedMinutesPerParticipantPerDay ?? 20, 8, 45);
    const durationHours = clamp(input.durationHours, 24, 96);
    const days = durationHours / 24;
    const expectedParticipants = eligible * participation;
    const expectedPointsPerParticipant = (minutes / 60) * STANDARD_POINTS_PER_HOUR * days;
    const rawTarget = Math.round(expectedParticipants * expectedPointsPerParticipant);
    const minimum = Math.max(3000, Math.floor(input.minimumTargetPoints ?? 6000));
    const maximum = Math.max(minimum, Math.floor(input.maximumTargetPoints ?? 50_000_000));
    return {
        eligibleActiveAccounts7d: eligible,
        expectedParticipationFraction: participation,
        expectedMinutesPerParticipantPerDay: minutes,
        durationHours,
        targetPoints: clamp(rawTarget, minimum, maximum),
    };
}
function validateRegionalCrisisDefinition(definition) {
    const errors = [];
    if (!definition.id.trim())
        errors.push('id_required');
    if (!definition.regionId.trim())
        errors.push('region_required');
    if (!Number.isInteger(definition.version) || definition.version < 1)
        errors.push('version_invalid');
    if (definition.durationHours < 24 || definition.durationHours > 96)
        errors.push('duration_out_of_range');
    if (definition.personalRewardEligibilityPoints <= 0)
        errors.push('eligibility_points_invalid');
    if (definition.stages.length < 2)
        errors.push('stages_required');
    let previous = 0;
    for (const stage of definition.stages) {
        if (stage.thresholdFraction <= previous || stage.thresholdFraction > 1)
            errors.push('stage_thresholds_invalid');
        if (!stage.id.trim() || !stage.name.trim())
            errors.push('stage_identity_required');
        previous = stage.thresholdFraction;
    }
    if (Math.abs((definition.stages[definition.stages.length - 1]?.thresholdFraction ?? 0) - 1) > 0.000001)
        errors.push('final_stage_must_be_100_percent');
    let milestone = 0;
    for (const points of definition.personalMilestones) {
        if (points <= milestone)
            errors.push('personal_milestones_not_increasing');
        milestone = points;
    }
    const ruleCategories = definition.contributionRules.allowedCategories;
    if (definition.focus === 'combat' && (ruleCategories.length !== 1 || ruleCategories[0] !== 'combat'))
        errors.push('combat_focus_rules_mismatch');
    if (definition.focus === 'skilling' && (ruleCategories.length !== 1 || ruleCategories[0] !== 'skilling'))
        errors.push('skilling_focus_rules_mismatch');
    if (definition.focus === 'mixed' && (!ruleCategories.includes('combat') || !ruleCategories.includes('skilling')))
        errors.push('mixed_focus_rules_mismatch');
    return [...new Set(errors)];
}
function scoreRegionalCrisisContribution(event, definition, pointsCreditedToday) {
    const eligible = (0, contribution_1.contributionEligibleForRules)(event, definition.contributionRules);
    const rawPoints = Math.max(0, Math.floor((0, party_contracts_1.scoreContribution)({ profile: event.profile, units: event.units })));
    if (!eligible.eligible || rawPoints <= 0)
        return { eligible: false, reason: eligible.reason ?? 'no_points', rawPoints, creditedPoints: 0, category: event.profile.category };
    const activityMultiplier = definition.contributionRules.activityMultipliers?.[event.activityKind] ?? 1;
    const challengeMultiplier = definition.contributionRules.challengeMultipliers?.[event.profile.challenge] ?? 1;
    const adjusted = Math.max(1, Math.round(rawPoints * activityMultiplier * challengeMultiplier));
    const remaining = Math.max(0, Math.floor(definition.contributionRules.dailyAccountCreditCap) - Math.max(0, Math.floor(pointsCreditedToday)));
    return { eligible: true, rawPoints, creditedPoints: Math.min(adjusted, remaining), category: event.profile.category };
}
function evaluateRegionalCrisis(definition, progress) {
    const target = Math.max(1, progress.targetPoints);
    const fraction = clamp(progress.creditedPoints / target, 0, 1.25);
    const reached = definition.stages.filter(stage => fraction >= stage.thresholdFraction).map(stage => stage.id);
    let currentStageIndex = definition.stages.findIndex(stage => fraction < stage.thresholdFraction);
    if (currentStageIndex < 0)
        currentStageIndex = definition.stages.length - 1;
    const missing = [];
    if (progress.creditedPoints < target)
        missing.push('global_points');
    if (definition.focus === 'mixed') {
        const required = definition.contributionRules.minimumCategoryFraction ?? { combat: 0.25, skilling: 0.25 };
        if (progress.combatPoints < Math.ceil(target * (required.combat ?? 0)))
            missing.push('combat_share');
        if (progress.skillingPoints < Math.ceil(target * (required.skilling ?? 0)))
            missing.push('skilling_share');
    }
    return { progressFraction: fraction, secured: missing.length === 0, currentStageIndex, reachedStageIds: reached, missing };
}
function reachedCrisisPersonalMilestones(points, definition) {
    return definition.personalMilestones.filter(threshold => points >= threshold);
}
const sharedStages = (bossTemplateId) => [
    { id: 'response', thresholdFraction: 0.25, name: 'Response Mobilized', description: 'Regional responders have established a stable foothold.' },
    { id: 'turning_point', thresholdFraction: 0.60, name: 'Turning Point', description: 'The crisis is being pushed back and additional response options open.' },
    { id: 'secured', thresholdFraction: 1, name: 'Region Secured', description: 'The regional objective has been completed.', ...(bossTemplateId ? { unlockWorldBossTemplateId: bossTemplateId } : {}) },
];
exports.REGIONAL_CRISIS_TEMPLATE_POOL = [
    {
        id: 'crisis_rift_breach', version: 1, name: 'Rift Breach', regionId: 'rift', description: 'Contain a widening breach through combat and stabilizing skilling work.', focus: 'mixed', durationHours: 48,
        contributionRules: { allowedCategories: ['combat', 'skilling'], dailyAccountCreditCap: 2200, minimumCategoryFraction: { combat: 0.30, skilling: 0.30 }, challengeMultipliers: { elite: 1.05, boss: 1.10 } },
        stages: sharedStages('world_boss_rift_colossus'), personalMilestones: [250, 750, 1500, 2500], personalRewardEligibilityPoints: 250,
        successRewardBundleId: 'crisis_rift_breach_success_v1', participationRewardBundleId: 'crisis_participation_v1', successRegionModifier: { modifierKey: 'region.recovery.rift', durationHours: 12, description: '+5% eligible regional XP during recovery; use existing bonus caps.' }, eventTags: ['rift', 'regional_crisis', 'mixed'],
    },
    {
        id: 'crisis_sunscar_incursion', version: 1, name: 'Sunscar Incursion', regionId: 'sunscar', description: 'Break an organized incursion through sustained regional combat.', focus: 'combat', durationHours: 48,
        contributionRules: { allowedCategories: ['combat'], allowedActivityKinds: ['combat'], allowedRegionIds: ['sunscar'], dailyAccountCreditCap: 2200, challengeMultipliers: { elite: 1.08, boss: 1.12 } },
        stages: sharedStages('world_boss_cindermaw'), personalMilestones: [250, 750, 1500, 2500], personalRewardEligibilityPoints: 250,
        successRewardBundleId: 'crisis_sunscar_success_v1', participationRewardBundleId: 'crisis_participation_v1', successRegionModifier: { modifierKey: 'region.recovery.sunscar', durationHours: 12, description: '+5% eligible regional XP during recovery; use existing bonus caps.' }, eventTags: ['sunscar', 'regional_crisis', 'combat'],
    },
    {
        id: 'crisis_frostmarch_whiteout', version: 1, name: 'Frostmarch Whiteout', regionId: 'frostmarch', description: 'Keep settlements supplied and routes open through a severe regional whiteout.', focus: 'skilling', durationHours: 48,
        contributionRules: { allowedCategories: ['skilling'], allowedActivityKinds: ['gathering', 'processing', 'crafting', 'fishing', 'hunting', 'delivery'], allowedRegionIds: ['frostmarch'], dailyAccountCreditCap: 2200, activityMultipliers: { delivery: 1.08, crafting: 1.04 } },
        stages: sharedStages(), personalMilestones: [250, 750, 1500, 2500], personalRewardEligibilityPoints: 250,
        successRewardBundleId: 'crisis_frostmarch_success_v1', participationRewardBundleId: 'crisis_participation_v1', successRegionModifier: { modifierKey: 'region.recovery.frostmarch', durationHours: 12, description: '+5% eligible regional XP during recovery; use existing bonus caps.' }, eventTags: ['frostmarch', 'regional_crisis', 'skilling'],
    },
];
for (const definition of exports.REGIONAL_CRISIS_TEMPLATE_POOL) {
    const errors = validateRegionalCrisisDefinition(definition);
    if (errors.length)
        throw new Error(`invalid_regional_crisis:${definition.id}:${errors.join(',')}`);
}
