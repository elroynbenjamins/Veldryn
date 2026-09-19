"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recruitEligibleEchoes = recruitEligibleEchoes;
const rng_1 = require("../expeditions/rng");
const config_1 = require("./config");
function missingRoles(controllerRole) {
    const roles = ['tank', 'damage', 'damage', 'support'];
    const index = roles.indexOf(controllerRole);
    if (index < 0)
        throw new Error('invalid_controller_role');
    roles.splice(index, 1);
    return roles;
}
function recruitEligibleEchoes(input) {
    const eligible = input.profiles.filter(profile => profile.optedIn
        && profile.sourceAccountId !== input.controllerAccountId
        && profile.contentVersion === input.contentVersion
        && profile.publishedAtMs + config_1.COOP_ROGUELITE_CONFIG.echoFreshnessMs > input.nowMs
        && !profile.blockedAccountIds.includes(input.controllerAccountId)
        && profile.snapshot.readiness.ready);
    const selected = [];
    const usedAccounts = new Set([input.controllerAccountId]);
    const usedCharacters = new Set();
    for (const role of missingRoles(input.controllerRole)) {
        const candidates = (0, rng_1.deterministicShuffle)(input.serverSecret, eligible.filter(profile => profile.snapshot.readiness.role === role && !usedAccounts.has(profile.sourceAccountId) && !usedCharacters.has(profile.snapshot.characterId)), 'echo-recruit-v1', input.requestId, input.contentVersion, role, selected.length);
        const chosen = candidates[0];
        if (!chosen)
            throw new Error(`echo_pool_unavailable:${role}`);
        selected.push(chosen);
        usedAccounts.add(chosen.sourceAccountId);
        usedCharacters.add(chosen.snapshot.characterId);
    }
    return Object.freeze(selected.map(profile => Object.freeze(structuredClone(profile))));
}
