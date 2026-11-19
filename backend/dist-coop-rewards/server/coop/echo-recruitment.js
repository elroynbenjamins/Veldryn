"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recruitEligibleEchoes = recruitEligibleEchoes;
exports.recruitQModeAllies = recruitQModeAllies;
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
        && profile.snapshot.readiness.ready
        && (input.minimumCombatPower === undefined || (profile.snapshot.combatPower ?? -1) >= input.minimumCombatPower));
    const selected = [];
    const usedAccounts = new Set([input.controllerAccountId]);
    const usedCharacters = new Set();
    const usedDamageClasses = new Set(input.controllerRole === 'damage' ? [input.controllerClassId.trim().toUpperCase()] : []);
    for (const role of missingRoles(input.controllerRole)) {
        const candidates = (0, rng_1.deterministicShuffle)(input.serverSecret, eligible.filter(profile => profile.snapshot.readiness.role === role && !usedAccounts.has(profile.sourceAccountId) && !usedCharacters.has(profile.snapshot.characterId) && (role !== 'damage' || !usedDamageClasses.has(profile.snapshot.classId.trim().toUpperCase()))), 'echo-recruit-v2', input.requestId, input.contentVersion, role, selected.length);
        const chosen = candidates[0];
        if (!chosen)
            throw new Error(`echo_pool_unavailable:${role}`);
        selected.push(chosen);
        usedAccounts.add(chosen.sourceAccountId);
        usedCharacters.add(chosen.snapshot.characterId);
        if (role === 'damage')
            usedDamageClasses.add(chosen.snapshot.classId.trim().toUpperCase());
    }
    return Object.freeze(selected.map(profile => Object.freeze(structuredClone(profile))));
}
function recruitQModeAllies(input) {
    const eligible = input.profiles.filter(echo => echo.optedIn && echo.sourceAccountId !== input.controllerAccountId
        && echo.contentVersion === input.contentVersion && echo.publishedAtMs + config_1.COOP_ROGUELITE_CONFIG.echoFreshnessMs > input.nowMs
        && !echo.blockedAccountIds.includes(input.controllerAccountId) && echo.snapshot.readiness.ready
        && (input.minimumCombatPower === undefined || (echo.snapshot.combatPower ?? -1) >= input.minimumCombatPower));
    const team = [], accounts = new Set([input.controllerAccountId]), characters = new Set();
    const usedDamage = new Set(input.controllerRole === 'damage' ? [input.controllerClassId.trim().toUpperCase()] : []);
    for (const role of missingRoles(input.controllerRole)) {
        const legal = (snapshot) => snapshot.readiness.ready && snapshot.readiness.role === role
            && !accounts.has(snapshot.accountId) && !characters.has(snapshot.characterId)
            && (role !== 'damage' || !usedDamage.has(snapshot.classId.trim().toUpperCase()));
        const echo = (0, rng_1.deterministicShuffle)(input.serverSecret, eligible.filter(row => legal(row.snapshot)), 'echo-recruit-v2', input.requestId, input.contentVersion, role, team.length)[0];
        const npc = echo ? undefined : (0, rng_1.deterministicShuffle)(input.serverSecret, input.npcSnapshots.filter(legal), 'npc-recruit-v1', input.requestId, input.contentVersion, role, team.length)[0];
        if (!echo && !npc)
            throw new Error(`echo_pool_unavailable:${role}`);
        const member = echo ? { kind: 'echo', snapshot: echo.snapshot, echo } : { kind: 'npc', snapshot: npc };
        team.push(member);
        accounts.add(member.snapshot.accountId);
        characters.add(member.snapshot.characterId);
        if (role === 'damage')
            usedDamage.add(member.snapshot.classId.trim().toUpperCase());
    }
    return Object.freeze(team.map(row => Object.freeze(structuredClone(row))));
}
