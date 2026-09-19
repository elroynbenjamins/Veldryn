"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.currentCombatRegionId = void 0;
exports.currentRegionId = currentRegionId;
const world_map_1 = require("../content/world-map");
/** Resolves the persisted player location, with a safe fallback for legacy saves. */
function currentRegionId(state) {
    const level = state.character?.level ?? 1;
    const usable = (id) => world_map_1.WORLD_ZONES.find(zone => zone.id === id && level >= zone.minLevel)?.id;
    const saved = usable(state.currentRegionId);
    if (saved)
        return saved;
    const activityZone = usable(state.activity?.environment?.zoneId);
    if (activityZone)
        return activityZone;
    return world_map_1.WORLD_ZONES[0].id;
}
/** Compatibility name retained for existing callers and tests. */
exports.currentCombatRegionId = currentRegionId;
