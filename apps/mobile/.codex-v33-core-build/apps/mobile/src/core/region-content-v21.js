"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FROSTMARCH_DUNGEON_DEFINITIONS_V21 = exports.FROSTMARCH_ZONE_DEFINITIONS_V21 = void 0;
exports.isValidRegionProgressV21 = isValidRegionProgressV21;
exports.frostmarchCardsV21 = frostmarchCardsV21;
exports.validateFrostmarchCardsV21 = validateFrostmarchCardsV21;
exports.frostmarchProgressFromState = frostmarchProgressFromState;
exports.completionPercentV21 = completionPercentV21;
exports.formatRegionTimerV21 = formatRegionTimerV21;
exports.nextRegionalGoalV21 = nextRegionalGoalV21;
const whole = (value) => Number.isSafeInteger(value) && value >= 0;
function isValidRegionProgressV21(p) {
    if (!p || ![p.storyCompleted, p.storyTotal, p.sideQuestsCompleted, p.sideQuestsTotal, p.echoesCompleted, p.echoesTotal, p.dungeonsCompleted, p.dungeonsTotal, p.collectionEntries, p.collectionTotal, p.bossMasteryTier, p.bossMasteryMax].every(whole))
        return false;
    return p.storyTotal > 0 && p.sideQuestsTotal > 0 && p.echoesTotal > 0 && p.dungeonsTotal > 0 && p.collectionTotal > 0 && p.bossMasteryMax > 0 && p.storyCompleted <= p.storyTotal && p.sideQuestsCompleted <= p.sideQuestsTotal && p.echoesCompleted <= p.echoesTotal && p.dungeonsCompleted <= p.dungeonsTotal && p.collectionEntries <= p.collectionTotal && p.bossMasteryTier <= p.bossMasteryMax;
}
exports.FROSTMARCH_ZONE_DEFINITIONS_V21 = [
    { id: 'ZONE_011', name: 'Thawgate', levelRange: 'Lv 45–50', identity: 'Fortified northern gate and last dependable shelter.', activities: ['Frostiron'], hazards: ['black ice'] },
    { id: 'ZONE_012', name: 'Whitepine Reach', levelRange: 'Lv 48–56', identity: 'Snow forest of false trails and frozen treants.', activities: ['Whitepine Log', 'Rime Resin'], hazards: ['whiteout trails'] },
    { id: 'ZONE_013', name: 'Shiverlake', levelRange: 'Lv 52–60', identity: 'Frozen lake with under-ice ruins and resonant fish.', activities: ['Icefin', 'Bellfin Scale'], hazards: ['thin ice'] },
    { id: 'ZONE_014', name: 'Choir Caverns', levelRange: 'Lv 57–67', identity: 'Singing ice caves where casts must be interrupted in order.', activities: ['Rimeglass', 'Choir Bloom'], hazards: ['resonance stacks'] },
    { id: 'ZONE_015', name: 'Wyrmspine', levelRange: 'Lv 62–70', identity: 'High mountain lair of the Frost Wyrm.', activities: ['Wyrm Scale', 'Frozen Heart'], hazards: ['breath lines', 'ice prison'] },
];
exports.FROSTMARCH_DUNGEON_DEFINITIONS_V21 = [
    { id: 'COP_007', name: 'Whitepine Hunt', minLevel: 52, modeAvailability: 'live_and_q' },
    { id: 'COP_008', name: 'Shiverlake Descent', minLevel: 58, modeAvailability: 'live_and_q' },
    { id: 'COP_009', name: 'Choir Caverns', minLevel: 64, modeAvailability: 'live_and_q' },
];
function frostmarchCardsV21(level) { const safeLevel = Number.isFinite(level) ? level : 0; return { zones: exports.FROSTMARCH_ZONE_DEFINITIONS_V21.map(zone => ({ ...zone, locked: safeLevel < Number(zone.levelRange.match(/\d+/)?.[0] ?? 45) })), dungeons: exports.FROSTMARCH_DUNGEON_DEFINITIONS_V21.map(dungeon => ({ ...dungeon, locked: safeLevel < dungeon.minLevel })) }; }
function validateFrostmarchCardsV21() { const errors = []; if (exports.FROSTMARCH_ZONE_DEFINITIONS_V21.length !== 5)
    errors.push('zones'); if (exports.FROSTMARCH_DUNGEON_DEFINITIONS_V21.map(v => v.id).join(',') !== 'COP_007,COP_008,COP_009')
    errors.push('dungeons'); if (new Set(exports.FROSTMARCH_ZONE_DEFINITIONS_V21.map(v => v.id)).size !== exports.FROSTMARCH_ZONE_DEFINITIONS_V21.length)
    errors.push('duplicate_zone_ids'); if (new Set(exports.FROSTMARCH_DUNGEON_DEFINITIONS_V21.map(v => v.id)).size !== exports.FROSTMARCH_DUNGEON_DEFINITIONS_V21.length)
    errors.push('duplicate_dungeon_ids'); for (const zone of exports.FROSTMARCH_ZONE_DEFINITIONS_V21) {
    if (zone.hazards.length === 0 || zone.activities.length === 0)
        errors.push(`${zone.id}:metadata`);
    if (!/^Lv \d+[–-]\d+$/.test(zone.levelRange))
        errors.push(`${zone.id}:level_range`);
} for (const dungeon of exports.FROSTMARCH_DUNGEON_DEFINITIONS_V21) {
    if (!Number.isSafeInteger(dungeon.minLevel) || dungeon.minLevel < 1)
        errors.push(`${dungeon.id}:min_level`);
} return errors; }
function frostmarchProgressFromState(state) {
    const source = state.regionalProgressById?.REG_003 ?? {};
    const bounded = (value, max) => { const n = Number(value ?? 0); return Number.isFinite(n) ? Math.min(max, Math.max(0, Math.floor(n))) : 0; };
    const collectionFromState = state.unlockedMonsterIds.filter(id => /^FRMON_\d{3}$/.test(id)).length;
    const masteryFromState = state.defeatedBossIds.includes('BOSS_003') ? 1 : 0;
    return { storyCompleted: bounded(source.storyCompleted, 10), storyTotal: 10, sideQuestsCompleted: bounded(source.sideQuestsCompleted, 8), sideQuestsTotal: 8, echoesCompleted: bounded(source.echoesCompleted, 4), echoesTotal: 4, dungeonsCompleted: bounded(source.dungeonsCompleted, 3), dungeonsTotal: 3, collectionEntries: Math.min(16, Math.max(bounded(source.collectionEntries, 16), collectionFromState)), collectionTotal: 16, bossMasteryTier: Math.min(4, Math.max(bounded(source.bossMasteryTier, 4), masteryFromState)), bossMasteryMax: 4 };
}
function completionPercentV21(p) { if (!isValidRegionProgressV21(p))
    return 0; const a = [p.storyCompleted / p.storyTotal, p.sideQuestsCompleted / p.sideQuestsTotal, p.echoesCompleted / p.echoesTotal, p.dungeonsCompleted / p.dungeonsTotal, p.collectionEntries / p.collectionTotal, p.bossMasteryTier / p.bossMasteryMax]; return Math.round(a.reduce((x, y) => x + y, 0) / a.length * 100); }
function formatRegionTimerV21(seconds) { const s = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0; const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; }
function nextRegionalGoalV21(p) { if (!isValidRegionProgressV21(p))
    return 'Regional progress unavailable'; if (p.storyCompleted < p.storyTotal)
    return 'Continue regional story'; if (p.sideQuestsCompleted < p.sideQuestsTotal)
    return 'Complete regional side quests'; if (p.echoesCompleted < p.echoesTotal)
    return 'Resolve remaining Echo conditions'; if (p.dungeonsCompleted < p.dungeonsTotal)
    return 'Complete regional co-op content'; if (p.collectionEntries < p.collectionTotal)
    return 'Fill the regional collection book'; if (p.bossMasteryTier < p.bossMasteryMax)
    return 'Advance regional boss mastery'; return 'Region complete'; }
