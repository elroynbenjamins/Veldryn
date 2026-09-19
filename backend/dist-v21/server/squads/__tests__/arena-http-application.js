"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const arena_application_1 = require("../arena-application");
const arena_http_application_1 = require("../arena-http-application");
const arena_persistence_1 = require("../arena-persistence");
const ok = (value, message) => { if (!value)
    throw new Error(message); };
const rows = ['IRONWARDEN', 'WAYFINDER', 'DAWNKEEPER'].map((classId, index) => ({ accountId: 'a', characterId: `c${index + 1}`, classId, loadoutId: 'active', revision: 1, characterLevel: 25, dungeonUnlocked: true, legalEquipment: true, stats: { characterId: `c${index + 1}`, classId, level: 25, displayName: `c${index + 1}`, maxHp: 180, attackPower: 70, healingPower: 40, defense: 55, accuracy: .9, evasion: .08, critChance: .1, haste: .05 }, abilities: [], capabilities: ['damage', 'threat', 'defense', 'restore', 'mitigate', 'utility'] }));
const service = new arena_application_1.ArenaApplicationService({ runtime: new arena_persistence_1.MemoryArenaRuntimeRepository(), loadouts: { getActiveArenaLoadout: (accountId, characterId) => rows.find(row => row.accountId === accountId && row.characterId === characterId) }, serverSecret: 'test-secret-0123456789' }), http = new arena_http_application_1.ArenaHttpApplication(service), formation = rows.map((row, index) => ({ characterId: row.characterId, position: ['front', 'middle', 'back'][index] }));
const run = async () => { const defense = await http.publishDefense('a', { requestId: 'publish-1234', formation, label: 'Tester' }, Date.UTC(2026, 8, 13)); ok(defense.published, 'defense publication'); let rejected = false; try {
    await http.publishDefense('a', { requestId: 'bad', formation: [formation[0], formation[0], formation[2]] }, Date.UTC(2026, 8, 13));
}
catch {
    rejected = true;
} ok(rejected, 'HTTP boundary accepted duplicate formation'); let boundary = false; try {
    await http.entry('   ', Date.UTC(2026, 8, 13));
}
catch {
    boundary = true;
} ok(boundary, 'blank account identity accepted'); boundary = false; try {
    await http.entry('a', Number.NaN);
}
catch {
    boundary = true;
} ok(boundary, 'invalid server time accepted'); console.log('arena HTTP application tests passed'); };
void run();
