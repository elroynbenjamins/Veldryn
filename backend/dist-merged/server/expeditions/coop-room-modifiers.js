"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCoopRoomModifier = exports.COOP_ROOM_MODIFIERS = void 0;
exports.applyCoopRoomModifier = applyCoopRoomModifier;
const pve_encounter_identity_1 = require("../combat/pve-encounter-identity");
/**
 * Server-owned room modifiers. The route generator selects an ID; it never
 * accepts these values from a client. All effects enter the deterministic
 * combat simulation and therefore affect real health, damage and replays.
 *
 * Optional elite rooms receive unique mechanics and small stat adjustments.
 * Mandatory normal fights retain their original balance and instead vary by
 * different enemy combinations. Existing saved normal routes fail safely.
 * Q-Mode and Live use the same rules, and reward budgets stay unchanged.
 */
exports.COOP_ROOM_MODIFIERS = {
    steady: { name: 'Steady', description: 'Standard encounter. No extra effects.' },
    thorned: { name: 'Thorned', description: 'Enemies spread damaging thorns over time.' },
    volatile: { name: 'Volatile', description: 'More aggressive enemies with lower health and an interruptible blast.' },
    warded: { name: 'Warded', description: 'Enemies have stronger defenses and can raise a barrier.' },
    swift: { name: 'Swift', description: 'Enemies attack more quickly but have slightly less health.' },
    attrition: { name: 'Attrition', description: 'Enemies endure longer and can reduce incoming healing.' },
};
const isCoopRoomModifier = (value) => Object.prototype.hasOwnProperty.call(exports.COOP_ROOM_MODIFIERS, value);
exports.isCoopRoomModifier = isCoopRoomModifier;
function applyCoopRoomModifier(enemy, id, index, eliteAbilities = false) {
    if (!eliteAbilities || !id || !(0, exports.isCoopRoomModifier)(id) || id === 'steady')
        return enemy;
    const stats = { ...enemy.stats };
    let basicAttackMs = enemy.basicAttackMs;
    const abilities = [...enemy.abilities];
    // Only one extra encounter ability per room. The first enemy carries
    // the modifier mechanic so mixed groups remain readable and balanced.
    switch (id) {
        case 'thorned':
            stats.maxHp *= 1.006;
            if (index === 0 && eliteAbilities) {
                const thorns = (0, pve_encounter_identity_1.pveDotWave)(`${enemy.id}_ROOM_THORNS`, 'Thorn Barrage', 'nature', .08, 19500);
                abilities.push({ ...thorns, effects: thorns.effects.map(effect => effect.kind === 'dot' ? { ...effect, coeff: .008 } : effect) });
            }
            break;
        case 'volatile':
            stats.maxHp *= .985;
            stats.attackPower *= 1.012;
            if (index === 0 && eliteAbilities)
                abilities.push((0, pve_encounter_identity_1.pveInterruptibleWave)(`${enemy.id}_ROOM_BLAST`, 'Unstable Surge', 'arcane', .08, 19000, 1300));
            break;
        case 'warded':
            stats.defense *= 1.018;
            if (index === 0 && eliteAbilities)
                abilities.push((0, pve_encounter_identity_1.pveBarrier)(`${enemy.id}_ROOM_WARD`, 'Defensive Ward', Math.round(stats.maxHp * .013), 21000));
            break;
        case 'swift':
            stats.maxHp *= .996;
            stats.haste = Math.min(.5, stats.haste + .012);
            basicAttackMs = Math.max(1400, Math.round(basicAttackMs * .98));
            break;
        case 'attrition':
            stats.maxHp *= 1.009;
            if (index === 0 && eliteAbilities) {
                const wither = (0, pve_encounter_identity_1.pveHealingPressure)(`${enemy.id}_ROOM_WITHER`, 'Withering Pressure', 'shadow', .065, 21000);
                abilities.push({ ...wither, effects: wither.effects.map(effect => effect.kind === 'debuff' ? { ...effect, value: -.06 } : effect) });
            }
            break;
    }
    return { ...enemy, stats, basicAttackMs, abilities };
}
