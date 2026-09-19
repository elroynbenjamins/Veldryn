"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companionMaterialName = companionMaterialName;
exports.companionMaterialSources = companionMaterialSources;
exports.companionRequirementProgress = companionRequirementProgress;
exports.companionRecoverySeconds = companionRecoverySeconds;
const combat_companions_1 = require("./combat-companions");
const monsters_1 = require("../content/monsters");
const skills_1 = require("../content/skills");
const items_1 = require("../content/items");
const class_skills_1 = require("./class-skills");
const monster_mastery_1 = require("./monster-mastery");
function companionMaterialName(id) { return items_1.ITEMS.find(item => item.id === id)?.name ?? id.toLowerCase().replace(/_/g, ' ').replace(/^./, s => s.toUpperCase()); }
function companionMaterialSources(id) {
    const sources = [...monsters_1.MONSTERS.filter(m => m.drops.some(d => d.itemId === id)).map(m => `Hunt ${m.name}`), ...skills_1.RECIPES.filter(r => r.output.itemId === id).map(r => `Craft ${r.name}`)];
    if (id === 'SUPPLIES')
        sources.push('Buy at the Sanctuary: 5 for 250 Gold');
    sources.push(...skills_1.GATHERING.filter(g => g.itemId === id).map(g => `Gather at ${g.name}`));
    if (id === 'TRIAL_SANCTUARY_MATERIAL')
        sources.push('First-clear Trial boss rewards');
    return sources.length ? sources : ['Companion assignment rewards or later-region content'];
}
function companionRequirementProgress(state, req) {
    const target = req.target ?? req.description, total = Math.max(1, req.amount ?? 1);
    let current = state.account.companionUnlockProgress?.[target] ?? 0;
    if (target === 'KNIFE_DANCER_SKILL_TOTAL' && state.character?.classId === 'KNIFE_DANCER')
        current = (0, class_skills_1.characterClassSkills)(state.character).reduce((sum, s) => sum + s.level, 0);
    if (req.type === 'monster_mastery' && monsters_1.MONSTERS.some(m => m.id === target))
        current = (0, monster_mastery_1.monsterMastery)(state, target).rank;
    if (req.type === 'quest')
        current = state.quests.some(q => q.questId === target && q.status === 'claimed') ? 1 : 0;
    if (req.type === 'skill_level')
        current = state.skills.find(s => s.skillId === target)?.level ?? 0;
    if (req.type === 'boss_kills')
        current = Math.max(state.defeatedBossIds.includes(target) ? 1 : 0, state.account.companionBossClears?.[target] ?? 0);
    if (target === 'SILVERBROOK_NODES') {
        const nodes = skills_1.GATHERING.filter(g => g.zoneId === 'SILVERBROOK');
        return { current: nodes.filter(g => state.account.companionUnlockProgress?.[`node:${g.id}`]).length, total: nodes.length, complete: (0, combat_companions_1.companionUnlockRequirementMet)(state, req) };
    }
    return { current: Math.min(total, current), total, complete: (0, combat_companions_1.companionUnlockRequirementMet)(state, req) };
}
function companionRecoverySeconds(state, now) { return Math.max(0, Math.ceil(((state.account.companionBattleReadyAtMs ?? 0) - now) / 1000)); }
