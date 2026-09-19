"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const coop_dungeon_browsing_1 = require("../src/core/coop-dungeon-browsing");
const coop_event_expeditions_1 = require("../src/core/coop-event-expeditions");
const i18n_1 = require("../src/i18n");
function equal(actual, expected, message) { if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(`${message}: ${JSON.stringify(actual)}`); }
const rootbound = (0, coop_dungeon_browsing_1.presentCoopDungeon)({ id: 'EXP_001', name: 'Rootbound Vault', minLevel: 15, recommendedLevel: 25, syncLevel: 25, available: true, enabledRoomTypes: ['battle', 'elite', 'camp', 'boss'], difficulties: [1, 2, 3, 4, 5], preBossRoomMin: 5, preBossRoomMax: 5 });
(0, coop_dungeon_browsing_1.validateCoopDungeonView)(rootbound);
equal([rootbound.id, rootbound.name, rootbound.minLevel, rootbound.recommendedLevel], ['EXP_001', 'Rootbound Vault', 15, 25], 'canonical EXP_001 changed');
equal(rootbound.heroArtId, 'rootbound_hero', 'Rootbound hero art mapping changed');
equal(rootbound.estimatedMinutes, { min: 6, max: 8 }, 'launch duration target changed');
equal(rootbound.tierMinLevels, { 1: 15, 2: 20, 3: 25, 4: 30, 5: 35 }, 'tier requirements changed');
equal((0, coop_dungeon_browsing_1.coopTierEligibility)(rootbound, 3, 25), { eligible: true, requiredLevel: 25 }, 'eligible tier should open');
equal((0, coop_dungeon_browsing_1.coopTierEligibility)(rootbound, 4, 25), { eligible: false, requiredLevel: 30 }, 'under-level tier should fail closed');
const unknown = (0, coop_dungeon_browsing_1.presentCoopDungeon)({ id: 'EXP_UNKNOWN', name: 'A deliberately very long authoritative expedition title that must remain live text', minLevel: 1, syncLevel: 1, available: true, enabledRoomTypes: ['battle', 'forge'], difficulties: [1] });
equal(unknown.artId, undefined, 'unknown art must use fallback');
equal(unknown.enabledRoomTypes, ['battle'], 'unsupported rooms must be hidden');
const locked = (0, coop_dungeon_browsing_1.presentCoopDungeon)({ id: 'EXP_LOCKED', name: 'Locked', minLevel: 50, syncLevel: 60, available: false, lockedReason: 'Requires level 50', difficulties: [1] });
(0, coop_dungeon_browsing_1.validateCoopDungeonView)(locked);
equal((0, coop_dungeon_browsing_1.filterCoopDungeons)([rootbound, locked], 'available').map(item => item.id), ['EXP_001'], 'available filter failed');
equal((0, coop_dungeon_browsing_1.groupCoopDungeonsByRegion)([rootbound, locked]).map(group => [group.region, group.availableCount, group.dungeons.length]), [['Other', 1, 2]], 'regional grouping failed');
const sortedRegion = (0, coop_dungeon_browsing_1.groupCoopDungeonsByRegion)([(0, coop_dungeon_browsing_1.presentCoopDungeon)({ id: 'LATE', name: 'Late', region: 'Sunscar', minLevel: 36, syncLevel: 45, available: true }), (0, coop_dungeon_browsing_1.presentCoopDungeon)({ id: 'EARLY', name: 'Early', region: 'Sunscar', minLevel: 32, syncLevel: 45, available: true })]);
equal(sortedRegion[0].dungeons.map(item => item.id), ['EARLY', 'LATE'], 'regional progression must sort by minimum level');
(0, coop_event_expeditions_1.validateCoopEventExpeditionPreview)({ id: 'EVENT_TEST', eventName: 'Suncrest Games', name: 'The Shattered Isles', description: 'A seasonal route.', routeHighlights: ['Coastal Ruins', 'Sun Shrine', 'Pirate Camp'], finalBoss: 'Aureon, First Champion', status: 'preview' });
let eventFailure = '';
try {
    (0, coop_event_expeditions_1.validateCoopEventExpeditionPreview)({ id: 'EVENT_BAD', eventName: 'Starfall', name: 'Rift', description: 'Bad duplicate route.', routeHighlights: ['Rift Gate', 'Rift Gate', 'Boss Nexus'], finalBoss: 'The Constellation Eater', status: 'preview' });
}
catch (error) {
    eventFailure = error instanceof Error ? error.message : String(error);
}
equal(eventFailure, 'invalid_event_route_highlights', 'event previews require three distinct route highlights');
let failure = '';
try {
    (0, coop_dungeon_browsing_1.validateCoopDungeonView)((0, coop_dungeon_browsing_1.presentCoopDungeon)({ id: 'EXP_BAD', name: 'Bad lock', minLevel: 2, syncLevel: 2, available: false, difficulties: [1] }));
}
catch (error) {
    failure = error instanceof Error ? error.message : String(error);
}
equal(failure, 'locked_reason_required', 'locked reason must fail closed');
for (const language of i18n_1.SUPPORTED_LANGUAGES)
    equal((0, i18n_1.translatedCoopMessageCount)(language), i18n_1.COOP_MESSAGE_COUNT, `${language} co-op catalog incomplete`);
console.log(`co-op dungeon browsing OK (${i18n_1.SUPPORTED_LANGUAGES.length} languages, ${i18n_1.COOP_MESSAGE_COUNT} messages each)`);
