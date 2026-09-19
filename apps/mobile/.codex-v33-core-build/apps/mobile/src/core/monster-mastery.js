"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MONSTER_MASTERY_MAX_RANK = exports.MASTERY_POINTS_PER_RANK = void 0;
exports.normalizeMonsterMastery = normalizeMonsterMastery;
exports.monsterMastery = monsterMastery;
exports.recordMonsterMastery = recordMonsterMastery;
const monsters_1 = require("../content/monsters");
/** The workbook specifies 30 ranks and one point per kill, but no rank curve.
 * This integration uses 25 kills per rank (500 kills for the rank-20 unlock). */
exports.MASTERY_POINTS_PER_RANK = 25, exports.MONSTER_MASTERY_MAX_RANK = 30;
function normalizeMonsterMastery(raw) {
    const input = raw && typeof raw === 'object' ? raw : {};
    return Object.fromEntries(monsters_1.MONSTERS.filter(m => !m.boss).flatMap(m => { const n = input[m.id]; return typeof n === 'number' && Number.isFinite(n) && n > 0 ? [[m.id, Math.min(750, Math.floor(n))]] : []; }));
}
function monsterMastery(state, id) {
    const monster = monsters_1.MONSTERS.find(m => m.id === id);
    const points = monster && !monster.boss ? normalizeMonsterMastery(state.character?.monsterMasteryPoints)[id] ?? 0 : 0;
    const rank = Math.min(30, Math.floor(points / exports.MASTERY_POINTS_PER_RANK));
    return { points, rank, nextRankPoints: rank >= 30 ? 750 : (rank + 1) * exports.MASTERY_POINTS_PER_RANK, damageBonus: rank >= 30 ? .02 : rank >= 5 ? .01 : 0, materialBonus: rank >= 30 ? .05 : rank >= 15 ? .03 : 0, dropKnowledge: rank >= 10, eliteKnowledge: rank >= 20, badgeUnlocked: rank >= 25 };
}
function recordMonsterMastery(state, id, kills) {
    if (!state.character || !monsters_1.MONSTERS.some(m => m.id === id && !m.boss) || !Number.isSafeInteger(kills) || kills <= 0)
        return state;
    const points = normalizeMonsterMastery(state.character.monsterMasteryPoints);
    points[id] = Math.min(750, (points[id] ?? 0) + kills);
    const next = { ...state, character: { ...state.character, monsterMasteryPoints: points } };
    const counters = { ...state.account.companionUnlockProgress };
    for (const [target, n] of Object.entries(points))
        counters[target] = Math.floor(n / 25);
    counters.ASTERFALL_MASTERY_20_ALL = monsters_1.MONSTERS.filter(m => !m.boss && (points[m.id] ?? 0) >= 500).length;
    return { ...next, account: { ...next.account, companionUnlockProgress: counters } };
}
