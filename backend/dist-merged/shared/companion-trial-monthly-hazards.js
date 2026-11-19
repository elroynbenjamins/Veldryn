"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPANION_TRIAL_MONTHLY_HAZARDS = void 0;
exports.companionTrialMonthlyHazard = companionTrialMonthlyHazard;
exports.COMPANION_TRIAL_MONTHLY_HAZARDS = [
    { id: 'venom_bloom', name: 'Venom Bloom', threat: 'Poison ticks damage HP directly through shields.', counter: 'Bring a cleanser such as Dawnwing, sustain with healing, or interrupt poison casts with Lantern Wisp.' },
    { id: 'shatterstorm', name: 'Shatterstorm', threat: 'Enemy impact pressure weakens shields.', counter: 'Prioritize sturdy Tanks, defense and direct healing rather than relying only on shields.' },
    { id: 'ritual_surge', name: 'Ritual Surge', threat: 'Enemies channel an interruptible area attack.', counter: 'An interrupt-focused companion such as Lantern Wisp can stop the cast; resilient formations can also survive it.' },
];
function companionTrialMonthlyHazard(seasonKey) {
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(seasonKey);
    if (!match)
        throw new Error('invalid_companion_trial_season_key');
    const monthIndex = Number(match[1]) * 12 + Number(match[2]) - 1;
    // 2026-10 starts on Venom Bloom, then rotates every UTC month.
    const october2026 = 2026 * 12 + 9;
    const index = ((monthIndex - october2026) % exports.COMPANION_TRIAL_MONTHLY_HAZARDS.length + exports.COMPANION_TRIAL_MONTHLY_HAZARDS.length) % exports.COMPANION_TRIAL_MONTHLY_HAZARDS.length;
    return exports.COMPANION_TRIAL_MONTHLY_HAZARDS[index];
}
