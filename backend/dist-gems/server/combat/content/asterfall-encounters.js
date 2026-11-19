"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASTERFALL_ENCOUNTERS = void 0;
const pve_encounter_identity_1 = require("../pve-encounter-identity");
const launch_combat_1 = require("./launch-combat");
const s = (maxHp, attackPower, defense, accuracy = 650, evasion = 120) => ({ maxHp, attackPower, healingPower: 0, defense, accuracy, evasion, critChance: .04, critMultiplier: 1.5, haste: 0 });
const enemy = (id, name, hp, ap, def, abilityCoeff = 1.0) => (0, pve_encounter_identity_1.withPveIdentity)({
    id, name, team: 'enemies', role: 'enemy', level: 25, stats: s(hp, ap, def), basicAttackMs: 2800, basicAttackCoeff: .72,
    abilities: [{ id: `${id}_HEAVY`, name: 'Heavy Strike', cooldownMs: 7000, castTimeMs: 700, target: 'current_target', priority: 70, effects: [{ kind: 'damage', coeff: abilityCoeff, damageType: 'physical' }] }],
}, 'bruiser', ['heavy_hit']);
function variedEnemy(base, archetype, damageType = 'nature') {
    if (archetype === 'bruiser')
        return base;
    const { id, name, stats } = base;
    let abilities, mechanics;
    switch (archetype) {
        case 'assassin':
            abilities = [(0, pve_encounter_identity_1.pveFocusStrike)(`${id}_HUNT`, `${name} Hunt`, damageType, .75, 9000)];
            mechanics = ['focus', 'execute'];
            break;
        case 'caster':
            abilities = [(0, pve_encounter_identity_1.pveInterruptibleWave)(`${id}_WAVE`, `${name} Wave`, damageType, .37, 11500, 1350)];
            mechanics = ['interrupt', 'aoe'];
            break;
        case 'guardian':
            abilities = [(0, pve_encounter_identity_1.pveHeavyStrike)(`${id}_CRUSH`, `${name} Crush`, damageType, .78, 7800), (0, pve_encounter_identity_1.pveBarrier)(`${id}_WARD`, `${name} Ward`, Math.round(stats.maxHp * .07), 14500)];
            mechanics = ['heavy_hit', 'barrier'];
            break;
        case 'hexer':
            abilities = [(0, pve_encounter_identity_1.pveHex)(`${id}_HEX`, `${name} Hex`, damageType, .46, 10500)];
            mechanics = ['vulnerability'];
            break;
        case 'swarm':
            abilities = [(0, pve_encounter_identity_1.pveDotWave)(`${id}_SPORES`, `${name} Spores`, damageType, .19, 14500)];
            mechanics = ['interrupt', 'aoe', 'dot'];
            break;
        case 'executioner':
            abilities = [(0, pve_encounter_identity_1.pveExecuteStrike)(`${id}_EXECUTE`, `${name} Execute`, damageType, .77, 9000)];
            mechanics = ['execute'];
            break;
    }
    return (0, pve_encounter_identity_1.withPveIdentity)({ ...base, abilities }, archetype, mechanics);
}
function rootWarden() {
    const base = enemy('ROOT_WARDEN', 'Runebound Bulwark', 13500, 430, 900, 1.25);
    return (0, pve_encounter_identity_1.withPveIdentity)({ ...base, boss: false, abilities: [...base.abilities, (0, pve_encounter_identity_1.pveBarrier)('ROOT_WARDEN_WARD', 'Root Ward', 1250, 12000)] }, 'guardian', ['heavy_hit', 'barrier']);
}
function rootBrambleElite() {
    const base = enemy('ROOT_ELITE_BRAMBLE', 'Bramble Reaver', 13200, 430, 850, 1.1);
    return (0, pve_encounter_identity_1.withPveIdentity)({ ...base, abilities: [
            (0, pve_encounter_identity_1.pveFocusStrike)('ROOT_ELITE_BRAMBLE_HUNT', 'Bramble Hunt', 'nature', .91, 7900),
            (0, pve_encounter_identity_1.pveDotWave)('ROOT_ELITE_BRAMBLE_TANGLE', 'Tangled Thorns', 'nature', .30, 11900),
        ] }, 'assassin', ['focus', 'aoe', 'dot']);
}
function rootMyceliumElite() {
    const base = enemy('ROOT_ELITE_MYCELIUM', 'Mycelial Oracle', 12500, 400, 810, 1.0);
    return (0, pve_encounter_identity_1.withPveIdentity)({ ...base, abilities: [
            (0, pve_encounter_identity_1.pveAllyMend)('ROOT_ELITE_MYCELIUM_MEND', 'Fungal Renewal', 850, 11000),
            (0, pve_encounter_identity_1.pveDotWave)('ROOT_ELITE_MYCELIUM_SPORES', 'Spore Tempest', 'nature', .29, 12300),
        ] }, 'support', ['sustain', 'aoe', 'dot']);
}
function lanternCantor() {
    const base = enemy('LANTERN_ELITE_03', 'Mourning Cantor', 12800, 440, 790, 1.1);
    return (0, pve_encounter_identity_1.withPveIdentity)({ ...base, abilities: [
            (0, pve_encounter_identity_1.pveHex)('LANTERN_ELITE_03_HEX', 'Mourning Verse', 'shadow', .62, 9500),
            (0, pve_encounter_identity_1.pveDotWave)('LANTERN_ELITE_03_DIRGE', 'Shadow Dirge', 'shadow', .29, 13100),
        ] }, 'hexer', ['vulnerability', 'dot', 'aoe']);
}
function lanternPilgrim() {
    return (0, pve_encounter_identity_1.withPveIdentity)({
        id: 'LANTERN_PILGRIM_1', name: 'Drowned Pilgrim', team: 'enemies', role: 'enemy', level: 25, stats: s(5600, 320, 620), basicAttackMs: 3000, basicAttackCoeff: .58,
        abilities: [(0, pve_encounter_identity_1.pveAllyMend)('LANTERN_PILGRIM_MEND', 'Drowned Benediction', 850, 9000), (0, pve_encounter_identity_1.pveSupportRally)('LANTERN_PILGRIM_RALLY', 'Lantern Litany', .05, 14500)],
    }, 'support', ['sustain']);
}
function bellSentinel(id = 'BELL_SENTINEL', name = 'Bell Sentinel', hp = 12800, ap = 450, def = 840) {
    const base = enemy(id, name, hp, ap, def, 1.15);
    return (0, pve_encounter_identity_1.withPveIdentity)({ ...base, abilities: [{ id: `${id}_TOLL`, name: 'Sentinel Toll', cooldownMs: 8000, castTimeMs: 1100, target: 'all_enemies', priority: 90, interruptible: true, effects: [{ kind: 'damage', coeff: .62, damageType: 'shadow' }] }] }, 'caster', ['interrupt', 'aoe']);
}
const rootBoss = () => (0, pve_encounter_identity_1.withPveIdentity)((0, launch_combat_1.rootboundHeartBoss)(), 'bruiser', ['heavy_hit', 'aoe', 'interrupt', 'dot', 'enrage']);
const bellBoss = () => (0, pve_encounter_identity_1.withPveIdentity)((0, launch_combat_1.bellWardenBoss)(), 'caster', ['interrupt', 'aoe', 'vulnerability']);
exports.ASTERFALL_ENCOUNTERS = {
    ROOTBOUND_BATTLE_01: () => [enemy('ROOT_HUSK_1', 'Briar Husk', 5200, 330, 620), variedEnemy(enemy('ROOT_HUSK_2', 'Sporeling', 5200, 330, 620), 'swarm')],
    ROOTBOUND_ELITE_01: () => [rootWarden()],
    ROOTBOUND_BOSS: () => [rootBoss()],
    LANTERN_BATTLE_01: () => [enemy('LANTERN_WRETCH_1', 'Lantern Wretch', 4800, 350, 560), variedEnemy(enemy('LANTERN_WRETCH_2', 'Lantern Wretch', 4800, 350, 560), 'caster', 'shadow')],
    LANTERN_ELITE_01: () => [bellSentinel()],
    LANTERN_BOSS: () => [bellBoss()],
};
const rootBattleIds = ['ROOT_SCOUTS', 'ROOT_GUARDIANS', 'ROOT_VINES', 'ROOT_STALKERS', 'ROOT_SENTINELS'];
const rootBattleArchetypes = [
    ['assassin', 'swarm'], // scouts and sporelings: priority targets + spreading spores
    ['guardian', 'hexer'], // a warded guardian protects a thorn hexer
    ['hexer', 'bruiser'], // strangling vines weaken the tank
    ['assassin', 'executioner'], // stalkers pressure vulnerable party members
    ['guardian', 'bruiser'], // a shielded sentinel backs up the frontline
];
for (const [index, id] of rootBattleIds.entries()) {
    exports.ASTERFALL_ENCOUNTERS[id] = () => [
        variedEnemy(enemy(`${id}_A`, ['Briar Scout', 'Root Guardian', 'Strangling Vine', 'Moss Stalker', 'Grove Sentinel'][index], 4_800 + index * 350, 310 + index * 14, 560 + index * 35, .95 + index * .04), rootBattleArchetypes[index][0]),
        variedEnemy(enemy(`${id}_B`, ['Sporeling', 'Thornling', 'Sap Husk', 'Briar Hound', 'Rootbound Husk'][index], 4_100 + index * 300, 300 + index * 12, 520 + index * 30, .92 + index * .04), rootBattleArchetypes[index][1]),
    ];
}
exports.ASTERFALL_ENCOUNTERS.ROOT_ELITE_BRAMBLE = () => [rootBrambleElite()];
exports.ASTERFALL_ENCOUNTERS.ROOT_ELITE_WARDEN = () => [rootWarden()];
exports.ASTERFALL_ENCOUNTERS.ROOT_ELITE_MYCELIUM = () => [rootMyceliumElite()];
exports.ASTERFALL_ENCOUNTERS.BOSS_EXP_ROOT = () => [rootBoss()];
exports.ASTERFALL_ENCOUNTERS.LANTERN_BATTLE_02 = () => [variedEnemy(enemy('LANTERN_SHADE_1', 'Banner Shade', 5000, 360, 590, 1.02), 'hexer', 'shadow'), variedEnemy(enemy('LANTERN_SHADE_2', 'Echo Bat', 4300, 340, 520, .94), 'assassin', 'physical')];
exports.ASTERFALL_ENCOUNTERS.LANTERN_BATTLE_03 = () => [lanternPilgrim(), enemy('LANTERN_PILGRIM_2', 'Lantern Wretch', 4700, 355, 570, 1)];
exports.ASTERFALL_ENCOUNTERS.LANTERN_ELITE_02 = () => [bellSentinel('LANTERN_KNIGHT', 'Fallen Lantern Knight', 13200, 460, 880)];
exports.ASTERFALL_ENCOUNTERS.LANTERN_ELITE_03 = () => [lanternCantor()];
exports.ASTERFALL_ENCOUNTERS.BOSS_EXP_BELL = () => [bellBoss()];
