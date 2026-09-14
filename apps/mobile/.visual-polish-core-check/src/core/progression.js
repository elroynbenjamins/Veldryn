"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.XP_SCALING = void 0;
exports.baseXpForNextLevel = baseXpForNextLevel;
exports.skillXpForNextLevel = skillXpForNextLevel;
exports.characterXpForNextLevel = characterXpForNextLevel;
exports.levelFromXp = levelFromXp;
exports.characterLevelFromXp = characterLevelFromXp;
exports.totalXpAtLevel = totalXpAtLevel;
exports.characterTotalXpAtLevel = characterTotalXpAtLevel;
exports.progressWithinLevel = progressWithinLevel;
exports.characterProgressWithinLevel = characterProgressWithinLevel;
const SKILL_XP_SCALE = 4.3;
const CHARACTER_XP_SCALE = 43.2;
function baseXpForNextLevel(level) {
    return Math.floor(90 * Math.pow(level, 1.42) + level * 35);
}
function skillXpForNextLevel(level) {
    return Math.floor(baseXpForNextLevel(level) * SKILL_XP_SCALE);
}
function characterXpForNextLevel(level) {
    return Math.floor(baseXpForNextLevel(level) * CHARACTER_XP_SCALE);
}
function levelFromXpWith(totalXp, need) {
    let level = 1, spent = 0;
    while (level < 100) {
        const n = need(level);
        if (spent + n > totalXp)
            return level;
        spent += n;
        level++;
    }
    return 100;
}
function levelFromXp(totalXp) { return levelFromXpWith(totalXp, skillXpForNextLevel); }
function characterLevelFromXp(totalXp) { return levelFromXpWith(totalXp, characterXpForNextLevel); }
function totalXpAtLevelWith(level, need) { let xp = 0; for (let l = 1; l < level; l++)
    xp += need(l); return xp; }
function totalXpAtLevel(level) { return totalXpAtLevelWith(level, skillXpForNextLevel); }
function characterTotalXpAtLevel(level) { return totalXpAtLevelWith(level, characterXpForNextLevel); }
function progressWithinLevel(totalXp, level) { const floor = totalXpAtLevel(level); return { current: Math.max(0, totalXp - floor), need: skillXpForNextLevel(level) }; }
function characterProgressWithinLevel(totalXp, level) { const floor = characterTotalXpAtLevel(level); return { current: Math.max(0, totalXp - floor), need: characterXpForNextLevel(level) }; }
exports.XP_SCALING = { skill: SKILL_XP_SCALE, character: CHARACTER_XP_SCALE };
