"use strict";
/**
 * Veldryn Combat 2.0 — isolated, non-live stat and action-scaling contract.
 *
 * No production combat module imports this prototype. It must not be used to
 * translate a client-submitted snapshot or silently migrate saved equipment.
 * Coefficients and final damage caps require the coordinated 2.0 balance pass.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMBAT_2_BUILD_POWER_SHARE_TARGETS = void 0;
exports.validateCombatActionV2 = validateCombatActionV2;
exports.validateCombatPowerStatsV2 = validateCombatPowerStatsV2;
exports.projectCombatActionPowerV2 = projectCombatActionPowerV2;
exports.summarizeBuildContributionV2 = summarizeBuildContributionV2;
/** A class skill cannot scale with both weapon and skill budgets.
 * A weapon technique can receive an Ability Damage bonus but does not
 * secretly also take the Skill Power contribution. */
function validateCombatActionV2(input) {
    if (!input || typeof input !== 'object')
        return ['missing_action'];
    const action = input;
    const errors = [];
    if (typeof action.coefficient !== 'number' || !Number.isFinite(action.coefficient)
        || action.coefficient < 0 || action.coefficient > 100)
        errors.push('invalid_action_coefficient');
    if (action.kind === 'basic_weapon') {
        if (action.powerSource !== 'weapon' || action.purpose !== 'damage')
            errors.push('invalid_basic_weapon_tag');
    }
    else if (action.kind === 'weapon_technique') {
        if (action.powerSource !== 'weapon' || action.purpose !== 'damage')
            errors.push('invalid_weapon_technique_tag');
    }
    else if (action.kind === 'class_skill') {
        if (action.powerSource !== 'skill')
            errors.push('invalid_class_skill_tag');
    }
    else
        errors.push('invalid_action_kind');
    if (!['damage', 'heal', 'shield'].includes(action.purpose))
        errors.push('invalid_action_purpose');
    return errors;
}
/** Defensive parsing boundary for server-verified snapshots; the server must
 * independently verify inventory ownership, equipped instance and class data.
 * Not an authority check for client-provided stats. */
function validateCombatPowerStatsV2(input) {
    const errors = [];
    if (!input || typeof input !== 'object')
        return ['missing_stats'];
    const data = input;
    for (const key of ['weaponPower', 'skillPower', 'abilityDamage', 'healingPower', 'potency']) {
        const value = data[key];
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
            errors.push('invalid_' + key);
            continue;
        }
        // Broad anti-corruption bounds, NOT the final combat balance soft caps.
        if (value > (key === 'weaponPower' || key === 'skillPower' ? 1_000_000_000 : 10))
            errors.push('unbounded_' + key);
    }
    return errors;
}
/** Isolated reference projection before crit, armor, wards, resistance,
 * vulnerability, class traits, boss modifiers and final mitigation.
 * Never substitute this function for the current authoritative combat engine.
 *
 * - Basic attacks receive no Ability Damage.
 * - Damaging weapon techniques and class skills receive Ability Damage.
 * - Restorative class skills receive Healing Power.
 * - Shields are Skill Power based but do not silently inherit Healing Power.
 * - Food, consumables and companions are not eligible action kinds here.
 */
function projectCombatActionPowerV2(stats, action) {
    const issues = [...validateCombatPowerStatsV2(stats), ...validateCombatActionV2(action)];
    if (issues.length)
        throw new Error('invalid_combat_v2_projection:' + issues.join(','));
    const basePower = action.powerSource === 'weapon' ? stats.weaponPower : stats.skillPower;
    const baseOutput = basePower * action.coefficient;
    const bonusMultiplier = action.purpose === 'heal'
        ? 1 + stats.healingPower
        : action.purpose === 'damage' && action.kind !== 'basic_weapon'
            ? 1 + stats.abilityDamage
            : 1;
    return { powerSource: action.powerSource, basePower, coefficient: action.coefficient,
        baseOutput, bonusMultiplier, powerAfterBonuses: baseOutput * bonusMultiplier };
}
/** Accepted whole-build balance target for simulation only.
 * These are budget shares, not an additive multiplier and not a runtime CP formula. */
exports.COMBAT_2_BUILD_POWER_SHARE_TARGETS = {
    classAndLevel: .17,
    equipmentBase: .45,
    rarityAndQuality: .14,
    affixesUpgradesGemsSets: .14,
    companionsAndOther: .10,
};
function summarizeBuildContributionV2(contributions) {
    const keys = Object.keys(exports.COMBAT_2_BUILD_POWER_SHARE_TARGETS);
    if (keys.some(key => !Number.isFinite(contributions[key]) || contributions[key] < 0))
        throw new Error('invalid_build_contribution');
    const total = keys.reduce((sum, key) => sum + contributions[key], 0);
    if (total <= 0)
        throw new Error('empty_build_contribution');
    const shares = {};
    for (const key of keys)
        shares[key] = contributions[key] / total;
    return { total, shares };
}
