"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASHLANDS_ENCOUNTERS = exports.FROSTMARCH_ENCOUNTERS = void 0;
const pve_encounter_identity_1 = require("../pve-encounter-identity");
const stats = (maxHp, attackPower, defense, level) => ({ maxHp, attackPower, healingPower: 0, defense, accuracy: 930, evasion: 190, critChance: .06, critMultiplier: 1.5, haste: .03 });
const strike = (id, name, coeff, damageType, target = 'current_target') => ({ id, name, cooldownMs: target === 'all_enemies' ? 9800 : 6800, castTimeMs: target === 'all_enemies' ? 1100 : 700, target, priority: target === 'all_enemies' ? 90 : 70, interruptible: target === 'all_enemies', effects: [{ kind: 'damage', coeff, damageType }] });
function normalIdentity(name) {
    if (['Glacier Stalker', 'Icefang Hound', 'Glassbone Hound'].includes(name))
        return { archetype: 'assassin', mechanics: ['focus', 'execute'] };
    if (['Choir Wisp', 'Ember Wraith', 'Crucible Imp'].includes(name))
        return { archetype: 'caster', mechanics: ['interrupt', 'aoe'] };
    if (['Rime Cantor', 'Bellbound Shade', 'Charred Adept'].includes(name))
        return { archetype: 'hexer', mechanics: ['vulnerability', 'healing_reduction'] };
    if (['Frozen Pilgrim', 'Glacial Acolyte', 'Molten Pilgrim'].includes(name))
        return { archetype: 'support', mechanics: ['sustain'] };
    if (['Choir Sentinel', 'Cinderbound Guard', 'Ashen Colossus'].includes(name))
        return { archetype: 'guardian', mechanics: ['heavy_hit', 'barrier'] };
    if (['Cinder Mireling'].includes(name))
        return { archetype: 'swarm', mechanics: ['aoe', 'dot'] };
    if (['Fen Reaver', 'Prime Scoria'].includes(name))
        return { archetype: 'executioner', mechanics: ['heavy_hit', 'execute'] };
    return { archetype: 'bruiser', mechanics: ['heavy_hit'] };
}
function normalAbilities(id, name, type, index, identity) {
    const coeff = .96 + index * .025;
    switch (identity.archetype) {
        case 'assassin': return [(0, pve_encounter_identity_1.pveFocusStrike)(`${id}_HUNT`, `${name} Hunt`, type, coeff, 7200)];
        case 'caster': return [(0, pve_encounter_identity_1.pveInterruptibleWave)(`${id}_CAST`, `${name} Channel`, type, .46 + index * .02, 9800, 1200)];
        case 'hexer': return [(0, pve_encounter_identity_1.pveHex)(`${id}_HEX`, `${name} Hex`, type, .58 + index * .02, 7600), (0, pve_encounter_identity_1.pveHealingPressure)(`${id}_MEND_BREAK`, `${name} Withering Rite`, type, .42 + index * .015, 9000)];
        case 'support': return [(0, pve_encounter_identity_1.pveAllyMend)(`${id}_MEND`, `${name} Mend`, 900 + index * 120, 9200), (0, pve_encounter_identity_1.pveSupportRally)(`${id}_RALLY`, `${name} Rally`, .05, 14500)];
        case 'guardian': return [(0, pve_encounter_identity_1.pveHeavyStrike)(`${id}_CRUSH`, `${name} Crush`, type, .92 + index * .025, 7200, 700), (0, pve_encounter_identity_1.pveBarrier)(`${id}_WARD`, `${name} Ward`, 700 + index * 120, 13500)];
        case 'swarm': return [(0, pve_encounter_identity_1.pveDotWave)(`${id}_SWARM`, `${name} Swarm`, type, .38 + index * .02, 10500)];
        case 'executioner': return [(0, pve_encounter_identity_1.pveExecuteStrike)(`${id}_EXECUTE`, `${name} Execute`, type, coeff, 7600)];
        case 'bruiser':
        default: return [(0, pve_encounter_identity_1.pveHeavyStrike)(`${id}_STRIKE`, `${name} Strike`, type, coeff, 6800, 700)];
    }
}
const enemy = (id, name, level, hp, attackPower, defense, type, index) => {
    const identity = normalIdentity(name);
    return (0, pve_encounter_identity_1.withPveIdentity)({ id, name, team: 'enemies', role: 'enemy', level, stats: stats(hp, attackPower, defense, level), basicAttackMs: 2750, basicAttackCoeff: .74, abilities: normalAbilities(id, name, type, index, identity) }, identity.archetype, identity.mechanics);
};
function battle(prefix, level, index, type, names, baseHp, baseAttack, baseDefense) {
    return [
        enemy(`${prefix}_A`, names[0], level, baseHp + index * 650, baseAttack + index * 80, baseDefense + index * 55, type, index),
        enemy(`${prefix}_B`, names[1], level, baseHp - 700 + index * 550, baseAttack - 70 + index * 65, baseDefense - 45 + index * 45, type, index),
    ];
}
function eliteIdentity(name) {
    if (name === 'Rimeplate Guard' || name === 'Forgeplate Custodian')
        return { archetype: 'guardian', mechanics: ['heavy_hit', 'barrier'] };
    if (name === 'Choirbreaker' || name === 'Cinder Channeler')
        return { archetype: 'caster', mechanics: ['interrupt', 'aoe', 'dot'] };
    if (name === 'Blackglass Devourer')
        return { archetype: 'executioner', mechanics: ['heavy_hit', 'execute'] };
    if (name === 'Rimehorn Alpha')
        return { archetype: 'bruiser', mechanics: ['heavy_hit', 'enrage'] };
    return { archetype: 'bruiser', mechanics: ['heavy_hit'] };
}
function elite(id, name, level, type, index, baseHp, baseAttack, baseDefense) {
    const hp = baseHp + index * 1700, attackPower = baseAttack + index * 120, defense = baseDefense + index * 95, identity = eliteIdentity(name);
    let abilities = [(0, pve_encounter_identity_1.pveHeavyStrike)(`${id}_BLAST`, `${name} Smash`, type, 1.25 + index * .04, 7200, 700)];
    if (identity.archetype === 'guardian') {
        const crush = name === 'Rimeplate Guard' ? 'Permafrost Crush' : 'Crucible Crush', ward = name === 'Rimeplate Guard' ? 'Icebound Ward' : 'Furnace Ward';
        abilities = [(0, pve_encounter_identity_1.pveHeavyStrike)(`${id}_CRUSH`, crush, type, 1.18 + index * .04, 7200, 700), (0, pve_encounter_identity_1.pveBarrier)(`${id}_WARD`, ward, 2400 + index * 220, 13000)];
    }
    if (identity.archetype === 'caster')
        abilities = [(0, pve_encounter_identity_1.pveDotWave)(`${id}_BLAST`, name === 'Choirbreaker' ? 'Shattering Chorus' : 'Fenfire Deluge', type, .82 + index * .03, 9800)];
    if (identity.archetype === 'executioner')
        abilities = [(0, pve_encounter_identity_1.pveExecuteStrike)(`${id}_EXECUTE`, 'Blackglass Devour', type, 1.25 + index * .04, 7200)];
    if (name === 'Rimehorn Alpha')
        abilities = [(0, pve_encounter_identity_1.pveHeavyStrike)(`${id}_BLAST`, 'Rimehorn Charge', type, 1.22, 7000, 650), (0, pve_encounter_identity_1.pveEnrage)(`${id}_RAGE`, 'Alpha Fury', .08, 15000)];
    return [(0, pve_encounter_identity_1.withPveIdentity)({ id, name, team: 'enemies', role: 'enemy', level, stats: stats(hp, attackPower, defense, level), basicAttackMs: 2750, basicAttackCoeff: .74, abilities }, identity.archetype, identity.mechanics)];
}
function bossIdentity(name) {
    if (name === 'The Frozen Cantor')
        return { archetype: 'caster', mechanics: ['interrupt', 'aoe', 'dot', 'healing_reduction'] };
    if (name === 'The Blackglass Fen Prime')
        return { archetype: 'executioner', mechanics: ['heavy_hit', 'execute', 'vulnerability', 'aoe'] };
    if (name === 'The Crucible Prime')
        return { archetype: 'guardian', mechanics: ['heavy_hit', 'barrier', 'aoe', 'enrage'] };
    return { archetype: 'bruiser', mechanics: ['heavy_hit', 'aoe', 'interrupt', 'enrage'] };
}
function boss(id, name, level, type, baseHp, baseAttack, baseDefense) {
    const identity = bossIdentity(name);
    let abilities, phases;
    if (name === 'The Bellbeast of Shiverlake') {
        abilities = [
            (0, pve_encounter_identity_1.pveHeavyStrike)(`${id}_CHARGE`, 'Shiverlake Charge', type, 1.4, 6800, 700),
            (0, pve_encounter_identity_1.pveInterruptibleWave)(`${id}_QUAKE`, 'Bellquake', type, 1.0, 10800, 1450),
            (0, pve_encounter_identity_1.pveEnrage)(`${id}_FURY`, 'Rimehorn Frenzy', .08, 17000),
        ];
        phases = [
            { id: `${id}_PHASE_65`, name: 'Cracked Bell', hpPct: .65, target: 'all_enemies', effects: [{ kind: 'damage', coeff: .46, damageType: type }, { kind: 'debuff', tag: 'damage_taken', value: .04, durationMs: 5500 }] },
            { id: `${id}_PHASE_30`, name: 'Winter Stampede', hpPct: .30, target: 'self', effects: [{ kind: 'buff', tag: 'damage_done', value: .14, durationMs: 30000 }] },
        ];
    }
    else if (name === 'The Frozen Cantor') {
        abilities = [
            (0, pve_encounter_identity_1.pveHex)(`${id}_VERSE`, 'Dissonant Verse', type, .8, 7200),
            (0, pve_encounter_identity_1.pveHealingPressure)(`${id}_WITHER`, 'Withering Refrain', type, .5, 9000),
            (0, pve_encounter_identity_1.pveDotWave)(`${id}_TEMPEST`, 'Choir Tempest', type, .78, 10800),
        ];
        phases = [
            { id: `${id}_PHASE_60`, name: 'First Refrain', hpPct: .60, target: 'all_enemies', effects: [{ kind: 'damage', coeff: .44, damageType: type }, { kind: 'dot', coeff: .08, damageType: type, durationMs: 6000, tickMs: 2000 }] },
            { id: `${id}_PHASE_30`, name: 'Final Refrain', hpPct: .30, target: 'all_enemies', effects: [{ kind: 'damage', coeff: .56, damageType: type }, { kind: 'debuff', tag: 'damage_taken', value: .08, durationMs: 8000 }] },
        ];
    }
    else if (name === 'The Blackglass Fen Prime') {
        abilities = [
            (0, pve_encounter_identity_1.pveExecuteStrike)(`${id}_EXECUTE`, 'Blackglass Execution', type, 1.35, 7000),
            (0, pve_encounter_identity_1.pveInterruptibleWave)(`${id}_SHATTER`, 'Fen Shatter', type, 1.0, 10800, 1450),
            (0, pve_encounter_identity_1.pveHex)(`${id}_BRAND`, 'Glassbrand', type, .56, 9000),
        ];
        phases = [
            { id: `${id}_PHASE_55`, name: 'Cracking Shell', hpPct: .55, target: 'all_enemies', effects: [{ kind: 'damage', coeff: .52, damageType: type }, { kind: 'debuff', tag: 'damage_taken', value: .06, durationMs: 7500 }] },
            { id: `${id}_PHASE_25`, name: 'Devour the Weak', hpPct: .25, target: 'self', effects: [{ kind: 'buff', tag: 'damage_done', value: .12, durationMs: 30000 }] },
        ];
    }
    else {
        abilities = [
            (0, pve_encounter_identity_1.pveHeavyStrike)(`${id}_HAMMER`, 'Crucible Hammer', type, 1.35, 7000, 700),
            (0, pve_encounter_identity_1.pveInterruptibleWave)(`${id}_COLLAPSE`, 'Furnace Collapse', type, 1.0, 10800, 1450),
            (0, pve_encounter_identity_1.pveBarrier)(`${id}_WARD`, 'Molten Aegis', 7200, 16500),
            (0, pve_encounter_identity_1.pveEnrage)(`${id}_HEAT`, 'Crucible Heat', .07, 18000),
        ];
        phases = [
            { id: `${id}_PHASE_60`, name: 'Tempered Shell', hpPct: .60, target: 'self', effects: [{ kind: 'shield', flat: 6500 }] },
            { id: `${id}_PHASE_30`, name: 'Overheat', hpPct: .30, target: 'self', effects: [{ kind: 'buff', tag: 'damage_done', value: .15, durationMs: 30000 }] },
        ];
    }
    const definition = { id, name, team: 'enemies', role: 'enemy', level, boss: true, stats: stats(baseHp, baseAttack, baseDefense, level), basicAttackMs: 2650, basicAttackCoeff: .8, abilities, phases };
    return [(0, pve_encounter_identity_1.withPveIdentity)(definition, identity.archetype, identity.mechanics)];
}
exports.FROSTMARCH_ENCOUNTERS = {};
const frostBattleNames = [[['Rimewolf', 'Shiverling']], [['Glacier Stalker', 'Frostbound Scout']], [['Lake Warden', 'Icefang Hound']]];
for (const [index, id] of ['FROST_LAKE_BATTLE_01', 'FROST_LAKE_BATTLE_02', 'FROST_LAKE_BATTLE_03'].entries())
    exports.FROSTMARCH_ENCOUNTERS[id] = () => battle(id, 70, index, 'ice', frostBattleNames[index][0], 13_500, 5_000, 1_450);
