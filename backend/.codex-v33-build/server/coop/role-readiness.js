"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveRole = deriveRole;
exports.evaluateRoleReadiness = evaluateRoleReadiness;
const CLASS_ROLES = Object.freeze({
    IRONWARDEN: 'tank', BASTION: 'tank', DREADGUARD: 'tank',
    DAWNKEEPER: 'support', STONECALLER: 'support',
    WAYFINDER: 'damage', RAVAGER: 'damage', HEXWEAVER: 'damage', KNIFE_DANCER: 'damage',
});
function deriveRole(classId) {
    const role = CLASS_ROLES[classId.trim().replace(/\s+/g, '_').toUpperCase()];
    if (!role)
        throw new Error(`unknown_class:${classId}`);
    return role;
}
function evaluateRoleReadiness(classId, normalizedScore, capabilities, floor = 0.8) {
    const role = deriveRole(classId);
    const available = new Set(capabilities);
    const failures = [];
    if (!Number.isFinite(normalizedScore) || normalizedScore < 0 || !Number.isFinite(floor) || floor <= 0 || normalizedScore < floor)
        failures.push('below_role_readiness_floor');
    if (role === 'tank' && (!available.has('threat') || !available.has('defense')))
        failures.push('missing_tank_capability');
    if (role === 'support' && !(available.has('restore') || (available.has('mitigate') && available.has('utility'))))
        failures.push('missing_support_capability');
    if (role === 'damage' && !available.has('damage'))
        failures.push('missing_damage_capability');
    return { ready: failures.length === 0, role, normalizedScore, failures };
}
