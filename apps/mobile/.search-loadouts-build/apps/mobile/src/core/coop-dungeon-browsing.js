"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presentCoopDungeon = presentCoopDungeon;
exports.filterCoopDungeons = filterCoopDungeons;
exports.groupCoopDungeonsByRegion = groupCoopDungeonsByRegion;
exports.coopTierEligibility = coopTierEligibility;
exports.validateCoopDungeonView = validateCoopDungeonView;
const artById = {
    EXP_001: { card: 'forest_thumbnail', hero: 'rootbound_hero' }, EXP_002: { card: 'forest_thumbnail' },
    EXP_003: { card: 'lava_thumbnail' }, EXP_004: { card: 'lava_thumbnail' },
    EXP_005: { card: 'ice_thumbnail' }, EXP_006: { card: 'ice_thumbnail' },
    EXP_007: { card: 'sunken_thumbnail' }, EXP_008: { card: 'sunken_thumbnail' },
};
const supportedRooms = new Set(['battle', 'elite', 'event', 'shrine', 'camp', 'treasure', 'merchant', 'echo', 'risk', 'boss']);
function presentCoopDungeon(source) {
    const art = artById[source.id], enabledRoomTypes = (source.enabledRoomTypes ?? []).filter(room => supportedRooms.has(room));
    return { ...source, artId: art?.card, heroArtId: art?.hero ?? art?.card, available: source.available ?? !source.lockedReason,
        description: source.description?.trim() || 'Authoritative description unavailable.', recommendedLevel: source.recommendedLevel ?? source.syncLevel,
        enabledRoomTypes, difficulties: [...new Set(source.difficulties ?? [])], preBossRoomMin: source.preBossRoomMin ?? 5, preBossRoomMax: source.preBossRoomMax ?? 5,
        estimatedMinutes: source.estimatedMinutes ?? { min: 6, max: 8 }, tierMinLevels: { 1: source.tierMinLevels?.[1] ?? source.minLevel, 2: source.tierMinLevels?.[2] ?? source.minLevel + 5, 3: source.tierMinLevels?.[3] ?? source.minLevel + 10, 4: source.tierMinLevels?.[4] ?? source.minLevel + 15, 5: source.tierMinLevels?.[5] ?? source.minLevel + 20 } };
}
function filterCoopDungeons(dungeons, filter) {
    return filter === 'available' ? dungeons.filter(dungeon => dungeon.available) : dungeons;
}
function groupCoopDungeonsByRegion(dungeons) {
    const groups = new Map();
    for (const dungeon of dungeons) {
        const region = dungeon.region?.trim() || 'Other';
        groups.set(region, [...(groups.get(region) ?? []), dungeon]);
    }
    return [...groups].map(([region, items]) => { const sorted = [...items].sort((a, b) => a.minLevel - b.minLevel || a.name.localeCompare(b.name)); return { region, dungeons: sorted, availableCount: sorted.filter(item => item.available).length }; });
}
function coopTierEligibility(dungeon, tier, currentLevel) {
    const requiredLevel = dungeon.tierMinLevels[tier];
    return { eligible: dungeon.available && dungeon.difficulties.includes(tier) && Number.isInteger(currentLevel) && currentLevel >= requiredLevel, requiredLevel };
}
function validateCoopDungeonView(view) {
    if (!view.id || !view.name || view.minLevel < 1 || view.recommendedLevel < view.minLevel)
        throw new Error('invalid_dungeon_projection');
    if (!view.available && !view.lockedReason)
        throw new Error('locked_reason_required');
    if (view.preBossRoomMin !== 5 || view.preBossRoomMax !== 5)
        throw new Error('invalid_route_room_range');
    if (view.estimatedMinutes.min !== 6 || view.estimatedMinutes.max !== 8)
        throw new Error('invalid_run_duration_target');
    if (view.difficulties.some(tier => view.tierMinLevels[tier] < view.minLevel))
        throw new Error('invalid_tier_level_requirement');
    if (view.difficulties.some(tier => tier < 1 || tier > 5))
        throw new Error('invalid_difficulty');
}
