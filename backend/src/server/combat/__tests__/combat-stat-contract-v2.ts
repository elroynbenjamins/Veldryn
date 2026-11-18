import {strict as assert} from 'node:assert';
import {
  COMBAT_2_BUILD_POWER_SHARE_TARGETS,
  projectCombatActionPowerV2,
  summarizeBuildContributionV2,
  validateCombatActionV2,
  validateCombatPowerStatsV2,
  type CombatActionV2,
  type CombatPowerStatsV2,
} from '../combat-stat-contract-v2';

const stats:CombatPowerStatsV2={
  weaponPower:120,skillPower:90,abilityDamage:.35,healingPower:.20,potency:.08,
};
const basic:CombatActionV2={kind:'basic_weapon',purpose:'damage',powerSource:'weapon',coefficient:1};
const weaponSkill:CombatActionV2={kind:'weapon_technique',purpose:'damage',powerSource:'weapon',coefficient:1};
const classSkill:CombatActionV2={kind:'class_skill',purpose:'damage',powerSource:'skill',coefficient:1};
const heal:CombatActionV2={kind:'class_skill',purpose:'heal',powerSource:'skill',coefficient:1};
const shield:CombatActionV2={kind:'class_skill',purpose:'shield',powerSource:'skill',coefficient:1};

assert.deepEqual(validateCombatPowerStatsV2(stats),[]);
assert.deepEqual(validateCombatActionV2(basic),[]);
assert.equal(projectCombatActionPowerV2(stats,basic).powerAfterBonuses,120,
  'Basic weapon attacks scale only from verified Weapon Power, not Ability Damage');
assert.equal(projectCombatActionPowerV2(stats,weaponSkill).powerAfterBonuses,162,
  'Weapon-based techniques may use Ability Damage once but must not also scale from Skill Power');
assert.ok(Math.abs(projectCombatActionPowerV2(stats,classSkill).powerAfterBonuses-121.5)<1e-9,
  'Class damaging skills scale from Skill Power with Ability Damage');
assert.equal(projectCombatActionPowerV2(stats,heal).powerAfterBonuses,108,
  'Class healing skills scale from Skill Power with Healing Power');
assert.equal(projectCombatActionPowerV2(stats,shield).powerAfterBonuses,90,
  'Shields scale from Skill Power, not automatic Healing Power');
const weaponBoost={...stats,weaponPower:240};
assert.equal(projectCombatActionPowerV2(weaponBoost,basic).powerAfterBonuses,240);
assert.equal(projectCombatActionPowerV2(weaponBoost,classSkill).powerAfterBonuses,
  projectCombatActionPowerV2(stats,classSkill).powerAfterBonuses,
  'Increasing Weapon Power must not covertly increase pure class skills');
const skillBoost={...stats,skillPower:180};
assert.equal(projectCombatActionPowerV2(skillBoost,heal).powerAfterBonuses,216);
assert.equal(projectCombatActionPowerV2(skillBoost,basic).powerAfterBonuses,120,
  'Increasing Skill Power must not covertly increase ordinary weapon hits');
assert.deepEqual(validateCombatPowerStatsV2({...stats,weaponPower:NaN}),['invalid_weaponPower']);
assert.deepEqual(validateCombatPowerStatsV2({...stats,skillPower:-5}),['invalid_skillPower']);
assert.deepEqual(validateCombatPowerStatsV2({...stats,abilityDamage:Infinity}),['invalid_abilityDamage']);
assert.ok(validateCombatActionV2({...basic,powerSource:'skill'} as unknown as CombatActionV2)
  .includes('invalid_basic_weapon_tag'),'Illegally mixed basic-attack scaling must be rejected');
assert.ok(validateCombatActionV2({...classSkill,powerSource:'weapon'} as unknown as CombatActionV2)
  .includes('invalid_class_skill_tag'),'A pure class skill cannot accidentally double count its weapon');
assert.throws(()=>projectCombatActionPowerV2(stats,{...basic,coefficient:Infinity}),/invalid_combat_v2_projection/);
assert.deepEqual(COMBAT_2_BUILD_POWER_SHARE_TARGETS,{
  classAndLevel:.17,equipmentBase:.45,rarityAndQuality:.14,
  affixesUpgradesGemsSets:.14,companionsAndOther:.10,
});
const summary=summarizeBuildContributionV2({
  classAndLevel:170,equipmentBase:450,rarityAndQuality:140,
  affixesUpgradesGemsSets:140,companionsAndOther:100,
});
assert.equal(summary.total,1000);
for(const key of Object.keys(COMBAT_2_BUILD_POWER_SHARE_TARGETS) as Array<keyof typeof COMBAT_2_BUILD_POWER_SHARE_TARGETS>)
  assert.ok(Math.abs(summary.shares[key]-COMBAT_2_BUILD_POWER_SHARE_TARGETS[key])<1e-10,
    'Budget shares are reporting targets, not global combat multipliers');
assert.throws(()=>summarizeBuildContributionV2({
  classAndLevel:0,equipmentBase:0,rarityAndQuality:0,
  affixesUpgradesGemsSets:0,companionsAndOther:0,
}),/empty_build_contribution/);
console.log('PASS: isolated Combat 2.0 Weapon/Skill Power contract, source tags and budget targets');
