"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENT_EXPEDITIONS = void 0;
exports.eventExpeditionPreviews = eventExpeditionPreviews;
exports.EVENT_EXPEDITIONS = Object.freeze([
    { id: 'EVENT_SUNCREST_SHATTERED_ISLES', eventName: 'Suncrest Games', name: 'The Shattered Isles', description: 'Island arenas, pirate camps and sun shrines form a summer expedition route.', routeHighlights: ['Coastal Ruins', 'Sun Shrine', 'Pirate Camp'], finalBoss: 'Aureon, First Champion', minLevel: 45, rewardMarks: 96, startMonth: 6, startDay: 1, endMonth: 8, endDay: 31 },
    { id: 'EVENT_STARFALL_ASTRAL_RIFT', eventName: 'Starfall Convergence', name: 'Astral Rift Expedition', description: 'Cross meteor fields and celestial ruins as instability builds toward the rift nexus.', routeHighlights: ['Meteor Field', 'Star Shrine', 'Rift Gate'], finalBoss: 'The Constellation Eater', minLevel: 70, rewardMarks: 118, startMonth: 9, startDay: 1, endMonth: 9, endDay: 30 },
]);
function utcDay(year, month, day) { return Date.UTC(year, month - 1, day); }
function active(definition, nowMs) {
    const now = new Date(nowMs), year = now.getUTCFullYear(), day = utcDay(year, now.getUTCMonth() + 1, now.getUTCDate());
    return day >= utcDay(year, definition.startMonth, definition.startDay) && day <= utcDay(year, definition.endMonth, definition.endDay);
}
/** The schedule is authoritative, but routes remain preview-only until their
 * server start/settlement transport is deployed. */
function eventExpeditionPreviews(nowMs) {
    return exports.EVENT_EXPEDITIONS.map(definition => ({ ...definition, status: 'preview', scheduled: active(definition, nowMs) }));
}
