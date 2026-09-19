"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const policy_1 = require("../policy");
const ok = (v, m) => { if (!v)
    throw new Error(m); };
for (const [classId, companionId] of [['WAYFINDER', 'UNIT_001'], ['IRONWARDEN', 'UNIT_002'], ['DAWNKEEPER', 'UNIT_003']])
    ok((0, policy_1.validateCompanionLoadout)({ classId, companionId, ownedCompanionIds: [companionId] }).ok === false, 'Same-role server validation failed');
ok((0, policy_1.validateCompanionLoadout)({ classId: 'WAYFINDER', companionId: 'UNIT_002', ownedCompanionIds: ['UNIT_002'] }).ok, 'Cross-role server validation failed');
ok((0, policy_1.validateCompanionLoadout)({ classId: 'WAYFINDER', companionId: 'UNIT_002', ownedCompanionIds: [] }).ok === false, 'Locked companion server validation failed');
ok((0, policy_1.sanitizePersistedCompanionLoadout)({ classId: 'WAYFINDER', companionId: 'UNIT_001', ownedCompanionIds: ['UNIT_001'] }) === null, 'Invalid persisted loadout was not cleared');
ok((0, policy_1.companionLevelCap)('UNIT_001', 3) === 20 && (0, policy_1.companionLevelCap)('UNIT_004', 3) === 25 && (0, policy_1.companionLevelCap)('UNIT_007', 3) === 30 && (0, policy_1.companionLevelCap)('UNIT_012', 3) === 35, 'Rarity caps mismatch');
const normalized = (0, policy_1.validateProgressionSnapshot)('UNIT_004', { level: 99, xp: -1, ascensionTier: 1, bondLevel: 99, bondXp: -4 });
ok(normalized.level === 20 && normalized.bondLevel === 10 && normalized.xp === 0 && normalized.bondXp === 0, 'Progression sanitization failed');
console.log('companion-policy: PASS');
