"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../src/core/game");
const world_weather_1 = require("../src/core/world-weather");
const save_migrations_1 = require("../src/core/save-migrations");
function ok(value, message) { if (!value)
    throw new Error(message); }
const spring = Date.parse('2026-04-08T12:00:00Z'), winter = Date.parse('2026-12-08T12:00:00Z');
ok((0, world_weather_1.seasonAt)(spring) === 'spring' && (0, world_weather_1.seasonAt)(winter) === 'winter', 'Calendar seasons must rotate predictably');
const first = (0, world_weather_1.environmentForZone)('SILVERBROOK', spring), again = (0, world_weather_1.environmentForZone)('SILVERBROOK', spring);
ok(JSON.stringify(first) === JSON.stringify(again), 'Regional daily weather must be deterministic');
ok((0, world_weather_1.environmentForZone)('SUNSCAR', spring).zoneId === 'SUNSCAR' && (0, world_weather_1.environmentForZone)('ASHLANDS', winter).zoneId === 'ASHLANDS', 'Later regions must receive deterministic weather snapshots');
ok((0, world_weather_1.environmentForZone)('SILVERBROOK', spring).changesAtMs === Date.parse('2026-04-09T00:00:00Z'), 'Weather must roll at the next UTC day');
ok((0, world_weather_1.nextSeasonAt)(spring) === Date.parse('2026-06-01T00:00:00Z') && (0, world_weather_1.nextSeasonAt)(winter) === Date.parse('2027-03-01T00:00:00Z'), 'Season countdown boundaries must be exact');
ok(Object.keys(world_weather_1.SEASON_DEFINITIONS).length === 4 && Object.keys(world_weather_1.WEATHER_DEFINITIONS).length === 9, 'Every season and weather type needs a player-facing definition');
for (const season of Object.values(world_weather_1.SEASON_DEFINITIONS))
    ok(season.weather.length === 5 && season.weather.every(id => !!world_weather_1.WEATHER_DEFINITIONS[id]), `${season.name} needs a valid weighted weather pool`);
for (const seasonId of Object.keys(world_weather_1.SEASON_DEFINITIONS)) {
    const total = (0, world_weather_1.weatherChancesForSeason)(seasonId).reduce((sum, entry) => sum + entry.chance, 0);
    ok(Math.abs(total - 1) < .000001, `${seasonId} weather chances must total 100%`);
}
ok((0, world_weather_1.seasonEffect)('mining', 'spring').itemMultiplier === 1.08, 'Bloomtide gathering yield bonus missing');
ok((0, world_weather_1.seasonEffect)('combat', 'autumn').goldMultiplier === 1.08, 'Emberfall combat gold bonus missing');
ok((0, world_weather_1.weatherEffect)('fishing', 'rain').actionTimeMultiplier === .88 && (0, world_weather_1.weatherEffect)('fishing', 'rain').itemMultiplier === 1.1, 'Rain fishing bonuses missing');
ok((0, world_weather_1.weatherEffect)('combat', 'mist').dropChanceMultiplier === 1.12, 'Mist loot bonus missing');
const stacked = (0, world_weather_1.environmentEffect)('fishing', { seasonId: 'spring', weatherId: 'rain' });
ok(stacked.itemMultiplier === 1.08 * 1.1 && stacked.actionTimeMultiplier === .88, 'Season and weather effects must stack multiplicatively');
let state = (0, game_1.createCharacter)((0, game_1.newGame)(spring), 'WAYFINDER', 'Weather Tester');
state = { ...state, currentRegionId: 'SILVERBROOK', character: { ...state.character, level: 5 } };
state = (0, game_1.startGathering)(state, 'SILVERBROOK_SHOAL', spring);
const captured = (0, world_weather_1.environmentForActivity)(state.activity);
ok(captured.seasonId === 'spring' && captured.zoneId === 'SILVERBROOK', 'Starting an activity must snapshot its environment');
const elapsed = 3600, reward = (0, game_1.previewActivityReward)(state, spring + elapsed * 1000);
ok(reward.kills > 0 && reward.xp > 0, 'Captured weather must produce deterministic activity rewards');
const stillCaptured = (0, world_weather_1.environmentForActivity)(state.activity);
ok(JSON.stringify(stillCaptured) === JSON.stringify(captured), 'Active activity weather must remain captured until the activity changes');
const malformed = JSON.parse(JSON.stringify(state));
malformed.activity.environment = { seasonId: 'bad', weatherId: 'bad', zoneId: 4, capturedAtMs: 'never' };
ok((0, save_migrations_1.migrateSave)(malformed).activity?.environment === undefined, 'Malformed environment snapshots must safely fall back');
console.log(`PASS: ${captured.seasonName}, ${captured.weatherName}, ${reward.kills} actions/hour`);
