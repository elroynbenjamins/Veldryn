"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.previewWorldBossImpactPrototype = previewWorldBossImpactPrototype;
exports.previewWorldBossMilestonesPrototype = previewWorldBossMilestonesPrototype;
/**
 * World Boss v8 role-normalized Impact PROPOSAL / offline preview only.
 *
 * No World Sigil grant, milestone entitlement or backend route consumes this
 * module. It requires externally sampled, power-bracket + class-specific
 * benchmarks; never infer benchmark output from client-supplied stats.
 */
const calculations_1 = require("./calculations");
const valid = (v) => Number.isFinite(v) && v >= 0;
const round = (v) => Math.round(v * 10000) / 10000;
const weights = {
    tank: { damage: .35, guard: 0, sustain: .10, protection: .45, utility: 0, survival: .10 },
    damage: { damage: .75, guard: .20, sustain: 0, protection: 0, utility: 0, survival: .05 },
    support: { damage: .20, guard: 0, sustain: .65, protection: 0, utility: .10, survival: .05 },
};
function metrics(p) {
    return {
        damage: p.bossHpDamage,
        guard: p.guardDamage,
        sustain: p.effectiveHealing + p.shieldConsumed,
        protection: p.tankProtection,
        utility: p.cleansePrevented + p.interrupts * 1, // Count is provisional: never mint for uncalibrated unit conversions.
        survival: Number(p.survived),
    };
}
/**
 * Adaptive weights only redistribute channels whose reference value is ZERO
 * in a particular phase. This prevents scoring unrealized mitigation/overheal,
 * while keeping class-specific utility (healer vs shield specialist) comparable.
 * A reference without meaningful sampled values is rejected, never assigned a
 * magical benchmark or free Sigils.
 */
function previewWorldBossImpactPrototype(input) {
    const { result, initiatorActorId, benchmark, role, classId, bracket } = input;
    if (!Object.prototype.hasOwnProperty.call(result.participants, initiatorActorId))
        throw Error('world_boss_impact_missing_initiator');
    if (!['tank', 'damage', 'support'].includes(role) || !Number.isInteger(bracket) || bracket < 1 || bracket > 5)
        throw Error('world_boss_impact_invalid_role_or_bracket');
    if (!benchmark.version || benchmark.version.length > 160 || !classId || benchmark.classId !== classId ||
        benchmark.boss !== result.boss || benchmark.phase !== result.phase ||
        benchmark.role !== role || benchmark.bracket !== bracket ||
        !Number.isSafeInteger(benchmark.samples) || benchmark.samples < 100)
        throw Error('world_boss_impact_uncalibrated_reference');
    const refs = {
        damage: benchmark.damage, guard: benchmark.guard, sustain: benchmark.sustain,
        protection: benchmark.protection, utility: benchmark.utility, survival: 1,
    };
    if (Object.values(refs).some(v => !valid(v)) || benchmark.damage <= 0)
        throw Error('world_boss_impact_invalid_benchmark_values');
    const observed = metrics(result.participants[initiatorActorId]);
    if (Object.values(observed).some(v => !valid(v)))
        throw Error('world_boss_impact_invalid_ledger');
    const applicable = Object.keys(weights[role]).filter(k => weights[role][k] > 0 && refs[k] > 0);
    const totalWeight = applicable.reduce((n, k) => n + weights[role][k], 0);
    if (totalWeight <= 0)
        throw Error('world_boss_impact_missing_references');
    const breakdown = {};
    let score = 0;
    for (const k of applicable) {
        const ratio = (0, calculations_1.clamp)(observed[k] / refs[k], 0, 1.4);
        const points = ratio * weights[role][k] / totalWeight;
        score += points;
        breakdown[k] = { actual: round(observed[k]), reference: round(refs[k]), weightedPoints: round(points) };
    }
    return { score: round((0, calculations_1.clamp)(score, 0, 1.4)), role, classId, bracket,
        benchmarkVersion: benchmark.version, breakdown, rewardEligible: false };
}
function previewWorldBossMilestonesPrototype(scores) {
    if (scores.length > 3 || scores.some(v => !valid(v) || v > 1.4))
        throw Error('world_boss_impact_invalid_event_scores');
    const total = round(scores.reduce((sum, s) => sum + s, 0));
    const milestones = [{ threshold: .8, hypotheticalSigils: 5 }, { threshold: 1.8, hypotheticalSigils: 10 }, { threshold: 3, hypotheticalSigils: 15 }];
    const reached = milestones.filter(x => total + 0.00001 >= x.threshold);
    return { total, reached, hypotheticalTotalMilestoneSigils: reached.reduce((n, x) => n + x.hypotheticalSigils, 0), rewardEligible: false };
}
