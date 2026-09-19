"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const combat_stat_contract_v20_1 = require("./combat-stat-contract-v20");
const sunscar_dungeons_v20_1 = require("./sunscar-dungeons-v20");
const sunscar_region_v20_1 = require("./sunscar-region-v20");
const region_content_publisher_v20_1 = require("./region-content-publisher-v20");
node_assert_1.strict.equal(sunscar_region_v20_1.SUNSCAR_ZONES_V20.length, 5);
node_assert_1.strict.equal(sunscar_region_v20_1.SUNSCAR_ENEMIES_V20.length, 16);
node_assert_1.strict.equal(sunscar_region_v20_1.SUNSCAR_BOSSES_V20.length, 4);
node_assert_1.strict.equal(sunscar_dungeons_v20_1.SUNSCAR_DUNGEONS_V20.length, 3);
node_assert_1.strict.equal(sunscar_region_v20_1.SUNSCAR_QUESTLINE_V20.length, 10);
node_assert_1.strict.equal(sunscar_region_v20_1.SUNSCAR_RESOURCES_V20.length, 12);
node_assert_1.strict.equal(sunscar_region_v20_1.SUNSCAR_ECHO_CONDITIONS_V20.length, 4);
node_assert_1.strict.equal(sunscar_region_v20_1.SUNSCAR_RELIC_HOOKS_V20.length, 4);
node_assert_1.strict.equal(sunscar_region_v20_1.SUNSCAR_COLLECTIBLE_UNLOCKS_V20.length, 9);
node_assert_1.strict.deepEqual((0, sunscar_dungeons_v20_1.validateSunscarDungeonDefinitionsV20)(), []);
node_assert_1.strict.equal(sunscar_region_v20_1.SUNSCAR_EQUIPMENT_POLICY_V20.equipmentSetsAuthored, false);
node_assert_1.strict.equal(sunscar_region_v20_1.SUNSCAR_EQUIPMENT_POLICY_V20.regionalWeaponsAuthored, false);
node_assert_1.strict.ok(!JSON.stringify(sunscar_region_v20_1.SUNSCAR_QUESTLINE_V20).toLowerCase().includes('market'));
node_assert_1.strict.ok(!JSON.stringify(sunscar_region_v20_1.SUNSCAR_RESOURCES_V20).toLowerCase().includes('market'));
node_assert_1.strict.ok(sunscar_region_v20_1.SUNSCAR_ENEMIES_V20.some(x => x.stats.critChance >= .10));
node_assert_1.strict.ok(sunscar_region_v20_1.SUNSCAR_ENEMIES_V20.some(x => x.stats.evasion >= 30));
node_assert_1.strict.ok(sunscar_region_v20_1.SUNSCAR_ENEMIES_V20.some(x => x.stats.healingPower > 0));
node_assert_1.strict.ok(sunscar_region_v20_1.SUNSCAR_BOSSES_V20.every(x => x.equipmentRewardsFinalized === false));
const bundle = (0, region_content_publisher_v20_1.buildSunscarRegionContentBundleV20)();
node_assert_1.strict.equal(bundle.regionId, 'REG_002');
node_assert_1.strict.equal(bundle.contentVersion, 'sunscar-v20.0.0');
node_assert_1.strict.equal(bundle.contentHash.length, 64);
node_assert_1.strict.equal(bundle.records.filter(x => x.recordType === 'zone').length, 5);
node_assert_1.strict.equal(bundle.records.filter(x => x.recordType === 'monster').length, 16);
node_assert_1.strict.equal(bundle.records.filter(x => x.recordType === 'boss').length, 4);
node_assert_1.strict.equal(bundle.records.filter(x => x.recordType === 'live_dungeon').length, 3);
node_assert_1.strict.ok(bundle.records.some(x => x.recordType === 'dungeon_node'));
node_assert_1.strict.equal(bundle.records.filter(x => x.recordType === 'echo_condition').length, 4);
node_assert_1.strict.equal(bundle.records.filter(x => x.recordType === 'relic').length, 4);
node_assert_1.strict.equal(bundle.records.filter(x => x.recordType === 'collectible_unlock').length, 9);
const sample = { id: 'SET_TEST', name: 'Test', eligibleSlots: ['helmet', 'chest', 'legs', 'boots', 'gloves'], thresholds: [
        { pieces: 2, label: '+HP', statModifiers: [{ stat: 'maxHpPercent', percent: .03 }], powerBudgetWeight: .25 },
        { pieces: 3, label: '+2% Crit', statModifiers: [{ stat: 'critChance', flat: .02 }], powerBudgetWeight: .30 },
        { pieces: 5, label: 'Specialization', statModifiers: [], triggeredEffect: { id: 'test_fx', description: 'Rotation-specific effect', tags: ['test'] }, powerBudgetWeight: .45 },
    ] };
node_assert_1.strict.deepEqual((0, combat_stat_contract_v20_1.validateEquipmentSetDefinitionV20)(sample), []);
const active = (0, combat_stat_contract_v20_1.resolveActiveSetBonusesV20)([
    { setId: 'SET_TEST', slot: 'helmet', itemId: 'a' },
    { setId: 'SET_TEST', slot: 'chest', itemId: 'b' },
    { setId: 'SET_TEST', slot: 'legs', itemId: 'c' },
], [sample]);
node_assert_1.strict.equal(active.length, 1);
node_assert_1.strict.equal(active[0].unlocked.length, 2);
node_assert_1.strict.equal(active[0].unlocked[1].pieces, 3);
const second = { id: 'SET_SECOND', name: 'Second', eligibleSlots: ['helmet', 'chest', 'legs', 'boots', 'gloves'], thresholds: [
        { pieces: 2, label: '+Ward', statModifiers: [{ stat: 'ward', flat: 8 }], powerBudgetWeight: .30 },
    ] };
const mixed = (0, combat_stat_contract_v20_1.resolveActiveSetBonusesV20)([
    { setId: 'SET_TEST', slot: 'helmet', itemId: 'a' }, { setId: 'SET_TEST', slot: 'chest', itemId: 'b' }, { setId: 'SET_TEST', slot: 'legs', itemId: 'c' },
    { setId: 'SET_SECOND', slot: 'boots', itemId: 'd' }, { setId: 'SET_SECOND', slot: 'gloves', itemId: 'e' },
], [sample, second]);
node_assert_1.strict.equal(mixed.length, 2);
node_assert_1.strict.equal(mixed.find(x => x.setId === 'SET_TEST')?.unlocked.some(x => x.pieces === 3), true);
node_assert_1.strict.equal(mixed.find(x => x.setId === 'SET_SECOND')?.unlocked.some(x => x.pieces === 2), true);
const duplicateSlot = (0, combat_stat_contract_v20_1.resolveActiveSetBonusesV20)([
    { setId: 'SET_TEST', slot: 'helmet', itemId: 'a' }, { setId: 'SET_TEST', slot: 'helmet', itemId: 'duplicate' }, { setId: 'SET_TEST', slot: 'chest', itemId: 'b' },
], [sample]);
node_assert_1.strict.equal(duplicateSlot[0].pieces, 2);
node_assert_1.strict.equal(duplicateSlot[0].unlocked.some(x => x.pieces === 3), false);
console.log('v20 Sunscar + set-bonus tests passed');
