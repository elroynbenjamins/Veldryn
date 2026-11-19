"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUNSCAR_ENCOUNTERS = void 0;
const pve_encounter_identity_1 = require("../pve-encounter-identity");
const stats = (maxHp, attackPower, defense, accuracy = 910, evasion = 220) => ({ maxHp, attackPower, healingPower: 0, defense, accuracy, evasion, critChance: .06, critMultiplier: 1.5, haste: .03 });
const strike = (id, name, coeff, damageType, target = 'current_target', castTimeMs = 650) => ({ id, name, cooldownMs: target === 'all_enemies' ? 9500 : 6800, castTimeMs, target, priority: target === 'all_enemies' ? 90 : 70, interruptible: castTimeMs > 900, effects: [{ kind: 'damage', coeff, damageType }] });
const enemy = (id, name, hp, ap, def, ability, archetype = 'bruiser', mechanics = ['heavy_hit']) => (0, pve_encounter_identity_1.withPveIdentity)({ id, name, team: 'enemies', role: 'enemy', level: 45, stats: stats(hp, ap, def), basicAttackMs: 2800, basicAttackCoeff: .72, abilities: [ability] }, archetype, mechanics);
const pairs = [
    ['SUN_OBS_BATTLE_01', 'Sunstone Custodian', 'Amberglass Scribe', 'fire', 0], ['SUN_OBS_BATTLE_02', 'Orrery Scarab', 'Solar Watcher', 'arcane', 1], ['SUN_OBS_BATTLE_03', 'Dustbound Scholar', 'Heliolith Drone', 'fire', 2],
    ['SUN_MIRAGE_BATTLE_01', 'Mirage Jackal', 'Glassscale Stalker', 'physical', 0], ['SUN_MIRAGE_BATTLE_02', 'Dune Phantom', 'Well Guardian', 'arcane', 1], ['SUN_MIRAGE_BATTLE_03', 'Sunscored Prowler', 'Amberglass Asp', 'fire', 2],
];
exports.SUNSCAR_ENCOUNTERS = {};
for (const [id, first, second, type, index] of pairs)
    exports.SUNSCAR_ENCOUNTERS[id] = () => [
        enemy(`${id}_A`, first, 8_300 + index * 450, 3_100 + index * 50, 980 + index * 45, strike(`${id}_A_SWEEP`, 'Scouring Wave', .92 + index * .025, type, 'all_enemies', 1050), 'caster', ['interrupt', 'aoe']),
        enemy(`${id}_B`, second, 7_500 + index * 400, 2_900 + index * 45, 920 + index * 40, strike(`${id}_B_STRIKE`, 'Scouring Hit', .96 + index * .03, type), 'bruiser', ['heavy_hit']),
    ];
function eliteIdentity(name) {
    if (name === 'Orrery Warden' || name === 'Glasshide Warder' || name === 'Wellbound Colossus')
        return { archetype: 'guardian', mechanics: ['heavy_hit', 'barrier'] };
    if (name === 'Solar Archivist')
        return { archetype: 'caster', mechanics: ['interrupt', 'aoe'] };
    if (name === 'Dune Sphinx')
        return { archetype: 'hexer', mechanics: ['vulnerability', 'dot'] };
    if (name === 'Veiled Huntmaster')
        return { archetype: 'assassin', mechanics: ['focus', 'execute'] };
    return { archetype: 'bruiser', mechanics: ['heavy_hit'] };
}
function elite(id, name, type, index) {
    const hp = 22_000 + index * 1_200, ap = 3_400 + index * 75, def = 1_420 + index * 70, identity = eliteIdentity(name);
    let abilities = [strike(`${id}_BURST`, 'Focused Burst', 1.22 + index * .04, type, 'all_enemies', 1150)];
    if (identity.archetype === 'guardian')
        abilities = [strike(`${id}_STRIKE`, 'Sentinel Crush', 1.05 + index * .04, type), (0, pve_encounter_identity_1.pveBarrier)(`${id}_WARD`, 'Amberglass Ward', 1800 + index * 180, 12500)];
    if (identity.archetype === 'hexer')
        abilities = [(0, pve_encounter_identity_1.pveHex)(`${id}_HEX`, 'Mirage Hex', type, .7, 7200), (0, pve_encounter_identity_1.pveInterruptibleWave)(`${id}_BURST`, 'Sphinx Riddleburst', type, .55, 10500, 1300)];
    if (identity.archetype === 'assassin')
        abilities = [(0, pve_encounter_identity_1.pveFocusStrike)(`${id}_HUNT`, 'Marked Quarry', type, 1.05, 7000)];
    return [(0, pve_encounter_identity_1.withPveIdentity)({ id, name, team: 'enemies', role: 'enemy', level: 45, stats: stats(hp, ap, def), basicAttackMs: 2800, basicAttackCoeff: .72, abilities }, identity.archetype, identity.mechanics)];
}
for (const [prefix, names, type] of [
    ['SUN_OBS', ['Orrery Warden', 'Solar Archivist', 'Glasshide Warder'], 'arcane'],
    ['SUN_MIRAGE', ['Dune Sphinx', 'Veiled Huntmaster', 'Wellbound Colossus'], 'fire'],
])
    names.forEach((name, index) => { exports.SUNSCAR_ENCOUNTERS[`${prefix}_ELITE_0${index + 1}`] = () => elite(`${prefix}_ELITE_${index + 1}`, name, type, index); });
function boss(id, name, type, attackPower = 3_900) {
    const hex = name === 'The Veiled Sphinx', archetype = hex ? 'hexer' : 'guardian', mechanics = hex ? ['vulnerability', 'interrupt', 'aoe', 'focus'] : ['heavy_hit', 'interrupt', 'aoe', 'barrier'];
    const lance = hex ? (0, pve_encounter_identity_1.pveFocusStrike)(`${id}_LANCE`, 'Sphinx Pursuit', type, 1.13, 7000) : strike(`${id}_LANCE`, 'Solar Lance', 1.38, type);
    const abilities = [lance, { ...strike(`${id}_NOVA`, 'Radiant Collapse', 1.0, type, 'all_enemies', 1450), cooldownMs: 10500, interruptible: true }];
    if (hex)
        abilities.push((0, pve_encounter_identity_1.pveHex)(`${id}_HEX`, 'Veiled Verdict', type, .53, 9000));
    else
        abilities.push((0, pve_encounter_identity_1.pveBarrier)(`${id}_WARD`, 'Amberglass Ward', 5200, 16000));
    const definition = { id, name, team: 'enemies', role: 'enemy', level: 45, boss: true, stats: stats(68_000, attackPower, 1_650, 940, 180), basicAttackMs: 2600, basicAttackCoeff: .78, abilities, phases: [{ id: `${id}_PHASE_50`, hpPct: .5, target: 'all_enemies', effects: [{ kind: 'damage', coeff: .62, damageType: type }, { kind: 'debuff', tag: 'damage_taken', value: .06, durationMs: 7000 }] }] };
    return [(0, pve_encounter_identity_1.withPveIdentity)(definition, archetype, mechanics)];
}
exports.SUNSCAR_ENCOUNTERS.BOSS_EXP_SOLAR = () => boss('BOSS_EXP_SOLAR', 'The Buried Heliarch', 'fire', 4_000);
exports.SUNSCAR_ENCOUNTERS.BOSS_EXP_SPHINX = () => boss('BOSS_EXP_SPHINX', 'The Veiled Sphinx', 'arcane', 3_635);
