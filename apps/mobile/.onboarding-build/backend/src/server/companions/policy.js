"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canEquipCompanion = exports.STAGE_CAPS = exports.RARITY_MAX_LEVEL = exports.COMPANION_RARITY = exports.COMPANION_ROLE = exports.CLASS_ROLE = void 0;
exports.validateCompanionLoadout = validateCompanionLoadout;
exports.sanitizePersistedCompanionLoadout = sanitizePersistedCompanionLoadout;
exports.companionLevelCap = companionLevelCap;
exports.validateProgressionSnapshot = validateProgressionSnapshot;
const content_1 = require("./content");
exports.CLASS_ROLE = { IRONWARDEN: 'tank', BASTION: 'tank', DREADGUARD: 'tank', DAWNKEEPER: 'support', STONECALLER: 'support', WAYFINDER: 'damage', RAVAGER: 'damage', HEXWEAVER: 'damage', KNIFE_DANCER: 'damage' };
exports.COMPANION_ROLE = Object.fromEntries(content_1.COMPANION_SERVER_DEFINITIONS.map(x => [x.id, x.role]));
exports.COMPANION_RARITY = Object.fromEntries(content_1.COMPANION_SERVER_DEFINITIONS.map(x => [x.id, x.rarity]));
exports.RARITY_MAX_LEVEL = content_1.COMPANION_RARITY_MAX_LEVEL;
exports.STAGE_CAPS = { standard: [10, 20, 20, 20], rare: [10, 20, 25, 25], elite: [10, 20, 25, 30], prestige: [10, 20, 25, 35] };
const canEquipCompanion = (characterRole, companionRole) => characterRole !== companionRole;
exports.canEquipCompanion = canEquipCompanion;
function validateCompanionLoadout(input) {
    if (!input.companionId)
        return { ok: true, companionId: null };
    const role = exports.COMPANION_ROLE[input.companionId];
    if (!role)
        return { ok: false, reason: 'unknown_companion' };
    if (!input.ownedCompanionIds.includes(input.companionId))
        return { ok: false, reason: 'companion_not_owned' };
    if (input.busyCompanionIds?.includes(input.companionId))
        return { ok: false, reason: 'companion_busy' };
    const characterRole = exports.CLASS_ROLE[input.classId];
    if (!characterRole)
        return { ok: false, reason: 'unknown_character_class' };
    if (!(0, exports.canEquipCompanion)(characterRole, role))
        return { ok: false, reason: 'same_role_restricted' };
    return { ok: true, companionId: input.companionId };
}
function sanitizePersistedCompanionLoadout(input) { const checked = validateCompanionLoadout(input); return checked.ok ? checked.companionId : null; }
function companionLevelCap(companionId, ascensionTier) { const rarity = exports.COMPANION_RARITY[companionId]; if (!rarity)
    throw new Error('unknown_companion'); const tier = Math.max(0, Math.min(3, Math.floor(ascensionTier))); return Math.min(exports.RARITY_MAX_LEVEL[rarity], exports.STAGE_CAPS[rarity][tier]); }
function validateProgressionSnapshot(companionId, input) {
    const rarity = exports.COMPANION_RARITY[companionId];
    if (!rarity)
        throw new Error('unknown_companion');
    const ascensionTier = Math.max(0, Math.min(3, Math.floor(input.ascensionTier))), cap = companionLevelCap(companionId, ascensionTier);
    return { level: Math.max(1, Math.min(cap, exports.RARITY_MAX_LEVEL[rarity], Math.floor(input.level))), xp: Math.max(0, Math.floor(input.xp)), ascensionTier, bondLevel: Math.max(1, Math.min(10, Math.floor(input.bondLevel))), bondXp: Math.max(0, Math.floor(input.bondXp)), selectedTechniqueId: input.selectedTechniqueId };
}
