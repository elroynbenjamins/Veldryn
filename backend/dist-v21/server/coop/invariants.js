"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleCounts = roleCounts;
exports.hasExactCoopRoles = hasExactCoopRoles;
exports.validateCoopRoster = validateCoopRoster;
exports.validatePreBossNodeCount = validatePreBossNodeCount;
const coop_types_1 = require("../../shared/coop-types");
const config_1 = require("./config");
function roleCounts(roles) {
    const counts = { tank: 0, damage: 0, support: 0 };
    for (const role of roles)
        counts[role] += 1;
    return counts;
}
function hasExactCoopRoles(roles) {
    if (roles.length !== 4)
        return false;
    const counts = roleCounts(roles);
    return Object.keys(coop_types_1.COOP_ROLE_REQUIREMENT)
        .every(role => counts[role] === coop_types_1.COOP_ROLE_REQUIREMENT[role]);
}
function validateCoopRoster(members) {
    if (members.length !== 4)
        throw new Error('coop_requires_four_members');
    if (new Set(members.map(member => member.accountId)).size !== 4)
        throw new Error('duplicate_coop_account');
    if (new Set(members.map(member => member.characterId)).size !== 4)
        throw new Error('duplicate_coop_character');
    if (!hasExactCoopRoles(members.map(member => member.role)))
        throw new Error('invalid_coop_role_composition');
}
function validatePreBossNodeCount(count) {
    if (!Number.isInteger(count)
        || count < config_1.COOP_ROGUELITE_CONFIG.preBossNodeMin
        || count > config_1.COOP_ROGUELITE_CONFIG.preBossNodeMax) {
        throw new Error('invalid_coop_route_length');
    }
}
