"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPANION_TRIAL_STAGE_PAIR_HASTE_BONUS = exports.COMPANION_TRIAL_STAGE_GUARD_MULTIPLIER = exports.COMPANION_TRIAL_STAGE_OFFENSE_MULTIPLIER = exports.COMPANION_TRIAL_STAGE_MATCHUPS = void 0;
exports.companionTrialStageMatchup = companionTrialStageMatchup;
exports.companionTrialStageTeamMatchup = companionTrialStageTeamMatchup;
exports.COMPANION_TRIAL_STAGE_MATCHUPS = [
    { id: 'asterfall', attackAffinity: 'wild', guardAffinity: 'construct', threat: 'Armored guardians and ambushes', attackReason: 'Wild hunters exploit exposed weak points.', guardReason: 'Constructs withstand heavy opening hits.' },
    { id: 'sunscar', attackAffinity: 'primal', guardAffinity: 'arcane', threat: 'Glass armor and mirage magic', attackReason: 'Primal force fractures hardened glass.', guardReason: 'Arcane wards blunt mirage pressure.' },
    { id: 'frostmarch', attackAffinity: 'arcane', guardAffinity: 'radiant', threat: 'Interruptible bell casts and frost pressure', attackReason: 'Arcane precision disrupts bell-channeling foes.', guardReason: 'Radiant protection sustains the formation.' },
    { id: 'ashlands', attackAffinity: 'construct', guardAffinity: 'primal', threat: 'Armored forge enemies and crushing blows', attackReason: 'Construct weaponry breaks through forgeplate.', guardReason: 'Primal endurance steadies the front line.' },
    { id: 'rift', attackAffinity: 'umbral', guardAffinity: 'construct', threat: 'Rift bursts and shifting weaknesses', attackReason: 'Umbral attacks exploit unstable rift gaps.', guardReason: 'Construct anchors resist disruptive surges.' },
    { id: 'apex', attackAffinity: 'radiant', guardAffinity: 'umbral', threat: 'Regent phases and high-pressure abilities', attackReason: 'Radiant offense counters the echo crown.', guardReason: 'Umbral wards absorb reflected pressure.' },
];
exports.COMPANION_TRIAL_STAGE_OFFENSE_MULTIPLIER = 1.065;
exports.COMPANION_TRIAL_STAGE_GUARD_MULTIPLIER = 1.06;
exports.COMPANION_TRIAL_STAGE_PAIR_HASTE_BONUS = .02;
function companionTrialStageMatchup(floor) {
    const safe = Number.isFinite(floor) ? Math.floor(floor) : 1;
    return exports.COMPANION_TRIAL_STAGE_MATCHUPS[Math.max(0, Math.min(5, Math.floor((Math.max(1, safe) - 1) / 5)))];
}
function companionTrialStageTeamMatchup(floor, affinities) {
    const matchup = companionTrialStageMatchup(floor), set = new Set(affinities);
    const offense = set.has(matchup.attackAffinity), guard = set.has(matchup.guardAffinity);
    return { matchup, offense, guard, pair: offense && guard };
}
