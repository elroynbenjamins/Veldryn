"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHARACTER_SLOT_THRESHOLDS = void 0;
exports.characterSkillTotal = characterSkillTotal;
exports.accountSkillLevel = accountSkillLevel;
exports.unlockedCharacterSlots = unlockedCharacterSlots;
exports.recordAccountProgress = recordAccountProgress;
exports.accountCharacters = accountCharacters;
exports.characterCreationError = characterCreationError;
exports.projectCharacter = projectCharacter;
const class_skills_1 = require("../content/class-skills");
const progression_1 = require("./progression");
exports.CHARACTER_SLOT_THRESHOLDS = [0, 250, 500, 950, 1600];
const ENABLED_SKILLS = new Set(['mining', 'woodcutting', 'fishing', 'smithing', 'cooking', 'herbalism', 'alchemy', 'hunting', 'exploration', 'tailoring', 'enchanting', 'faith']);
const safeLevel = (row) => Number.isFinite(row?.xp) && row.xp >= 0 ? (0, progression_1.levelFromXp)(row.xp) : 1;
function characterSkillTotal(skills, character) {
    const ordinary = new Set();
    let total = 0;
    for (const s of skills) {
        if (ENABLED_SKILLS.has(s.skillId) && !ordinary.has(s.skillId)) {
            ordinary.add(s.skillId);
            total += safeLevel(s);
        }
    }
    if (character)
        for (const s of (character.classSkills ?? [])) {
            if ((0, class_skills_1.classSkillsFor)(character.classId).some(d => d.id === s.skillId))
                total += safeLevel(s);
        }
    return total;
}
function accountSkillLevel(state) { if (!state.character)
    return 0; let total = characterSkillTotal(state.skills, state.character); for (const entry of state.otherCharacters ?? [])
    total += characterSkillTotal(entry.skills, entry.character); return total; }
function unlockedCharacterSlots(state) { const earned = Number(state.account.unlockedCharacterSlots ?? 0); const threshold = exports.CHARACTER_SLOT_THRESHOLDS.filter(n => n <= accountSkillLevel(state)).length; return Math.min(5, Math.max(1, earned, threshold)); }
function recordAccountProgress(state) { const slots = unlockedCharacterSlots(state); return { ...state, account: { ...state.account, unlockedCharacterSlots: slots } }; }
function accountCharacters(state) { return [{ character: state.character }, ...(state.otherCharacters ?? [])].filter(entry => entry.character); }
function characterCreationError(state) { if (!state.character)
    return undefined; if (accountCharacters(state).length >= unlockedCharacterSlots(state))
    return `Requires ${exports.CHARACTER_SLOT_THRESHOLDS[accountCharacters(state).length] ?? 'another'} account skill levels to unlock a character slot.`; return undefined; }
function projectCharacter(state, id) {
    if (state.character?.id === id)
        return state;
    const index = (state.otherCharacters ?? []).findIndex(x => x.character.id === id);
    if (index < 0)
        throw new Error('Character is not owned.');
    const active = { character: structuredClone(state.character), inventory: structuredClone(state.inventory), overflow: structuredClone(state.overflow), activity: structuredClone(state.activity), skills: structuredClone(state.skills), quests: structuredClone(state.quests), currentRegionId: state.currentRegionId };
    const target = state.otherCharacters[index];
    const rest = state.otherCharacters.slice();
    rest[index] = active;
    return { ...state, character: target.character, inventory: target.inventory, overflow: target.overflow, activity: target.activity, skills: target.skills, quests: target.quests, currentRegionId: target.currentRegionId, otherCharacters: rest };
}
