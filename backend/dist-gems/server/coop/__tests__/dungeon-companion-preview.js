"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const dungeon_companion_preview_1 = require("../dungeon-companion-preview");
const dungeon_companion_counters_1 = require("../dungeon-companion-counters");
const coop_route_content_1 = require("../../expeditions/content/coop-route-content");
const launch_content_1 = require("../../expeditions/content/launch-content");
const dungeon_boss_rotation_1 = require("../../expeditions/content/dungeon-boss-rotation");
const expedition_encounters_1 = require("../../combat/content/expedition-encounters");
strict_1.default.deepEqual((0, dungeon_companion_preview_1.possibleDungeonCompanionCounters)('UNRELEASED_UNKNOWN'), []);
for (const dungeonId of ['EXP_001', 'EXP_003', 'EXP_004', 'EXP_005', 'EXP_006']) {
    const possible = (0, dungeon_companion_preview_1.possibleDungeonCompanionCounters)(dungeonId);
    const route = coop_route_content_1.COOP_ROUTE_CONTENT[dungeonId], bossId = launch_content_1.EXPEDITIONS[dungeonId].bossId;
    strict_1.default.ok(possible.length > 0, `${dungeonId}: at least one combat counter must appear in the authored route`);
    strict_1.default.equal(new Set(possible).size, possible.length, `${dungeonId}: no duplicate counter hints`);
    const variants = (0, dungeon_boss_rotation_1.dungeonBossVariantsFor)(dungeonId);
    const encounters = [...route.battle, ...route.elite, ...(variants.length ? variants.map(boss => boss.bossId) : [bossId])].map(id => expedition_encounters_1.EXPEDITION_ENCOUNTERS[id]?.()).filter((x) => Boolean(x));
    for (const id of possible) {
        strict_1.default.ok(encounters.some(enemies => (0, dungeon_companion_counters_1.dungeonCompanionCounterOptions)(enemies).includes(id)), `${dungeonId}: hint ${id} must be supported by an actual encounter`);
    }
    strict_1.default.deepEqual((0, dungeon_companion_preview_1.possibleDungeonCompanionCounters)(dungeonId), possible, 'Preview ordering must be stable for cached entry and loadout');
}
const potential = ['armor_break', 'spellbreak', 'bulwark', 'recovery', 'swarm_hunt', 'finisher'];
strict_1.default.equal((0, dungeon_companion_counters_1.dungeonCompanionOpportunity)('UNIT_005', potential), 'spellbreak');
strict_1.default.equal((0, dungeon_companion_counters_1.dungeonCompanionOpportunity)('UNIT_015', potential), 'bulwark');
strict_1.default.equal((0, dungeon_companion_counters_1.dungeonCompanionOpportunity)('UNIT_021', potential), 'armor_break');
strict_1.default.equal((0, dungeon_companion_counters_1.dungeonCompanionOpportunity)('UNIT_001', potential), 'finisher', 'Ironwood Hound should counter sustained enemies');
strict_1.default.equal((0, dungeon_companion_counters_1.dungeonCompanionOpportunity)('UNIT_005', ['armor_break']), undefined, 'Cannot recommend an absent matchup');
console.log('Dungeon companion possible-counter previews OK');