const frostChoirNames = [[['Choir Wisp', 'Rime Cantor']], [['Frozen Pilgrim', 'Bellbound Shade']], [['Choir Sentinel', 'Glacial Acolyte']]];
for (const [index, id] of ['FROST_CHOIR_BATTLE_01', 'FROST_CHOIR_BATTLE_02', 'FROST_CHOIR_BATTLE_03'].entries())
    exports.FROSTMARCH_ENCOUNTERS[id] = () => battle(id, 70, index, 'ice', frostChoirNames[index][0], 13_900, 5_100, 1_500);
for (const [index, name] of ['Rimehorn Alpha', 'Choirbreaker', 'Rimeplate Guard'].entries()) {
    exports.FROSTMARCH_ENCOUNTERS[`FROST_LAKE_ELITE_0${index + 1}`] = () => elite(`FROST_LAKE_ELITE_${index + 1}`, name, 70, 'ice', index, 35_000, 5_600, 2_100);
    exports.FROSTMARCH_ENCOUNTERS[`FROST_CHOIR_ELITE_0${index + 1}`] = () => elite(`FROST_CHOIR_ELITE_${index + 1}`, name, 70, 'ice', index, 35_800, 5_700, 2_150);
}
exports.FROSTMARCH_ENCOUNTERS.BOSS_EXP_BELLBEAST = () => boss('BOSS_EXP_BELLBEAST', 'The Bellbeast of Shiverlake', 70, 'ice', 112_000, 6_500, 2_500);
exports.FROSTMARCH_ENCOUNTERS.BOSS_EXP_CANTOR = () => boss('BOSS_EXP_CANTOR', 'The Frozen Cantor', 70, 'ice', 116_000, 6_650, 2_550);
exports.ASHLANDS_ENCOUNTERS = {};
const ashBattleNames = [[['Cinder Mireling', 'Blackglass Beetle']], [['Ember Wraith', 'Ashen Marauder']], [['Fen Reaver', 'Glassbone Hound']], [['Crucible Imp', 'Charred Adept']], [['Molten Pilgrim', 'Cinderbound Guard']], [['Prime Scoria', 'Ashen Colossus']]];
const ashIds = ['ASH_FEN_BATTLE_01', 'ASH_FEN_BATTLE_02', 'ASH_FEN_BATTLE_03', 'ASH_CRUCIBLE_BATTLE_01', 'ASH_CRUCIBLE_BATTLE_02', 'ASH_CRUCIBLE_BATTLE_03'];
for (const [index, id] of ashIds.entries())
    exports.ASHLANDS_ENCOUNTERS[id] = () => battle(id, 94, index % 3, 'fire', ashBattleNames[index][0], 15_500, 6_300, 1_850);
for (const [index, name] of ['Cinder Channeler', 'Blackglass Devourer', 'Forgeplate Custodian'].entries()) {
    exports.ASHLANDS_ENCOUNTERS[`ASH_FEN_ELITE_0${index + 1}`] = () => elite(`ASH_FEN_ELITE_${index + 1}`, name, 94, 'fire', index, 39_000, 7_000, 2_500);
    exports.ASHLANDS_ENCOUNTERS[`ASH_CRUCIBLE_ELITE_0${index + 1}`] = () => elite(`ASH_CRUCIBLE_ELITE_${index + 1}`, name, 94, 'fire', index, 41_000, 7_200, 2_550);
}
exports.ASHLANDS_ENCOUNTERS.BOSS_EXP_FEN = () => boss('BOSS_EXP_FEN', 'The Blackglass Fen Prime', 94, 'fire', 125_000, 8_200, 2_900);
exports.ASHLANDS_ENCOUNTERS.BOSS_EXP_PRIME = () => boss('BOSS_EXP_PRIME', 'The Crucible Prime', 94, 'fire', 132_000, 8_400, 2_950);
