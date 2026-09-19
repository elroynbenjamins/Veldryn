"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORLD_BOSS_TEMPLATE_POOL = void 0;
exports.validateWorldBossDefinition = validateWorldBossDefinition;
exports.deriveWorldBossScale = deriveWorldBossScale;
exports.phaseForHp = phaseForHp;
exports.computeWorldBossImpact = computeWorldBossImpact;
exports.applyWorldBossDamage = applyWorldBossDamage;
exports.canStartScoredBossAttempt = canStartScoredBossAttempt;
exports.eligibleForWorldBossVictoryReward = eligibleForWorldBossVictoryReward;
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function validateWorldBossDefinition(definition) {
    const errors = [];
    if (!definition.id.trim())
        errors.push('id_required');
    if (!definition.regionId.trim())
        errors.push('region_required');
    if (!Number.isInteger(definition.version) || definition.version < 1)
        errors.push('version_invalid');
    if (definition.durationHours < 12 || definition.durationHours > 96)
        errors.push('duration_out_of_range');
    if (definition.dailyScoredAttempts < 1 || definition.dailyScoredAttempts > 12)
        errors.push('daily_attempts_out_of_range');
    if (definition.attemptDurationSeconds < 30 || definition.attemptDurationSeconds > 300)
        errors.push('attempt_duration_out_of_range');
    if (definition.postDefeatEchoWindowHours < 0 || definition.postDefeatEchoWindowHours > 24)
        errors.push('echo_window_out_of_range');
    if (definition.phases.length < 2)
        errors.push('phases_required');
    let previous = 1.01;
    for (const phase of definition.phases) {
        if (phase.startsAtHpFraction >= previous || phase.startsAtHpFraction < 0 || phase.startsAtHpFraction > 1)
            errors.push('phase_thresholds_invalid');
        previous = phase.startsAtHpFraction;
    }
    if (Math.abs((definition.phases[0]?.startsAtHpFraction ?? 0) - 1) > 0.000001)
        errors.push('first_phase_must_start_at_full_hp');
    for (const [role, weights] of Object.entries(definition.roleWeights)) {
        const total = weights.directDamage + weights.damagePrevented + weights.effectiveHealing + weights.utilityPerSecond + weights.survivalBonusPerSecond;
        if (total <= 0 || !Number.isFinite(total))
            errors.push(`role_weights_invalid:${role}`);
    }
    let milestone = 0;
    for (const p of definition.personalImpactMilestones) {
        if (p <= milestone)
            errors.push('milestones_not_increasing');
        milestone = p;
    }
    return [...new Set(errors)];
}
function deriveWorldBossScale(input) {
    const eligible = Math.max(1, Math.floor(input.eligibleCombatAccounts7d));
    const participation = clamp(input.expectedParticipationFraction ?? 0.35, 0.10, 0.80);
    const attempts = clamp(input.expectedAttemptsPerParticipant ?? 3, 1, 8);
    const medianImpact = Math.max(1, Math.floor(input.medianImpactPerAttempt));
    const clearFraction = clamp(input.targetClearFraction ?? 0.78, 0.50, 0.95);
    const expectedImpact = eligible * participation * attempts * medianImpact;
    const raw = Math.round(expectedImpact * clearFraction);
    const min = Math.max(10_000, Math.floor(input.minHp ?? 50_000));
    const max = Math.max(min, Math.floor(input.maxHp ?? 9_000_000_000));
    return { eligibleCombatAccounts7d: eligible, expectedParticipationFraction: participation, expectedAttemptsPerParticipant: attempts, medianImpactPerAttempt: medianImpact, targetClearFraction: clearFraction, maxHp: clamp(raw, min, max) };
}
function phaseForHp(definition, remainingHp, maxHp) {
    const fraction = maxHp <= 0 ? 0 : clamp(remainingHp / maxHp, 0, 1);
    for (let i = definition.phases.length - 1; i >= 0; i--) {
        const phase = definition.phases[i];
        if (fraction <= phase.startsAtHpFraction)
            return phase;
    }
    return definition.phases[0];
}
/**
 * Role-aware Raid Impact keeps Tank/Support classes useful. These weights are not client-provided:
 * the trusted combat service resolves roleProfile and combat metrics from authoritative encounter state.
 */
