"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const arena_snapshots_1 = require("../arena-snapshots");
const ok = (value, message) => { if (!value)
    throw new Error(message); };
const record = (accountId, characterId, classId) => ({ accountId, characterId, classId, loadoutId: 'active', revision: 1, characterLevel: 25, dungeonUnlocked: true, legalEquipment: true, stats: { characterId, classId, level: 25, displayName: characterId, maxHp: 180, attackPower: 70, healingPower: 40, defense: 55, accuracy: .9, evasion: .08, critChance: .1, haste: .05 }, abilities: [], capabilities: ['damage', 'threat', 'defense', 'restore', 'mitigate', 'utility'] });
const rows = [record('a', 'c1', 'IRONWARDEN'), record('a', 'c2', 'WAYFINDER'), record('a', 'c3', 'DAWNKEEPER')];
const repo = { getActiveArenaLoadout: (accountId, characterId) => rows.find(row => row.accountId === accountId && row.characterId === characterId) };
const snapshot = (0, arena_snapshots_1.freezeArenaSquad)({ accountId: 'a', squadVersion: 2, formationVersion: 4, rating: 1000, selections: [{ characterId: 'c1', position: 'front' }, { characterId: 'c2', position: 'middle' }, { characterId: 'c3', position: 'back' }], repository: repo });
ok(snapshot.snapshotHash?.length === 64, 'snapshot hash missing');
ok(snapshot.fighters.every(fighter => fighter.role && fighter.stats), 'server snapshot fields missing');
ok((0, arena_snapshots_1.arenaPowerBand)(snapshot) >= 1, 'power band missing');
let rejected = false;
try {
    (0, arena_snapshots_1.freezeArenaSquad)({ ...({ accountId: 'a', squadVersion: 2, formationVersion: 4, rating: 1000, selections: [{ characterId: 'c1', position: 'front' }, { characterId: 'c1', position: 'middle' }, { characterId: 'c3', position: 'back' }], repository: repo }) });
}
catch {
    rejected = true;
}
ok(rejected, 'duplicate Arena character was accepted');
console.log('arena snapshot tests passed');
