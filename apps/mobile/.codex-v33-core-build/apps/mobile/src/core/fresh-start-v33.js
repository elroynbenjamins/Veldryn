"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isV33EquipmentPieceId = isV33EquipmentPieceId;
exports.isKnownV33EquipmentPieceId = isKnownV33EquipmentPieceId;
exports.invalidV33EquipmentIds = invalidV33EquipmentIds;
exports.isLegacyEquipmentSetItemId = isLegacyEquipmentSetItemId;
exports.applyFreshStartV33 = applyFreshStartV33;
const items_1 = require("../content/items");
const equipment_items_v33_1 = require("../content/equipment-items-v33");
/** IDs emitted by the v33 ten-slot catalog (P=primary, X=alternate path). */
function isV33EquipmentPieceId(id) {
    return /^T[1-9][PX]_\d{3}$/.test(id);
}
const knownV33PieceIds = new Set(equipment_items_v33_1.EQUIPMENT_ITEMS_V33.map(item => item.id));
function isKnownV33EquipmentPieceId(id) { return knownV33PieceIds.has(id); }
function invalidV33EquipmentIds(input) {
    const ids = [];
    const scan = (value) => { if (typeof value === 'string' && isV33EquipmentPieceId(value) && !isKnownV33EquipmentPieceId(value))
        ids.push(value); };
    const scanScope = (scope) => { if (!scope)
        return; Object.values(scope.character?.equipment ?? {}).forEach(scan); [...(scope.inventory?.stacks ?? []), ...(scope.bank?.stacks ?? []), ...(scope.overflow?.stacks ?? [])].forEach((stack) => scan(stack.itemId)); };
    scanScope(input);
    (input.otherCharacters ?? []).forEach(scanScope);
    return [...new Set(ids)];
}
/**
 * v33 deliberately starts equipment progression from a clean boundary. Keep
 * starter/novice gear, tools, materials and currencies, but discard older
 * catalog gear that carried an equipmentSetId. Unknown IDs are left alone so
 * this migration cannot destroy data owned by a newer client.
 */
function isLegacyEquipmentSetItemId(id) {
    try {
        const def = (0, items_1.itemDef)(id);
        return def.type === 'gear' && !!def.equipmentSetId && !isV33EquipmentPieceId(id);
    }
    catch {
        return false;
    }
}
function cleanStacks(stacks) {
    return stacks.filter(stack => !isLegacyEquipmentSetItemId(stack.itemId));
}
function cleanCharacter(character) {
    const equipment = { ...character.equipment };
    for (const [slot, id] of Object.entries(equipment)) {
        if (typeof id === 'string' && isLegacyEquipmentSetItemId(id))
            delete equipment[slot];
    }
    const savedLoadouts = character.savedLoadouts?.map(loadout => ({
        ...loadout,
        equipment: Object.fromEntries(Object.entries(loadout.equipment).filter(([, id]) => typeof id !== 'string' || !isLegacyEquipmentSetItemId(id))),
    }));
    const gearEnhancements = Object.fromEntries(Object.entries(character.gearEnhancements ?? {}).filter(([id]) => !isLegacyEquipmentSetItemId(id)));
    return {
        ...character,
        equipment,
        gearEnhancements,
        savedLoadouts,
        unlockedSkinIds: ['starting'],
        selectedSkinId: 'starting',
    };
}
function cleanScope(scope) {
    scope.character = cleanCharacter(scope.character);
    scope.inventory = { ...scope.inventory, stacks: cleanStacks(scope.inventory.stacks) };
    if (scope.bank)
        scope.bank = { ...scope.bank, stacks: cleanStacks(scope.bank.stacks) };
    scope.overflow = { ...scope.overflow, stacks: cleanStacks(scope.overflow.stacks) };
}
function applyFreshStartV33(input) {
    const state = { ...input };
    if (state.character)
        cleanScope(state);
    if (Array.isArray(state.otherCharacters)) {
        state.otherCharacters = state.otherCharacters.map((entry) => {
            const copy = { ...entry };
            if (copy.character)
                cleanScope(copy);
            return copy;
        });
    }
    return state;
}
