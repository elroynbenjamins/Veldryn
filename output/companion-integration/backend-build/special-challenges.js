"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.companionSpecialChallenge = void 0;
exports.validateSpecialCompanionChallenge = validateSpecialCompanionChallenge;
exports.resolveSpecialCompanionChallenge = resolveSpecialCompanionChallenge;
const content_1 = require("./content");
const combat_adapter_1 = require("./combat-adapter");
const progression_v2_1 = require("./progression-v2");
const team_1 = require("./team");
const companionSpecialChallenge = (id) => content_1.COMPANION_SPECIAL_CHALLENGES.find(x => x.id === id);
exports.companionSpecialChallenge = companionSpecialChallenge;
function boss(id, power) { const scale = Math.max(.85, Math.min(1.15, power / 4300)); return { id, name: id.replace(/_/g, ' '), team: 'enemies', role: 'enemy', level: 35, stats: { maxHp: Math.round(1100 * scale), attackPower: Number((65 * scale).toFixed(2)), healingPower: 0, defense: Number((50 * scale).toFixed(2)), accuracy: .91, evasion: .05, critChance: .07, critMultiplier: 1.55, haste: .12 }, basicAttackMs: 2200, basicAttackCoeff: .76, abilities: [{ id: `${id}_SIGNATURE`, name: 'Companion Challenge Signature', cooldownMs: 13000, castTimeMs: 0, target: 'current_target', effects: [{ kind: 'damage', coeff: 1.20, tag: 'companion_special_boss' }], priority: 90, aiCondition: 'always' }], boss: true, tags: ['companion_special_boss'] }; }
function validateSpecialCompanionChallenge(input) { const c = (0, exports.companionSpecialChallenge)(input.challengeId); if (!c)
    return { ok: false, reason: 'unknown_companion_special_challenge' }; if (!(0, progression_v2_1.companionUnlockRequirementsSatisfied)(c.requirements, input.facts))
    return { ok: false, reason: 'companion_special_requirements_not_met' }; const team = (0, team_1.validateCompanionTrialTeam)({ companionIds: input.teamIds, owned: input.owned, busyCompanionIds: input.busyCompanionIds }); if (!team.ok)
    return team; if (team.power < c.recommendedTeamPower * .7)
    return { ok: false, reason: 'companion_special_team_power_too_low' }; return { ok: true, challenge: c, team }; }
function resolveSpecialCompanionChallenge(input, executor) { const checked = validateSpecialCompanionChallenge(input); if (!checked.ok)
    throw new Error(checked.reason); const synergy = checked.team.synergies, mult = (0, team_1.totalCompanionSynergyMultiplier)(synergy), haste = (0, team_1.totalCompanionHasteBonus)(synergy); const players = input.teamIds.map(id => (0, combat_adapter_1.buildOwnedCompanionCombatant)(input.owned[id], { mode: 'companion_trial', teamSynergyMultiplier: mult, teamHasteBonus: haste })); const result = executor.simulate({ seed: input.seed, players, enemies: [boss(checked.challenge.bossId, checked.challenge.recommendedTeamPower)], mitigationConstant: content_1.COMPANION_TRIAL_MITIGATION_CONSTANT }); if (!result.victory)
    return { result, unlockedCompanionId: undefined }; const target = (0, content_1.companionServerDefinition)(checked.challenge.rewardCompanionId); return { result, unlockedCompanionId: target?.id, completionKey: checked.challenge.id }; }
