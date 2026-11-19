"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const policy_1 = require("../policy");
const ok = (v, m) => { if (!v)
    throw new Error(m); };
const loadoutRejection = (input) => { const result = (0, policy_1.validateCompanionLoadout)(input); return result.ok ? null : result.reason; };
for (const classId of Object.keys(policy_1.CLASS_ROLE)) {
    for (const companionId of ['UNIT_001', 'UNIT_002', 'UNIT_003']) {
        for (const combatMode of policy_1.CHARACTER_COMPANION_COMBAT_MODES) {
            ok((0, policy_1.validateCompanionLoadout)({ classId, companionId, ownedCompanionIds: [companionId], combatMode }).ok, `Owned ${companionId} rejected for ${classId} in ${combatMode}`);
        }
    }
}
ok(loadoutRejection({ classId: 'WAYFINDER', companionId: 'UNIT_002', ownedCompanionIds: [] }) === 'companion_not_owned', 'Locked companion server validation failed');
ok(loadoutRejection({ classId: 'WAYFINDER', companionId: 'UNIT_002', ownedCompanionIds: ['UNIT_002'], busyCompanionIds: ['UNIT_002'] }) === 'companion_busy', 'Busy companion server validation failed');
ok(loadoutRejection({ classId: 'WAYFINDER', companionId: 'UNKNOWN_COMPANION', ownedCompanionIds: ['UNKNOWN_COMPANION'] }) === 'unknown_companion', 'Unknown companion server validation failed');
ok(loadoutRejection({ classId: 'UNKNOWN_CLASS', companionId: 'UNIT_001', ownedCompanionIds: ['UNIT_001'] }) === 'unknown_character_class', 'Unknown class server validation failed');
ok((0, policy_1.sanitizePersistedCompanionLoadout)({ classId: 'WAYFINDER', companionId: 'UNIT_001', ownedCompanionIds: ['UNIT_001'] }) === 'UNIT_001', 'Same-role persisted loadout was cleared');
ok((0, policy_1.sanitizePersistedCompanionLoadout)({ classId: 'WAYFINDER', companionId: 'UNIT_001', ownedCompanionIds: [] }) === null, 'Unowned persisted loadout was not cleared');
ok((0, policy_1.companionLevelCap)('UNIT_001', 3) === 20 && (0, policy_1.companionLevelCap)('UNIT_004', 3) === 25 && (0, policy_1.companionLevelCap)('UNIT_007', 3) === 30 && (0, policy_1.companionLevelCap)('UNIT_012', 3) === 35, 'Rarity caps mismatch');
const normalized = (0, policy_1.validateProgressionSnapshot)('UNIT_004', { level: 99, xp: -1, ascensionTier: 1, bondLevel: 99, bondXp: -4 });
ok(normalized.level === 20 && normalized.bondLevel === 10 && normalized.xp === 0 && normalized.bondXp === 0, 'Progression sanitization failed');
console.log('companion-policy: PASS');
