"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateSquadSynergies = evaluateSquadSynergies;
exports.totalSynergyMultiplier = totalSynergyMultiplier;
exports.incomingDamageMultiplier = incomingDamageMultiplier;
function evaluateSquadSynergies(m) {
    if (m.length !== 3)
        throw new Error('requires_3');
    const out = [];
    const roles = m.map(x => x.role);
    if (new Set(m.map(x => x.classId)).size === 3)
        out.push({ key: 'diverse_training', multiplier: 1.02, description: 'Three different classes' });
    if (roles.includes('tank') && roles.includes('damage') && roles.includes('support'))
        out.push({ key: 'balanced_triad', multiplier: 1.035, description: 'Tank + Damage + Support' });
    if (roles.filter(x => x === 'damage').length === 3)
        out.push({ key: 'glass_spear', multiplier: 1.04, description: 'Higher offense, handled separately with +8% incoming damage' });
    const front = m.find(x => x.position === 'front');
    if (front?.role === 'tank')
        out.push({ key: 'anchored_front', multiplier: 1.025, description: 'Tank protects formation from front' });
    const back = m.find(x => x.position === 'back');
    if (back?.role === 'support')
        out.push({ key: 'protected_support', multiplier: 1.02, description: 'Support gains safer backline positioning' });
    return out;
}
function totalSynergyMultiplier(s) { return Math.min(1.08, s.reduce((x, v) => x * v.multiplier, 1)); }
function incomingDamageMultiplier(m) { return m.every(x => x.role === 'damage') ? 1.08 : 1; }
