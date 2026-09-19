"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextRegionUnlock = nextRegionUnlock;
exports.regionEncounters = regionEncounters;
exports.encounterUnlocked = encounterUnlocked;
const monsters_1 = require("../content/monsters");
const world_map_1 = require("../content/world-map");
function nextRegionUnlock(level) {
    return world_map_1.WORLD_ZONES.filter(zone => zone.minLevel > level).sort((a, b) => a.minLevel - b.minLevel)[0];
}
function regionEncounters(state, zoneName, query, availableOnly) {
    const search = query.trim().toLowerCase();
    return monsters_1.MONSTERS.filter(monster => monster.zone === zoneName && monster.name.toLowerCase().includes(search) && (!availableOnly || encounterUnlocked(state, monster)));
}
function encounterUnlocked(state, monster) {
    const region = world_map_1.WORLD_ZONES.find(zone => zone.name === monster.zone);
    if (!state.character || state.character.level < (region?.minLevel ?? 1))
        return false;
    if (monster.boss)
        return state.character.level >= monster.unlockLevel && state.quests.find(q => q.questId === 'QST_014')?.status !== 'locked';
    return state.unlockedMonsterIds.includes(monster.id);
}
