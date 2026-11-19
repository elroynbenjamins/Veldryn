"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const regional_power_balance_1 = require("../regional-power-balance");
node_assert_1.strict.equal(regional_power_balance_1.REGIONAL_DUNGEON_BALANCE_VERSION, 'regional-tier-power-v1');
for (const id of ['EXP_001', 'EXP_003'])
    for (const tier of [1, 2, 3]) {
        const row = (0, regional_power_balance_1.regionalPowerMultipliers)(id, tier, true);
        if (!row)
            throw new Error('new online regional dungeon missing scaled encounter pressure');
        node_assert_1.strict.ok(row.attack > 0 && row.attack < 2 && row.hp > 0 && row.hp < 4 && row.defense > 0 && row.defense < 4);
        node_assert_1.strict.equal((0, regional_power_balance_1.regionalPowerMultipliers)(id, tier, false), undefined, 'saved legacy runs retain old enemy stats');
    }
node_assert_1.strict.equal((0, regional_power_balance_1.regionalPowerMultipliers)('EXP_005', 1, true), undefined, 'Frostmarch is still in development');
node_assert_1.strict.equal((0, regional_power_balance_1.regionalPowerMultipliers)('EXP_001', 1, true)?.enemyLevel, 10);
node_assert_1.strict.equal((0, regional_power_balance_1.regionalPowerMultipliers)('EXP_003', 1, true)?.enemyLevel, 25);
for (const id of ['EXP_001', 'EXP_003']) {
    const rows = [1, 2, 3].map(tier => (0, regional_power_balance_1.regionalPowerMultipliers)(id, tier, true));
    for (const stat of ['attack', 'hp', 'defense']) {
        node_assert_1.strict.ok(rows[0][stat] < rows[1][stat] && rows[1][stat] < rows[2][stat], id + ' has monotonic tier ' + stat);
    }
}
console.log('PASS: versioned regional encounter scale and legacy-run protection');
node_assert_1.strict.equal((0, regional_power_balance_1.regionalCombatPowerBoost)('EXP_001', 2500, true), 1);
node_assert_1.strict.ok((0, regional_power_balance_1.regionalCombatPowerBoost)('EXP_001', 5000, true) > (0, regional_power_balance_1.regionalCombatPowerBoost)('EXP_001', 3750, true));
node_assert_1.strict.ok((0, regional_power_balance_1.regionalCombatPowerBoost)('EXP_003', 8500, true) > (0, regional_power_balance_1.regionalCombatPowerBoost)('EXP_003', 7250, true));
node_assert_1.strict.ok((0, regional_power_balance_1.regionalCombatPowerBoost)('EXP_001', 5000, true) < 1.4, 'Combat Power increases must stay capped');
node_assert_1.strict.equal((0, regional_power_balance_1.regionalCombatPowerBoost)('EXP_001', 50000, true), 1.4, 'No unlimited power in normalized co-op');
node_assert_1.strict.equal((0, regional_power_balance_1.regionalCombatPowerBoost)('EXP_001', 50000, false), 1, 'Legacy saved runs keep original equipment normalization');
node_assert_1.strict.equal((0, regional_power_balance_1.regionalCombatPowerBoost)('EXP_005', 50000, true), 1, 'Development dungeons have no published power scaling');
const root = (0, regional_power_balance_1.regionalPowerMultipliers)('EXP_001', 2, true, 'BOSS_EXP_ROOT');
const bell = (0, regional_power_balance_1.regionalPowerMultipliers)('EXP_001', 2, true, 'BOSS_EXP_BELL');
node_assert_1.strict.ok(root.attack < bell.attack, 'New Asterfall routes compensate for the legacy 2.9x Rootbound modifier');
const solar = (0, regional_power_balance_1.regionalPowerMultipliers)('EXP_003', 3, true, 'BOSS_EXP_SOLAR');
const sphinx = (0, regional_power_balance_1.regionalPowerMultipliers)('EXP_003', 3, true, 'BOSS_EXP_SPHINX');
node_assert_1.strict.ok(solar.attack < sphinx.attack && solar.hp < sphinx.hp, 'Solar boss mechanics need lower raw pressure than Sphinx');
node_assert_1.strict.equal((0, regional_power_balance_1.regionalPowerMultipliers)('EXP_001', 2, false, 'BOSS_EXP_ROOT'), undefined, 'Old completed and running graphs must not be retuned');
