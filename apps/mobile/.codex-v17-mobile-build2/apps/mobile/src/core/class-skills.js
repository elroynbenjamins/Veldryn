"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.characterClassSkills = exports.normalizeTrainingFocus = exports.MAX_CLASS_SKILL_XP = void 0;
exports.normalizeClassSkills = normalizeClassSkills;
exports.awardCombatClassXp = awardCombatClassXp;
exports.normalizeClassDrills = normalizeClassDrills;
exports.awardClassSkillXp = awardClassSkillXp;
exports.characterClassEffects = characterClassEffects;
exports.settleClassDrills = settleClassDrills;
const class_skills_1 = require("../content/class-skills");
const progression_1 = require("./progression");
exports.MAX_CLASS_SKILL_XP = (0, progression_1.totalXpAtLevel)(100);
const normalizeTrainingFocus = (v) => v === 'primary' || v === 'secondary' ? v : 'balanced';
exports.normalizeTrainingFocus = normalizeTrainingFocus;
function normalizeClassSkills(id, raw) {
    const rows = Array.isArray(raw) ? raw : [];
    return (0, class_skills_1.classSkillsFor)(id).map(d => { const entry = rows.find(r => r?.skillId === d.id); const xp = typeof entry?.xp === 'number' && Number.isFinite(entry.xp) ? Math.max(0, Math.min(exports.MAX_CLASS_SKILL_XP, Math.floor(entry.xp))) : 0; return { skillId: d.id, xp, level: (0, progression_1.levelFromXp)(xp) }; });
}
const characterClassSkills = (c) => normalizeClassSkills(c.classId, c.classSkills);
exports.characterClassSkills = characterClassSkills;
function awardCombatClassXp(c, kills, perKill, firstFocus) {
    if (kills <= 0)
        return { character: c, awards: (0, exports.characterClassSkills)(c).map(s => ({ skillId: s.skillId, xp: 0 })) };
    const first = awardClassSkillXp(c, kills > 0 ? perKill : 0, firstFocus ?? (0, exports.normalizeTrainingFocus)(c.trainingFocus));
    const rest = awardClassSkillXp(first.character, Math.max(0, kills - 1) * perKill);
    return { character: rest.character, awards: rest.awards.map((a, i) => ({ ...a, xp: a.xp + first.awards[i].xp })) };
}
function normalizeClassDrills(raw) {
    if (!raw || !Number.isSafeInteger(raw.lastClaimAtMs) || raw.lastClaimAtMs < 0)
        return undefined;
    return { lastClaimAtMs: raw.lastClaimAtMs, progressMs: Math.min(59999, Math.max(0, Math.floor(Number(raw.progressMs) || 0))), focus: (0, exports.normalizeTrainingFocus)(raw.focus), xpPerDrill: Math.max(8, Math.min(80, Number(raw.xpPerDrill) || 8)) };
}
function awardClassSkillXp(c, pool, focus = (0, exports.normalizeTrainingFocus)(c.trainingFocus)) {
    const shares = focus === 'primary' ? [.75, .25] : focus === 'secondary' ? [.25, .75] : [.5, .5], remainders = { ...(c.classSkillRemainders ?? {}) };
    const awards = [];
    const classSkills = (0, exports.characterClassSkills)(c).map((s, i) => { const prior = Number.isFinite(remainders[s.skillId]) ? Math.max(0, Math.min(.999999, remainders[s.skillId])) : 0; const amount = Math.max(0, pool) * shares[i] + prior; const whole = Math.floor(amount + 1e-9), gain = Math.min(exports.MAX_CLASS_SKILL_XP - s.xp, whole); remainders[s.skillId] = s.xp + gain >= exports.MAX_CLASS_SKILL_XP ? 0 : Math.max(0, amount - whole); awards.push({ skillId: s.skillId, xp: gain }); return { ...s, xp: s.xp + gain, level: (0, progression_1.levelFromXp)(s.xp + gain) }; });
    return { character: { ...c, classSkills, classSkillRemainders: remainders }, awards };
}
/** Conservative runtime interpretation: at most 10% offense and 12% resilience. */
function characterClassEffects(c) {
    const [a, b] = (0, exports.characterClassSkills)(c).map(s => (s.level - 1) / 99);
    const tank = ['IRONWARDEN', 'BASTION', 'DREADGUARD'].includes(c.classId), support = ['DAWNKEEPER', 'STONECALLER'].includes(c.classId);
    return tank ? { attack: 1, hp: 1 + .12 * a, defense: 1 + .10 * b } : support ? { attack: 1 + .10 * a, hp: 1 + .10 * b, defense: 1 } : { attack: 1 + .07 * a + .03 * b, hp: 1, defense: 1 + .06 * b };
}
function settleClassDrills(state, now, capSeconds) {
    const c = state.character, drill = c?.classTraining;
    const empty = { xp: 0, gold: 0, kills: 0, items: [], elapsedSeconds: 0 };
    if (!c || !drill || now <= drill.lastClaimAtMs)
        return { state, reward: empty };
    const elapsed = Math.min(capSeconds * 1000, now - drill.lastClaimAtMs), total = elapsed + drill.progressMs, actions = Math.floor(total / 60000);
    let character = c;
    const awards = {};
    const apply = (count, focus) => { if (!count)
        return; const earned = awardClassSkillXp(character, drill.xpPerDrill * count, focus); character = earned.character; for (const a of earned.awards)
        awards[a.skillId] = (awards[a.skillId] ?? 0) + a.xp; };
    const focus = (0, exports.normalizeTrainingFocus)(c.trainingFocus);
    let completed = (0, exports.characterClassSkills)(c).every(s => s.level === 100) ? 0 : Math.min(1, actions);
    apply(completed, drill.focus);
    const shares = focus === 'primary' ? [.75, .25] : focus === 'secondary' ? [.25, .75] : [.5, .5];
    const remainingToCap = Math.max(...(0, exports.characterClassSkills)(character).map((s, i) => Math.max(0, Math.ceil((exports.MAX_CLASS_SKILL_XP - s.xp - (character.classSkillRemainders?.[s.skillId] ?? 0)) / (drill.xpPerDrill * shares[i])))));
    const rest = Math.min(Math.max(0, actions - completed), remainingToCap);
    apply(rest, focus);
    completed += rest;
    const capped = (0, exports.characterClassSkills)(character).every(s => s.level === 100);
    character = { ...character, classTraining: capped ? undefined : { ...drill, lastClaimAtMs: now, progressMs: total % 60000, focus: actions ? (0, exports.normalizeTrainingFocus)(c.trainingFocus) : drill.focus } };
    return { state: { ...state, character }, reward: { ...empty, elapsedSeconds: Math.floor(elapsed / 1000), trainingActions: completed, classSkillXp: Object.entries(awards).map(([skillId, xp]) => ({ skillId, xp })) } };
}
