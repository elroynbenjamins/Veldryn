"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRegionalGameplayV21 = validateRegionalGameplayV21;
function validateRegionalGameplayV21(input) {
    const errors = [];
    const allIds = [...input.sideQuests, ...input.activities, ...input.achievements, ...input.collectionBooks, ...input.weatherRules, ...input.contracts, ...input.bossMasteries].map(v => v.id);
    if (new Set(allIds).size !== allIds.length)
        errors.push('duplicate_gameplay_id');
    for (const a of input.activities) {
        if (a.expectedMinutes < 2 || a.expectedMinutes > 45)
            errors.push(`${a.id}:expected_minutes_out_of_range`);
        if (a.level < 1)
            errors.push(`${a.id}:level_invalid`);
    }
    for (const c of input.contracts) {
        if (c.targetStandardizedMinutes < 30 || c.targetStandardizedMinutes > 180)
            errors.push(`${c.id}:contract_effort_out_of_range`);
        if (c.exactQuestDependency !== false)
            errors.push(`${c.id}:contract_must_not_depend_on_exact_quest`);
    }
    for (const w of input.weatherRules) {
        if (!w.safetyRule.includes('No mandatory'))
            errors.push(`${w.id}:weather_safety_rule_missing`);
    }
    for (const b of input.bossMasteries) {
        if (b.powerReward !== false)
            errors.push(`${b.id}:boss_mastery_must_be_prestige_or_sidegrade`);
    }
    return errors;
}
