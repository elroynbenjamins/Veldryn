"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORLD_BOSS_V14_BRACKET_AUDIT_LIVE = void 0;
exports.auditWorldBossPowerBracketsV14 = auditWorldBossPowerBracketsV14;
exports.WORLD_BOSS_V14_BRACKET_AUDIT_LIVE = false;
const MAX_AGE_MS = 7 * 86400000;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,95}$/;
function auditWorldBossPowerBracketsV14(input) {
    if (!SAFE_ID.test(input.eventId) || !Number.isSafeInteger(input.nowUtcMs) || input.nowUtcMs <= 0 ||
        !Array.isArray(input.samples) || input.samples.length < 100 || input.samples.length > 20000)
        throw Error('world_boss_v14_invalid_audit_input');
    const ownerIds = new Set();
    for (const sample of input.samples) {
        if (!sample || !SAFE_ID.test(sample.ownerAccountId) || ownerIds.has(sample.ownerAccountId) ||
            !Number.isFinite(sample.combatPower) || sample.combatPower <= 0 || sample.combatPower > 1e8 ||
            !['tank', 'damage', 'support'].includes(sample.role) ||
            !Number.isSafeInteger(sample.capturedAtUtcMs) ||
            sample.capturedAtUtcMs > input.nowUtcMs ||
            input.nowUtcMs - sample.capturedAtUtcMs > MAX_AGE_MS)
            throw Error('world_boss_v14_invalid_or_unowned_sample');
        ownerIds.add(sample.ownerAccountId);
    }
    const sorted = [...input.samples].sort((a, b) => a.combatPower - b.combatPower ||
        a.ownerAccountId.localeCompare(b.ownerAccountId));
    const n = sorted.length;
    const minimumGroup = Math.max(10, Math.floor(n * .1));
    const cuts = [];
    for (let group = 1; group <= 4; group++) {
        const target = Math.round(n * group / 5);
        const lower = (cuts.at(-1) ?? 0) + minimumGroup;
        const upper = n - (5 - group) * minimumGroup;
        let selected = -1, delta = Number.POSITIVE_INFINITY;
        for (let i = lower; i <= upper; i++) {
            if (sorted[i - 1].combatPower >= sorted[i].combatPower)
                continue;
            const nextDelta = Math.abs(i - target);
            if (nextDelta < delta) {
                selected = i;
                delta = nextDelta;
            }
        }
        if (selected < 0)
            throw Error('world_boss_v14_power_distribution_cannot_form_five_brackets');
        cuts.push(selected);
    }
    const bounds = cuts.map(i => {
        const lower = sorted[i - 1].combatPower, upper = sorted[i].combatPower;
        const midpoint = lower + (upper - lower) / 2;
        if (!Number.isFinite(midpoint) || midpoint <= lower || midpoint >= upper)
            throw Error('world_boss_v14_precision_cannot_separate_power');
        return midpoint;
    });
    const warnings = [];
    const cohorts = [];
    let start = 0;
    for (let group = 1; group <= 5; group++) {
        const stop = cuts[group - 1] ?? n;
        const members = sorted.slice(start, stop);
        const roles = { tank: 0, damage: 0, support: 0 };
        for (const member of members)
            roles[member.role]++;
        for (const role of ['tank', 'damage', 'support'])
            if (roles[role] === 0)
                warnings.push('bracket_' + group + '_has_no_' + role + '_samples');
        cohorts.push({
            bracket: group, sampleCount: members.length,
            minimumPower: members[0].combatPower, maximumPower: members.at(-1).combatPower,
            roles,
        });
        start = stop;
    }
    return {
        status: 'review_only_not_approved', eventId: input.eventId,
        policyVersion: 'WB14_REVIEW_' + input.eventId + '_' + input.nowUtcMs,
        samplesReviewed: n, bounds, cohorts, warnings,
        approved: false, persisted: false,
    };
}