function computeWorldBossImpact(definition, result) {
    const w = definition.roleWeights[result.roleProfile];
    if (!w)
        throw new Error('world_boss_role_profile_not_configured');
    const duration = clamp(result.durationSeconds, 0, definition.attemptDurationSeconds);
    const direct = Math.max(0, result.directDamage) * w.directDamage;
    const mitigation = Math.max(0, result.damagePrevented) * w.damagePrevented;
    const healing = Math.max(0, result.effectiveHealing) * w.effectiveHealing;
    const utility = clamp(result.utilityUptimeSeconds, 0, duration) * w.utilityPerSecond;
    const survival = (result.survived ? duration : Math.min(duration, Math.max(0, result.durationSeconds))) * w.survivalBonusPerSecond;
    const raidImpact = Math.max(0, Math.round(direct + mitigation + healing + utility + survival));
    return { raidImpact, globalDamage: raidImpact, performanceBreakdown: { direct: Math.round(direct), mitigation: Math.round(mitigation), healing: Math.round(healing), utility: Math.round(utility), survival: Math.round(survival) } };
}
function applyWorldBossDamage(remainingHp, requestedDamage) {
    const previous = Math.max(0, Math.floor(remainingHp));
    const requested = Math.max(0, Math.floor(requestedDamage));
    const applied = Math.min(previous, requested);
    const remaining = previous - applied;
    return { previousHp: previous, remainingHp: remaining, requestedDamage: requested, appliedDamage: applied, defeated: remaining === 0 };
}
function canStartScoredBossAttempt(input) {
    if (input.state === 'active' && input.nowMs < input.endsAtMs) {
        if (input.attemptsToday >= input.definition.dailyScoredAttempts)
            return { allowed: false, echoOnly: false, reason: 'daily_attempt_limit' };
        return { allowed: true, echoOnly: false };
    }
    if (input.state === 'defeated' && input.defeatedAtMs != null) {
        const echoEnds = input.defeatedAtMs + input.definition.postDefeatEchoWindowHours * 3_600_000;
        if (input.nowMs < echoEnds && input.nowMs < input.endsAtMs) {
            if ((input.validAttemptsTotal ?? 0) > 0)
                return { allowed: false, echoOnly: false, reason: 'already_participated_before_defeat' };
            if ((input.echoAttemptsTotal ?? 0) > 0)
                return { allowed: false, echoOnly: false, reason: 'echo_attempt_already_used' };
            return { allowed: true, echoOnly: true };
        }
    }
    return { allowed: false, echoOnly: false, reason: 'boss_not_available' };
}
function eligibleForWorldBossVictoryReward(validAttempts, definition) {
    return validAttempts >= definition.minimumParticipationAttemptsForVictoryReward;
}
const roleWeights = {
    damage: { directDamage: 1, damagePrevented: 0.10, effectiveHealing: 0.10, utilityPerSecond: 3, survivalBonusPerSecond: 1 },
    tank: { directDamage: 0.78, damagePrevented: 0.62, effectiveHealing: 0.10, utilityPerSecond: 4, survivalBonusPerSecond: 4 },
    support: { directDamage: 0.72, damagePrevented: 0.25, effectiveHealing: 0.58, utilityPerSecond: 6, survivalBonusPerSecond: 3 },
    hybrid: { directDamage: 0.86, damagePrevented: 0.32, effectiveHealing: 0.30, utilityPerSecond: 4, survivalBonusPerSecond: 2 },
};
const phases = (theme) => [
    { id: 'phase_1', startsAtHpFraction: 1, name: 'Unbroken', description: 'The boss fights at full strength while responders establish a rhythm.', attackMultiplier: 1, mechanicTags: [theme, 'opening'] },
    { id: 'phase_2', startsAtHpFraction: 0.70, name: 'Enraged', description: 'At 70% HP the boss gains pressure and new mechanics.', attackMultiplier: 1.10, mechanicTags: [theme, 'enraged'] },
    { id: 'phase_3', startsAtHpFraction: 0.35, name: 'Last Stand', description: 'Below 35% HP the final mechanics activate.', attackMultiplier: 1.20, mechanicTags: [theme, 'final'] },
];
exports.WORLD_BOSS_TEMPLATE_POOL = [
    { id: 'world_boss_cindermaw', version: 1, name: 'Cindermaw, the Sunscar Tyrant', regionId: 'sunscar', description: 'A colossal threat pushing through the Sunscar incursion.', minCombatLevel: 30, durationHours: 36, dailyScoredAttempts: 4, attemptDurationSeconds: 90, postDefeatEchoWindowHours: 12, minimumParticipationAttemptsForVictoryReward: 1, roleWeights, phases: phases('fire'), personalImpactMilestones: [750, 2000, 4000, 7000], participationRewardBundleId: 'world_boss_participation_v1', victoryRewardBundleId: 'world_boss_victory_v1', prestigeRewardBundleId: 'world_boss_prestige_v1', eventTags: ['sunscar', 'world_boss', 'fire'] },
    { id: 'world_boss_rift_colossus', version: 1, name: 'The Riftbound Colossus', regionId: 'rift', description: 'A massive entity forced through the breach by unstable Rift pressure.', minCombatLevel: 40, durationHours: 36, dailyScoredAttempts: 4, attemptDurationSeconds: 90, postDefeatEchoWindowHours: 12, minimumParticipationAttemptsForVictoryReward: 1, roleWeights, phases: phases('rift'), personalImpactMilestones: [750, 2000, 4000, 7000], participationRewardBundleId: 'world_boss_participation_v1', victoryRewardBundleId: 'world_boss_victory_v1', prestigeRewardBundleId: 'world_boss_prestige_v1', eventTags: ['rift', 'world_boss', 'riftborn'] },
];
for (const definition of exports.WORLD_BOSS_TEMPLATE_POOL) {
    const errors = validateWorldBossDefinition(definition);
    if (errors.length)
        throw new Error(`invalid_world_boss:${definition.id}:${errors.join(',')}`);
}
