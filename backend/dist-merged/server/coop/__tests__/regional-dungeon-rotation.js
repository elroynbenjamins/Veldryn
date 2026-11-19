"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_assert_1 = require("node:assert");
const launch_content_1 = require("../../expeditions/content/launch-content");
const coop_route_content_1 = require("../../expeditions/content/coop-route-content");
const dungeon_boss_rotation_1 = require("../../expeditions/content/dungeon-boss-rotation");
const route_generation_1 = require("../../expeditions/route-generation");
const dungeon_entry_policy_1 = require("../dungeon-entry-policy");
const regions = [
    { canonical: 'EXP_001', retired: 'EXP_002', prefix: 'LANTERN_', region: 'Asterfall' },
    { canonical: 'EXP_003', retired: 'EXP_004', prefix: 'SUN_MIRAGE_', region: 'Sunscar' },
    { canonical: 'EXP_005', retired: 'EXP_006', prefix: 'FROST_CHOIR_', region: 'Frostmarch' },
    { canonical: 'EXP_007', retired: 'EXP_008', prefix: 'ASH_CRUCIBLE_', region: 'Ashlands' },
];
node_assert_1.strict.deepEqual(Object.values(launch_content_1.EXPEDITIONS).filter(dungeon_entry_policy_1.publishedRegularDungeon).map(d => d.id), ['EXP_001', 'EXP_003']);
node_assert_1.strict.deepEqual(Object.values(launch_content_1.EXPEDITIONS).filter(dungeon_entry_policy_1.listedRegularDungeon).map(d => d.id), ['EXP_001', 'EXP_003', 'EXP_005', 'EXP_007']);
node_assert_1.strict.deepEqual([1, 2, 3].map(t => (0, dungeon_entry_policy_1.regularDungeonTierRequiredLevel)(launch_content_1.EXPEDITIONS.EXP_001, t)), [10, 10, 10]);
for (const { canonical, retired, prefix, region } of regions) {
    node_assert_1.strict.equal(launch_content_1.EXPEDITIONS[canonical].region, region);
    node_assert_1.strict.equal(launch_content_1.EXPEDITIONS[retired].region, region);
    node_assert_1.strict.equal((0, dungeon_entry_policy_1.listedRegularDungeon)(launch_content_1.EXPEDITIONS[retired]), false, 'Retired dungeons must remain hidden from new queues');
    node_assert_1.strict.equal((0, dungeon_entry_policy_1.publishedRegularDungeon)(launch_content_1.EXPEDITIONS[retired]), false, 'Retired dungeons must never become enterable');
    const bosses = (0, dungeon_boss_rotation_1.dungeonBossVariantsFor)(canonical);
    node_assert_1.strict.equal(bosses.length, 2, canonical + ' must have both original regional final bosses');
    node_assert_1.strict.deepEqual(bosses.map(b => b.bossId), [launch_content_1.EXPEDITIONS[canonical].bossId, launch_content_1.EXPEDITIONS[retired].bossId], 'Retired boss must be retained by canonical dungeon');
    node_assert_1.strict.equal((0, dungeon_boss_rotation_1.dungeonBossVariantsFor)(retired).length, 0, 'Retired dungeon must not have a new public rotation');
    node_assert_1.strict.ok(coop_route_content_1.COOP_ROUTE_CONTENT[canonical].battle.some(id => id.startsWith(prefix)), 'Retired encounters merge into canonical regular dungeon');
    node_assert_1.strict.ok(coop_route_content_1.COOP_ROUTE_CONTENT[canonical].elite.some(id => id.startsWith(prefix)), 'Retired elite encounters merge into canonical regular dungeon');
    // Ashlands remains explicitly unimplemented and cannot generate new routes.
    // Frostmarch is still development-only; generating routes here is a content test, not an unlock.
    if (!launch_content_1.EXPEDITIONS[canonical].coopImplemented) {
        node_assert_1.strict.equal(canonical, 'EXP_007');
        continue;
    }
    const counts = new Map(bosses.map(boss => [boss.bossId, 0]));
    for (let i = 0; i < 400; i++) {
        const args = ['regional-secret', canonical, canonical + '-' + i, 'content-v3', 'balance-v3'];
        const graph = (0, route_generation_1.generateCoopRouteGraph)(...args);
        node_assert_1.strict.deepEqual((0, route_generation_1.generateCoopRouteGraph)(...args), graph, 'Frozen boss must never reroll');
        const id = graph.nodes.find(node => node.kind === 'boss')?.contentId ?? '';
        node_assert_1.strict.ok(counts.has(id), 'Unexpected final boss ' + id);
        counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    for (const n of counts.values())
        node_assert_1.strict.ok(n >= 160 && n <= 240, canonical + ' must have an approximately 50/50 boss distribution: ' + n);
    if (launch_content_1.EXPEDITIONS[retired].coopImplemented) {
        node_assert_1.strict.equal((0, route_generation_1.generateCoopRouteGraph)('regional-secret', retired, 'legacy-run', 'content-v3', 'balance-v3').nodes.find(node => node.kind === 'boss')?.contentId, launch_content_1.EXPEDITIONS[retired].bossId, 'Historical retired runs must keep their original boss');
    }
}
console.log('regional dungeon rotation and retirement tests passed');
