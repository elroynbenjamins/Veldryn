"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const launch_content_1 = require("../../expeditions/content/launch-content");
const constants_1 = require("../../expeditions/constants");
const rewards_1 = require("../../expeditions/rewards");
const reward_base_1 = require("../../expeditions/reward-base");
const dungeon_entry_policy_1 = require("../dungeon-entry-policy");
const expected = [
    { id: 'EXP_001', name: 'Rootbound Vault', tiers: [50, 55, 63] },
    { id: 'EXP_003', name: 'Buried Observatory', tiers: [72, 79, 90] },
    { id: 'EXP_005', name: 'Shiverlake Descent', tiers: [84, 92, 105] },
    { id: 'EXP_007', name: 'Blackglass Fen', tiers: [88, 97, 110] },
];
const tierIds = [1, 2, 3];
let previousBase = 0;
for (const { id, name, tiers } of expected) {
    const definition = launch_content_1.EXPEDITIONS[id];
    node_assert_1.strict.equal(definition.name, name);
    node_assert_1.strict.ok(definition.baseMarks > previousBase, 'Each successive surviving regional dungeon must grant more base Marks');
    previousBase = definition.baseMarks;
    node_assert_1.strict.equal((0, dungeon_entry_policy_1.listedRegularDungeon)(definition), true, 'Surviving dungeon must be represented in the regional catalogue');
    node_assert_1.strict.equal((0, reward_base_1.currentDungeonBaseMarks)(id), definition.baseMarks);
    for (const [index, tier] of tierIds.entries()) {
        node_assert_1.strict.equal((0, rewards_1.baseMarks)(definition.baseMarks, tier), tiers[index], name + ' tier ' + tier);
        node_assert_1.strict.equal((0, rewards_1.marksForRun)(definition.baseMarks, tier, { cleared: true, routeProgress: 1, reachedFinalBoss: true }), tiers[index]);
        if (index > 0)
            node_assert_1.strict.ok(tiers[index] > tiers[index - 1], 'Higher tiers should always grant more Marks');
    }
}
// The retired dungeons keep their original economy for historical run snapshots
// and remain unlisted/unavailable. Their base rewards are not part of the new curve.
for (const [id, marks] of [['EXP_002', 76], ['EXP_004', 80], ['EXP_006', 85], ['EXP_008', 90]]) {
    node_assert_1.strict.equal(launch_content_1.EXPEDITIONS[id].baseMarks, marks, 'Do not rebalance retired dungeon data');
    node_assert_1.strict.equal((0, dungeon_entry_policy_1.listedRegularDungeon)(launch_content_1.EXPEDITIONS[id]), false, 'Do not reopen retired dungeons');
    node_assert_1.strict.equal((0, dungeon_entry_policy_1.publishedRegularDungeon)(launch_content_1.EXPEDITIONS[id]), false, 'Retired dungeons must not enter the published queue');
}
node_assert_1.strict.deepEqual(constants_1.EXPEDITION.marksMultiplier, { 1: 1, 2: 1.10, 3: 1.25, 4: 1.45, 5: 1.70 }, 'Preserve existing tier reward scaling');
node_assert_1.strict.equal((0, rewards_1.baseMarks)(launch_content_1.EXPEDITIONS.EXP_001.baseMarks, 1), 50);
node_assert_1.strict.equal((0, rewards_1.baseMarks)(launch_content_1.EXPEDITIONS.EXP_005.baseMarks, 3), 105, 'Keep the Frostmarch Tier III reward unchanged');
for (const id of Object.keys(reward_base_1.LEGACY_DUNGEON_BASE_MARKS)) {
    node_assert_1.strict.equal((0, reward_base_1.frozenRunBaseMarks)({ expeditionId: id }), reward_base_1.LEGACY_DUNGEON_BASE_MARKS[id], 'Already-started runs retain previous values');
    node_assert_1.strict.equal((0, reward_base_1.frozenRunBaseMarks)({ expeditionId: id, rewardBaseMarks: launch_content_1.EXPEDITIONS[id].baseMarks }), launch_content_1.EXPEDITIONS[id].baseMarks, 'New runs use a frozen catalogue amount');
}
node_assert_1.strict.equal((0, reward_base_1.frozenRunBaseMarks)({ expeditionId: 'EXP_001' }), 74);
node_assert_1.strict.equal((0, reward_base_1.frozenRunBaseMarks)({ expeditionId: 'EXP_001', rewardBaseMarks: 50 }), 50);
node_assert_1.strict.throws(() => (0, reward_base_1.frozenRunBaseMarks)({ expeditionId: 'UNRECOGNIZED' }), /unknown_expedition/);
console.log('Dungeon marks: surviving regional reward curve and retired-run protection passed');
