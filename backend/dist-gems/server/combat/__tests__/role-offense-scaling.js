"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const calculations_1 = require("../calculations");
const engine_1 = require("../engine");
const common = { team: 'players', attackPower: 420, defense: 1500, maxHp: 5200, healingPower: 180 };
const dmg = (0, calculations_1.roleAdjustedAttackPower)({ ...common, role: 'damage' });
const tank = (0, calculations_1.roleAdjustedAttackPower)({ ...common, role: 'tank' });
const support = (0, calculations_1.roleAdjustedAttackPower)({ ...common, role: 'support' });
node_assert_1.strict.equal(dmg, 420, 'Damage classes must keep identical output.');
node_assert_1.strict.ok(tank > dmg && tank <= dmg * 1.10, 'Tank offense must grow modestly but never exceed 10%.');
node_assert_1.strict.ok(support > dmg && support <= dmg * 1.10, 'Support offense must grow modestly but never exceed 10%.');
node_assert_1.strict.equal((0, calculations_1.roleAdjustedAttackPower)({ ...common, team: 'enemies', role: 'tank' }), 420, 'Enemies must never inherit player role buffs.');
node_assert_1.strict.ok((0, calculations_1.roleAdjustedAttackPower)({ ...common, role: 'tank', defense: 2500 }) >= tank, 'More Defense must not reduce tank offense.');
node_assert_1.strict.ok((0, calculations_1.roleAdjustedAttackPower)({ ...common, role: 'tank', maxHp: 7200 }) >= tank, 'More HP must not reduce tank offense.');
node_assert_1.strict.ok((0, calculations_1.roleAdjustedAttackPower)({ ...common, role: 'support', healingPower: 720 }) >= support, 'More healing/shielding power must not reduce support offense.');
node_assert_1.strict.ok((0, calculations_1.roleAdjustedAttackPower)({ ...common, role: 'tank', defense: 1e9, maxHp: 1e9 }) <= 462, 'Defense/HP must not bypass the cap.');
node_assert_1.strict.ok((0, calculations_1.roleAdjustedAttackPower)({ ...common, role: 'support', healingPower: 1e9 }) <= 462, 'Healing power must not bypass the cap.');
function actor(role, id, statsOverride = {}) {
    return { id, classId: id, name: id, team: 'players', role, level: 25, basicAttackMs: 2500, basicAttackCoeff: .7, abilities: [], stats: { maxHp: 5200, attackPower: 420, healingPower: 180, defense: 1500, accuracy: 5000, evasion: 0, critChance: 0, critMultiplier: 1.5, haste: 0, ...statsOverride } };
}
const enemy = { ...actor('damage', 'ENEMY'), role: 'enemy', team: 'enemies', basicAttackMs: 999999, stats: { ...actor('damage', 'ENEMY').stats, maxHp: 1e8, attackPower: 0, defense: 0, accuracy: 0, evasion: 0 } };
function dealt(role, stats = {}) {
    const result = (0, engine_1.simulateCombat)({ seed: 'ROLE_OFFENSE_REGRESSION', players: [actor(role, 'P', stats)], enemies: [enemy], maxDurationMs: 15000 });
    return result.players[0].damageDone;
}
node_assert_1.strict.ok(dealt('tank') > dealt('damage'), 'Combat engine must actually apply the tank contribution.');
node_assert_1.strict.ok(dealt('support') > dealt('damage'), 'Combat engine must actually apply support contribution.');
node_assert_1.strict.ok(dealt('tank', { defense: 5000, maxHp: 30000 }) <= dealt('damage') * 1.11, 'Engine must enforce the tank cap.');
node_assert_1.strict.ok(dealt('support', { healingPower: 20000 }) <= dealt('damage') * 1.11, 'Engine must enforce the support cap.');
node_assert_1.strict.equal(dealt('tank'), dealt('tank'), 'Role scaling must remain deterministic.');
console.log('PASS: Tank and Support defensive/healing stats feed bounded damage without altering DPS or enemies');
