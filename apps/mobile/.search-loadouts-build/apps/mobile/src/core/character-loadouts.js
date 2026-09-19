"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CHARACTER_LOADOUT_SLOT_COUNT = void 0;
exports.normalizeCharacterLoadouts = normalizeCharacterLoadouts;
exports.saveCharacterLoadout = saveCharacterLoadout;
exports.renameCharacterLoadout = renameCharacterLoadout;
exports.deleteCharacterLoadout = deleteCharacterLoadout;
exports.applyCharacterLoadout = applyCharacterLoadout;
const items_1 = require("../content/items");
const combat_companions_1 = require("../content/combat-companions");
const game_1 = require("./game");
const combat_companions_2 = require("./combat-companions");
const loadout_storage_1 = require("./loadout-storage");
exports.CHARACTER_LOADOUT_SLOT_COUNT = 3;
const slots = ['weapon', 'offhand', 'helmet', 'chest', 'legs', 'boots', 'gloves', 'cape', 'amulet', 'ring'];
const cleanName = (value, fallback) => typeof value === 'string' && value.trim() ? value.trim().slice(0, 28) : fallback;
function normalizeCharacterLoadouts(value, classId) { if (!Array.isArray(value))
    return []; const bySlot = new Map(); value.slice(0, 12).forEach((raw, index) => { if (!raw || typeof raw !== 'object' || raw.classId !== classId)
    return; const slotIndex = Number.isInteger(raw.slotIndex) && raw.slotIndex >= 0 && raw.slotIndex < exports.CHARACTER_LOADOUT_SLOT_COUNT ? raw.slotIndex : index; if (slotIndex < 0 || slotIndex >= exports.CHARACTER_LOADOUT_SLOT_COUNT || bySlot.has(slotIndex))
    return; const equipment = {}; for (const slot of slots) {
    const id = raw.equipment?.[slot];
    const def = typeof id === 'string' ? items_1.ITEMS.find(item => item.id === id) : undefined;
    if (def?.type === 'gear' && def.slot === slot && (!def.classRestriction || def.classRestriction === classId))
        equipment[slot] = id;
} const foodId = typeof raw.foodId === 'string' && items_1.ITEMS.some(item => item.id === raw.foodId && item.type === 'food') ? raw.foodId : undefined; const companionId = typeof raw.companionId === 'string' && combat_companions_1.COMBAT_COMPANIONS.some(def => def.id === raw.companionId) ? raw.companionId : undefined; bySlot.set(slotIndex, { id: typeof raw.id === 'string' && raw.id ? raw.id : `loadout-${slotIndex + 1}`, slotIndex, name: cleanName(raw.name, `Loadout ${slotIndex + 1}`), classId: classId, equipment, foodId, companionId, createdAtMs: Number.isFinite(raw.createdAtMs) ? raw.createdAtMs : 0, updatedAtMs: Number.isFinite(raw.updatedAtMs) ? raw.updatedAtMs : 0 }); }); return [...bySlot.values()].sort((a, b) => a.slotIndex - b.slotIndex); }
function saveCharacterLoadout(state, index, name, nowMs = Date.now()) { if (!state.character)
    throw new Error('Create a character first.'); if (index < 0 || index >= exports.CHARACTER_LOADOUT_SLOT_COUNT)
    throw new Error('Invalid loadout slot.'); const current = normalizeCharacterLoadouts(state.character.savedLoadouts, state.character.classId), existing = current.find(entry => entry.slotIndex === index), preset = { id: existing?.id ?? `loadout-${index + 1}`, slotIndex: index, name: cleanName(name, existing?.name ?? `Loadout ${index + 1}`), classId: state.character.classId, equipment: { ...state.character.equipment }, foodId: state.character.equippedFoodId, companionId: state.character.equippedCombatCompanionId, createdAtMs: existing?.createdAtMs ?? nowMs, updatedAtMs: nowMs }; return { ...state, character: { ...state.character, savedLoadouts: [...current.filter(entry => entry.slotIndex !== index), preset].sort((a, b) => a.slotIndex - b.slotIndex) } }; }
function renameCharacterLoadout(state, id, name, nowMs = Date.now()) { if (!state.character)
    throw new Error('Create a character first.'); const list = normalizeCharacterLoadouts(state.character.savedLoadouts, state.character.classId), index = list.findIndex(entry => entry.id === id); if (index < 0)
    throw new Error('Loadout not found.'); const next = [...list]; next[index] = { ...next[index], name: cleanName(name, next[index].name), updatedAtMs: nowMs }; return { ...state, character: { ...state.character, savedLoadouts: next } }; }
function deleteCharacterLoadout(state, id) { return !state.character ? state : { ...state, character: { ...state.character, savedLoadouts: normalizeCharacterLoadouts(state.character.savedLoadouts, state.character.classId).filter(entry => entry.id !== id) } }; }
function applyCharacterLoadout(state, id) { if (!state.character)
    throw new Error('Create a character first.'); if (state.activity?.kind === 'combat')
    throw new Error('Stop combat before changing loadouts.'); const preset = normalizeCharacterLoadouts(state.character.savedLoadouts, state.character.classId).find(entry => entry.id === id); if (!preset)
    throw new Error('Loadout not found.'); for (const slot of slots) {
    const wanted = preset.equipment[slot];
    if (!wanted)
        continue;
    const def = (0, items_1.itemDef)(wanted);
    if (def.type !== 'gear' || def.slot !== slot || def.classRestriction && def.classRestriction !== state.character.classId)
        throw new Error(`${def.name} is not valid for this loadout.`);
} let planned; try {
    planned = (0, loadout_storage_1.planLoadoutStorage)({ inventory: state.inventory.stacks, bank: state.bank.stacks, inventoryCapacity: state.inventory.capacity, bankCapacity: state.bank.capacity, currentEquipment: state.character.equipment, desiredEquipment: preset.equipment });
}
catch (error) {
    if (error instanceof Error && error.message.startsWith('MISSING:'))
        throw new Error(`${(0, items_1.itemDef)(error.message.slice(8)).name} is not equipped, in Inventory, or in Bank.`);
    throw error;
} if (preset.foodId && !planned.inventory.some(entry => entry.itemId === preset.foodId && entry.quantity > 0))
    throw new Error(`${(0, items_1.itemDef)(preset.foodId).name} must be carried in Inventory before this loadout can use it.`); let next = { ...state, inventory: { ...state.inventory, stacks: planned.inventory }, bank: { ...state.bank, stacks: planned.bank }, character: { ...state.character, equipment: preset.equipment, equippedFoodId: preset.foodId } }; next = preset.companionId ? (0, combat_companions_2.equipCombatCompanion)(next, preset.companionId) : (0, combat_companions_2.unequipCombatCompanion)(next); next.character.currentHp = Math.min(next.character.currentHp, (0, game_1.effectiveStats)(next).hp); return next; }
