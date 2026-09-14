"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companionBalancedBaseStats = companionBalancedBaseStats;
exports.companionInvestmentMultiplier = companionInvestmentMultiplier;
exports.buildCompanionCombatant = buildCompanionCombatant;
exports.buildOwnedCompanionCombatant = buildOwnedCompanionCombatant;
exports.companionAbilityTargetHint = companionAbilityTargetHint;
const content_1 = require("./content");
const COMMON_MAX_INVESTMENT_MULTIPLIER = 1.50;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const ROLE_ANCHORS = {
    damage: { hp: 180, power: 22, defense: 12, attackSpeed: 2.0 },
    tank: { hp: 260, power: 14, defense: 24, attackSpeed: 2.6 },
    support: { hp: 150, power: 12, defense: 10, attackSpeed: 2.2 },
};
/**
 * Legacy Combat Unit content already encoded rarity through raw stats. The expanded
 * Companion system also encodes rarity through level ceiling/scaling, so raw stat
 * variance is compressed around a role anchor before progression is applied.
 * This preserves identity (fast/slow, sturdy/frail) without double-dipping rarity.
 */
function companionBalancedBaseStats(def) {
    const a = ROLE_ANCHORS[def.role], b = def.baseStats;
    return {
        hp: a.hp * clamp(b.hp / a.hp, .95, 1.05),
        power: a.power * clamp(b.power / a.power, .95, 1.05),
        defense: a.defense * clamp(b.defense / a.defense, .95, 1.05),
        attackSpeed: a.attackSpeed * clamp(b.attackSpeed / a.attackSpeed, .90, 1.10),
    };
}
/** Level scaling carries the systematic rarity advantage. */
function companionInvestmentMultiplier(def, progress) {
    const max = content_1.COMPANION_RARITY_MAX_LEVEL[def.rarity];
    const endpoint = COMMON_MAX_INVESTMENT_MULTIPLIER * content_1.COMPANION_RARITY_TARGET[def.rarity];
    const fraction = max <= 1 ? 1 : clamp((progress.level - 1) / (max - 1), 0, 1);
    return 1 + (endpoint - 1) * fraction;
}
function techniqueEffects(progress) { const t = progress.selectedTechniqueId ? (0, content_1.companionTechnique)(progress.selectedTechniqueId) : undefined; return t?.companionId === progress.companionId ? t.effects : []; }
function effectValue(progress, kind) { return techniqueEffects(progress).filter(x => x.kind === kind).reduce((sum, x) => sum + x.value, 0); }
function resolvedTarget(def, ctx) {
    const wanted = ctx.mode === 'character_assist' ? def.active.targeting.assistTarget : def.active.targeting.standaloneTarget;
    if (wanted === 'owner')
        return { target: 'lowest_hp_ally', exactTargetId: ctx.ownerId };
    return { target: wanted };
}
function balancedActiveCoeff(def, progress) {
    const raw = def.active.baseCoeff + def.active.perLevelCoeff * Math.max(0, progress.level - 1);
    // Large legacy damage-coefficient jumps used to be part of rarity. Compress them
    // so abilities keep identity while the new rarity budget remains the main tier edge.
    return def.active.effectKind === 'damage' ? 1 + (raw - 1) * .25 : raw;
}
function engineEffects(def, progress, context) {
    const levelCoeff = balancedActiveCoeff(def, progress), tDamage = effectValue(progress, 'damage'), tHeal = effectValue(progress, 'heal_strength'), tShield = effectValue(progress, 'shield_strength');
    switch (def.active.effectKind) {
        case 'damage': return [{ kind: 'damage', coeff: Math.max(.05, levelCoeff * (1 + tDamage)), tag: 'companion_active' }];
        case 'shield': return [{ kind: 'shield', coeff: Math.max(.01, levelCoeff * (1 + tShield)), tag: 'companion_active' }];
        case 'heal': return [{ kind: 'heal', coeff: Math.max(.02, levelCoeff * (1 + tHeal)), tag: 'companion_active' }];
        case 'interrupt': return context.mode === 'character_assist' ? [{ kind: 'interrupt', coeff: Math.max(.05, levelCoeff), tag: 'companion_active' }] : [{ kind: 'damage', coeff: Math.max(.50, levelCoeff * .9), tag: 'companion_active' }, { kind: 'interrupt', coeff: 1, tag: 'companion_interrupt' }];
        case 'mitigation': return [{ kind: 'buff', value: -Math.max(.01, levelCoeff), durationMs: 5000, tag: 'damage_taken' }];
        case 'utility':
        default:
            if (def.role === 'support' && context.mode !== 'character_assist')
                return [{ kind: 'heal', coeff: clamp(levelCoeff * .18, .035, .08) * (1 + tHeal), tag: 'companion_utility' }];
            return def.role === 'support' ? [{ kind: 'buff', value: Math.max(.01, levelCoeff), durationMs: 5000, tag: 'companion_utility' }] : [{ kind: 'damage', coeff: Math.max(.05, levelCoeff), tag: 'companion_active' }];
    }
}
function buildCompanionCombatant(def, progress, context) {
    if (progress.companionId !== def.id)
        throw new Error('companion_progress_definition_mismatch');
    const base = companionBalancedBaseStats(def), scale = companionInvestmentMultiplier(def, progress), synergy = clamp(context.teamSynergyMultiplier ?? 1, 1, 1.06), hasteBonus = clamp(context.teamHasteBonus ?? 0, 0, .06), cooldownChange = effectValue(progress, 'cooldown'), target = resolvedTarget(def, context);
    const bond = progress.bondTraitUnlocked ? 1.03 : 1, ascension = 1 + progress.ascensionTier * .006, derived = scale * synergy * bond * ascension;
    const maxHp = Math.round(base.hp * derived), attackPower = Number((base.power * derived).toFixed(2));
    // Standalone Tank/Support coefficients represent percentages/utility in source
    // content. Calibrate healingPower to companion-scale HP so shields/heals matter in
    // companion-only combat without inflating character-assist output.
    const standalone = context.mode !== 'character_assist';
    const healingPower = standalone ? (def.role === 'support' ? maxHp * 2.5 : def.role === 'tank' ? maxHp * 2 : attackPower * .35) : base.power * (def.role === 'support' ? .9 : .35) * derived;
    const ability = { id: def.active.id, name: def.active.name, cooldownMs: Math.max(3000, Math.round(def.active.cooldownMs * (1 + cooldownChange))), castTimeMs: 0, target: target.target, exactTargetId: target.exactTargetId, effects: engineEffects(def, progress, context), priority: def.role === 'support' ? 85 : def.role === 'tank' ? 80 : 70, aiCondition: def.role === 'support' ? 'ally_below_50' : 'always', tags: ['combat_companion', def.role, context.mode, ...techniqueEffects(progress).map(x => `technique:${x.kind}:${x.value}`)] };
    return { id: def.id, name: def.name, team: 'players', role: def.role, level: progress.level, stats: { maxHp, attackPower, healingPower: Number(healingPower.toFixed(2)), defense: Number((base.defense * derived).toFixed(2)), accuracy: Math.min(.98, .84 + progress.level * .002), evasion: Math.min(.22, .04 + (def.role === 'damage' ? .03 : 0)), critChance: def.role === 'damage' ? .10 : .05, critMultiplier: 1.5, haste: Math.min(.45, .04 + hasteBonus + Math.max(0, 2.5 - base.attackSpeed) * .03) }, basicAttackMs: Math.max(850, Math.round(base.attackSpeed * 1000)), basicAttackCoeff: def.role === 'damage' ? .72 : def.role === 'tank' ? .46 : .40, abilities: [ability], tags: ['combat_companion', def.rarity, def.originId, context.mode] };
}
function buildOwnedCompanionCombatant(progress, context) { const def = (0, content_1.companionServerDefinition)(progress.companionId); if (!def)
    throw new Error('unknown_companion'); return buildCompanionCombatant(def, progress, context); }
function companionAbilityTargetHint(combatant) { return combatant.abilities[0]?.exactTargetId; }
