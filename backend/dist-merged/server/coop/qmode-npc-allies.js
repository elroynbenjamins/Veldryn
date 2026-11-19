"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createQModeNpcAllies = createQModeNpcAllies;
const launch_combat_1 = require("../combat/content/launch-combat");
const loadout_snapshots_1 = require("./loadout-snapshots");
const normalization_1 = require("./normalization");
const role_readiness_1 = require("./role-readiness");
/** Server-owned NPCs fill only vacant Q-Mode seats. No player account or Echo profile is created. */
const CLASSES = [
    { id: 'IRONWARDEN', className: 'Ironwarden', name: 'NPC · Iron Sentinel' },
    { id: 'BASTION', className: 'Bastion', name: 'NPC · Shieldbearer' },
    { id: 'DREADGUARD', className: 'Dreadguard', name: 'NPC · Dread Guardian' },
    { id: 'WAYFINDER', className: 'Wayfinder', name: 'NPC · Trail Ranger' },
    { id: 'RAVAGER', className: 'Ravager', name: 'NPC · Riftblade' },
    { id: 'HEXWEAVER', className: 'Hexweaver', name: 'NPC · Rune Adept' },
    { id: 'KNIFE_DANCER', className: 'Knife Dancer', name: 'NPC · Shadow Dancer' },
    { id: 'DAWNKEEPER', className: 'Dawnkeeper', name: 'NPC · Dawn Medic' },
    { id: 'STONECALLER', className: 'Stonecaller', name: 'NPC · Stone Sage' },
];
function createQModeNpcAllies({ minimumLevel, minimumCombatPower, syncLevel, controllerLevel }) {
    if (![minimumLevel, syncLevel, controllerLevel].every(n => Number.isInteger(n) && n >= 1 && n <= 100))
        throw new Error('invalid_npc_level');
    if (controllerLevel < minimumLevel)
        throw new Error('character_below_tier_level');
    const level = Math.max(minimumLevel, Math.min(syncLevel, controllerLevel));
    return CLASSES.map(({ id, className, name }) => {
        const role = (0, role_readiness_1.deriveRole)(id), ref = normalization_1.ROOTBOUND_ROLE_REFERENCES[role], kit = (0, launch_combat_1.launchPlayer)(className, level);
        const powerRatio = minimumCombatPower ? Math.max(1, Math.min(2.2, minimumCombatPower / (minimumLevel <= 10 ? 2500 : 6000))) : 1;
        // NPC-only power calibration; it does not create or mutate any player Echo.
        const scale = Math.max(.55, level / ref.level) * .9 * Math.pow(powerRatio, .52), accountId = `npc:qmode:${id}`, characterId = accountId;
        const capabilities = role === 'tank' ? ['threat', 'defense'] : role === 'support' ? ['restore', 'mitigate', 'utility'] : ['damage'];
        const record = { accountId, characterId, classId: id, loadoutId: 'npc-kit', revision: 1,
            characterLevel: level, ...(minimumCombatPower ? { combatPower: minimumCombatPower } : {}), dungeonUnlocked: true, legalEquipment: true, capabilities: capabilities,
            abilities: structuredClone(kit.abilities),
            stats: { characterId, classId: id, displayName: name, bodyPresentation: 'male', level,
                maxHp: ref.maxHp * scale, attackPower: ref.attackPower * scale, healingPower: ref.healingPower * scale,
                defense: ref.defense * scale, accuracy: ref.accuracy * scale, evasion: ref.evasion * scale,
                critChance: kit.stats.critChance, haste: kit.stats.haste } };
        return (0, loadout_snapshots_1.resolveAndFreezeLoadout)({ accountId, characterId, loadoutId: record.loadoutId, expectedRevision: 1,
            minLevel: minimumLevel, syncLevel, repository: { getOwnedLoadout: () => record } });
    });
}
