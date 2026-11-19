"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.possibleDungeonCompanionCounters = possibleDungeonCompanionCounters;
const coop_route_content_1 = require("../expeditions/content/coop-route-content");
const launch_content_1 = require("../expeditions/content/launch-content");
const dungeon_boss_rotation_1 = require("../expeditions/content/dungeon-boss-rotation");
const expedition_encounters_1 = require("../combat/content/expedition-encounters");
const dungeon_companion_counters_1 = require("./dungeon-companion-counters");
/** Possible encounters are never guaranteed to appear in a randomized route.
 * The room resolver still performs the final counter check server-side.
 * Dual-boss dungeons include every rotation variant in the preview so a
 * player's companion matchup covers both outcomes. */
function possibleDungeonCompanionCounters(dungeonId) {
    const route = coop_route_content_1.COOP_ROUTE_CONTENT[dungeonId], dungeon = launch_content_1.EXPEDITIONS[dungeonId];
    if (!route || !dungeon)
        return [];
    const variants = (0, dungeon_boss_rotation_1.dungeonBossVariantsFor)(dungeonId);
    const bossIds = variants.length ? variants.map(variant => variant.bossId) : [dungeon.bossId];
    const result = new Set();
    for (const id of [...route.battle, ...route.elite, ...bossIds]) {
        const encounter = expedition_encounters_1.EXPEDITION_ENCOUNTERS[id]?.();
        if (!encounter)
            continue;
        for (const counter of (0, dungeon_companion_counters_1.dungeonCompanionCounterOptions)(encounter))
            result.add(counter);
    }
    return [...result];
}
