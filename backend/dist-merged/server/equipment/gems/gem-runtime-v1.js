"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeGemLoadoutV1 = summarizeGemLoadoutV1;
exports.applyStatGemsV1 = applyStatGemsV1;
const gem_catalog_v1_1 = require("./gem-catalog-v1");
function effectiveRollPercent(value) { return typeof value === 'number' && Number.isInteger(value) && value >= 80 && value <= 120 && (value - 80) % 5 === 0 ? value : 100; }
function summarizeGemLoadoutV1(entries) {
    const statPercent = {}, statPercentagePoints = {}, groups = new Map();
    for (const entry of entries) {
        if (entry.sockets.stat) {
            const d = (0, gem_catalog_v1_1.findStatGem)(entry.sockets.stat.familyId);
            if (!d)
                throw new Error('unknown_stat_gem');
            const target = d.unit === 'percent' ? statPercent : statPercentagePoints;
            target[d.stat] = (target[d.stat] ?? 0) + d.values[entry.sockets.stat.grade] * effectiveRollPercent(entry.sockets.stat.rollPercent) / 100;
        }
        if (entry.sockets.effect) {
            const g = entry.sockets.effect;
            const d = (0, gem_catalog_v1_1.findEffectGem)(g.familyId);
            if (!d)
                throw new Error('unknown_effect_gem');
            const grades = groups.get(g.familyId) ?? [];
            if (grades.length >= d.maxEquippedCopies)
                throw new Error('effect_gem_resonance_cap');
            grades.push(g);
            groups.set(g.familyId, grades);
        }
    }
    const effects = [...groups.entries()].map(([familyId, grades]) => { const d = (0, gem_catalog_v1_1.findEffectGem)(familyId); return { familyId, copies: grades.length, resonance: Math.min(3, grades.length), totalValue: Number(grades.reduce((s, g) => s + d.values[g.grade] * effectiveRollPercent(g.rollPercent) / 100, 0).toFixed(6)), grades: grades.map(g => g.grade).sort() }; });
    return { statPercent, statPercentagePoints, effects };
}
function applyStatGemsV1(base, summary) {
    const next = { ...base };
    for (const k of Object.keys(next)) {
        const pct = summary.statPercent[k] ?? 0, pp = summary.statPercentagePoints[k] ?? 0;
        next[k] = Number((base[k] * (1 + pct) + pp).toFixed(5));
    }
    return next;
}
