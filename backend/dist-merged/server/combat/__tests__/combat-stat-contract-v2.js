"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const combat_stat_contract_v2_1 = require("../combat-stat-contract-v2");
const stats = {
    weaponPower: 120, skillPower: 90, abilityDamage: .35, healingPower: .20, potency: .08,
};
const basic = { kind: 'basic_weapon', purpose: 'damage', powerSource: 'weapon', coefficient: 1 };
const weaponSkill = { kind: 'weapon_technique', purpose: 'damage', powerSource: 'weapon', coefficient: 1 };
const classSkill = { kind: 'class_skill', purpose: 'damage', powerSource: 'skill', coefficient: 1 };
const heal = { kind: 'class_skill', purpose: 'heal', powerSource: 'skill', coefficient: 1 };
const shield = { kind: 'class_skill', purpose: 'shield', powerSource: 'skill', coefficient: 1 };
node_assert_1.strict.deepEqual((0, combat_stat_contract_v2_1.validateCombatPowerStatsV2)(stats), []);
node_assert_1.strict.deepEqual((0, combat_stat_contract_v2_1.validateCombatActionV2)(basic), []);
node_assert_1.strict.equal((0, combat_stat_contract_v2_1.projectCombatActionPowerV2)(stats, basic).powerAfterBonuses, 120, 'Basic weapon attacks scale only from verified Weapon Power, not Ability Damage');
node_assert_1.strict.equal((0, combat_stat_contract_v2_1.projectCombatActionPowerV2)(stats, weaponSkill).powerAfterBonuses, 162, 'Weapon-based techniques may use Ability Damage once but must not also scale from Skill Power');
node_assert_1.strict.ok(Math.abs((0, combat_stat_contract_v2_1.projectCombatActionPowerV2)(stats, classSkill).powerAfterBonuses - 121.5) < 1e-9, 'Class damaging skills scale from Skill Power with Ability Damage');
node_assert_1.strict.equal((0, combat_stat_contract_v2_1.projectCombatActionPowerV2)(stats, heal).powerAfterBonuses, 108, 'Class healing skills scale from Skill Power with Healing Power');
node_assert_1.strict.equal((0, combat_stat_contract_v2_1.projectCombatActionPowerV2)(stats, shield).powerAfterBonuses, 90, 'Shields scale from Skill Power, not automatic Healing Power');
const weaponBoost = { ...stats, weaponPower: 240 };
node_assert_1.strict.equal((0, combat_stat_contract_v2_1.projectCombatActionPowerV2)(weaponBoost, basic).powerAfterBonuses, 240);
node_assert_1.strict.equal((0, combat_stat_contract_v2_1.projectCombatActionPowerV2)(weaponBoost, classSkill).powerAfterBonuses, (0, combat_stat_contract_v2_1.projectCombatActionPowerV2)(stats, classSkill).powerAfterBonuses, 'Increasing Weapon Power must not covertly increase pure class skills');
const skillBoost = { ...stats, skillPower: 180 };
node_assert_1.strict.equal((0, combat_stat_contract_v2_1.projectCombatActionPowerV2)(skillBoost, heal).powerAfterBonuses, 216);
node_assert_1.strict.equal((0, combat_stat_contract_v2_1.projectCombatActionPowerV2)(skillBoost, basic).powerAfterBonuses, 120, 'Increasing Skill Power must not covertly increase ordinary weapon hits');
node_assert_1.strict.deepEqual((0, combat_stat_contract_v2_1.validateCombatPowerStatsV2)({ ...stats, weaponPower: NaN }), ['invalid_weaponPower']);
node_assert_1.strict.deepEqual((0, combat_stat_contract_v2_1.validateCombatPowerStatsV2)({ ...stats, skillPower: -5 }), ['invalid_skillPower']);
node_assert_1.strict.deepEqual((0, combat_stat_contract_v2_1.validateCombatPowerStatsV2)({ ...stats, abilityDamage: Infinity }), ['invalid_abilityDamage']);
node_assert_1.strict.ok((0, combat_stat_contract_v2_1.validateCombatActionV2)({ ...basic, powerSource: 'skill' })
    .includes('invalid_basic_weapon_tag'), 'Illegally mixed basic-attack scaling must be rejected');
node_assert_1.strict.ok((0, combat_stat_contract_v2_1.validateCombatActionV2)({ ...classSkill, powerSource: 'weapon' })
    .includes('invalid_class_skill_tag'), 'A pure class skill cannot accidentally double count its weapon');
node_assert_1.strict.throws(() => (0, combat_stat_contract_v2_1.projectCombatActionPowerV2)(stats, { ...basic, coefficient: Infinity }), /invalid_combat_v2_projection/);
node_assert_1.strict.deepEqual(combat_stat_contract_v2_1.COMBAT_2_BUILD_POWER_SHARE_TARGETS, {
    classAndLevel: .17, equipmentBase: .45, rarityAndQuality: .14,
    affixesUpgradesGemsSets: .14, companionsAndOther: .10,
});
const summary = (0, combat_stat_contract_v2_1.summarizeBuildContributionV2)({
    classAndLevel: 170, equipmentBase: 450, rarityAndQuality: 140,
    affixesUpgradesGemsSets: 140, companionsAndOther: 100,
});
node_assert_1.strict.equal(summary.total, 1000);
for (const key of Object.keys(combat_stat_contract_v2_1.COMBAT_2_BUILD_POWER_SHARE_TARGETS))
    node_assert_1.strict.ok(Math.abs(summary.shares[key] - combat_stat_contract_v2_1.COMBAT_2_BUILD_POWER_SHARE_TARGETS[key]) < 1e-10, 'Budget shares are reporting targets, not global combat multipliers');
node_assert_1.strict.throws(() => (0, combat_stat_contract_v2_1.summarizeBuildContributionV2)({
    classAndLevel: 0, equipmentBase: 0, rarityAndQuality: 0,
    affixesUpgradesGemsSets: 0, companionsAndOther: 0,
}), /empty_build_contribution/);
console.log('PASS: isolated Combat 2.0 Weapon/Skill Power contract, source tags and budget targets');
