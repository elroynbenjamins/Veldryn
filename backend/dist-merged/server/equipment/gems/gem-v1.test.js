"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const gem_catalog_v1_1 = require("./gem-catalog-v1");
const gem_progression_v1_1 = require("./gem-progression-v1");
const gem_runtime_v1_1 = require("./gem-runtime-v1");
const gem_acquisition_v1_1 = require("./gem-acquisition-v1");
node_assert_1.strict.equal(gem_catalog_v1_1.STAT_GEMS_V1.length, 12);
node_assert_1.strict.equal(gem_catalog_v1_1.EFFECT_GEMS_V1.length, 20);
node_assert_1.strict.deepEqual((0, gem_catalog_v1_1.validateGemCatalogV1)(), []);
node_assert_1.strict.deepEqual((0, gem_acquisition_v1_1.validateGemAcquisitionV1)(), []);
node_assert_1.strict.ok((0, gem_acquisition_v1_1.gemPoolForSourceV1)('COP_004'));
node_assert_1.strict.ok((0, gem_acquisition_v1_1.buildGemDropsForSourceV1)('COP_004').length > 0);
const forcedPity = (0, gem_acquisition_v1_1.settleGemSourceV1)('COP_004', 'forced-pity', { pityBySource: { COP_004: 7 }, unlockedRecipeIds: [] });
node_assert_1.strict.ok(forcedPity.gem, 'Dungeon pity must settle one unrefined gem');
node_assert_1.strict.ok(forcedPity.gem?.itemId.startsWith('raw_gem:'), 'Gem acquisition must award an unrefined family gem');
node_assert_1.strict.equal(forcedPity.gem?.pityTriggered, true);
node_assert_1.strict.equal(forcedPity.pityBySource.COP_004, 0);
const forcedElite = (0, gem_acquisition_v1_1.settleGemSourceV1)('ZONE_007', 'forced-elite', { pityBySource: { ZONE_007: 59 }, unlockedRecipeIds: [] });
node_assert_1.strict.equal(forcedElite.gem?.grade, 2, 'Elite pity must preserve the configured Grade II raw gem');
node_assert_1.strict.equal(forcedElite.pityBySource.ZONE_007, 0);
const forcedRegionalBoss = (0, gem_acquisition_v1_1.settleGemSourceV1)('ZONE_010', 'forced-regional-boss', { pityBySource: { ZONE_010: 24 }, unlockedRecipeIds: [] });
node_assert_1.strict.equal(forcedRegionalBoss.gem?.grade, 3, 'Regional boss pity must preserve the configured Grade III raw gem');
node_assert_1.strict.equal(forcedRegionalBoss.pityBySource.ZONE_010, 0);
const summary = (0, gem_runtime_v1_1.summarizeGemLoadoutV1)([
    { equipmentItemId: 'a', sockets: { effect: { familyId: 'effect_momentum', grade: 5 }, stat: { familyId: 'stat_might', grade: 5 } } },
    { equipmentItemId: 'b', sockets: { effect: { familyId: 'effect_momentum', grade: 3 } } },
    { equipmentItemId: 'c', sockets: { effect: { familyId: 'effect_momentum', grade: 1 } } },
]);
node_assert_1.strict.equal(summary.effects[0]?.resonance, 3);
node_assert_1.strict.equal(summary.effects[0]?.copies, 3);
node_assert_1.strict.equal(summary.statPercent.power, .01);
const wallet = { gold: 100000, dust: 100, regionalCatalysts: 2, radiantCatalysts: 1, gems: [{ familyId: 'stat_might', grade: 1, quantity: 3 }] };
node_assert_1.strict.deepEqual([1, 2, 3, 4, 5, 6, 7].map(gem_progression_v1_1.gemCombineSuccessPercentV1), [90, 80, 70, 60, 55, 50, 45]);
const combined = (0, gem_progression_v1_1.combineGemV1)(wallet, 'stat_might', 1, .1);
node_assert_1.strict.equal(combined.gems.find(v => v.grade === 2)?.quantity, 1);
const failed = (0, gem_progression_v1_1.combineGemV1)(wallet, 'stat_might', 1, .99);
node_assert_1.strict.equal(failed.gems.find(v => v.grade === 1)?.quantity, 2, 'Failed merges lose just one gem');
node_assert_1.strict.equal(failed.gems.some(v => v.grade === 2), false, 'Failed merges never mint a higher gem');
node_assert_1.strict.equal(failed.gold, wallet.gold - 1800, 'Failed merges still pay the current Forge Gold cost');
const radiantWallet = { ...wallet, gems: [{ familyId: 'stat_might', grade: 4, quantity: 3 }] };
const radiantFailure = (0, gem_progression_v1_1.combineGemV1)(radiantWallet, 'stat_might', 4, .99);
node_assert_1.strict.equal(radiantFailure.gems.find(v => v.grade === 4)?.quantity, 2, 'A failed G4 merge must return 2 Flawless gems');
node_assert_1.strict.equal(radiantFailure.gold, radiantWallet.gold - 72000, 'G4 merge must use the same 20%-increased Forge Gold cost');
node_assert_1.strict.equal(radiantFailure.dust, radiantWallet.dust - 40, 'Failed G4 merge spends Gem Dust');
node_assert_1.strict.equal(radiantFailure.radiantCatalysts, 0, 'Failed G4 merge consumes its Radiant Catalyst');
const radiantSuccess = (0, gem_progression_v1_1.combineGemV1)(radiantWallet, 'stat_might', 4, .1);
node_assert_1.strict.equal(radiantSuccess.gems.find(v => v.grade === 5)?.quantity, 1, 'Successful G4 merge must award 1 Radiant gem');
const dismantled = (0, gem_progression_v1_1.dismantleGemV1)(combined, 'stat_might', 2, 1);
node_assert_1.strict.equal(dismantled.dust, 103);
let resonanceCapBlocked = false;
try {
    (0, gem_runtime_v1_1.summarizeGemLoadoutV1)([
        { equipmentItemId: '1', sockets: { effect: { familyId: 'effect_execution', grade: 1 } } },
        { equipmentItemId: '2', sockets: { effect: { familyId: 'effect_execution', grade: 1 } } },
        { equipmentItemId: '3', sockets: { effect: { familyId: 'effect_execution', grade: 1 } } },
        { equipmentItemId: '4', sockets: { effect: { familyId: 'effect_execution', grade: 1 } } },
    ]);
}
catch (error) {
    resonanceCapBlocked = error instanceof Error && error.message === 'effect_gem_resonance_cap';
}
node_assert_1.strict.ok(resonanceCapBlocked, 'Fourth matching Effect Gem must be rejected');
console.log('gem v1 tests passed');
