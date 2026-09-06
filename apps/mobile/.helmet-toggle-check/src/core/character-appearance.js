"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.noviceSetProgress = noviceSetProgress;
exports.resolveCharacterAppearance = resolveCharacterAppearance;
const classes_1 = require("../content/classes");
const novice_sets_1 = require("../content/novice-sets");
const visibleSlots = ['weapon', 'offhand', 'helmet', 'chest', 'gloves', 'boots', 'legs', 'cape'];
function noviceSetProgress(state) {
    const character = state.character;
    const set = (0, novice_sets_1.noviceSetFor)(character.classId);
    const pieces = set.slots.map(slot => {
        const id = (0, novice_sets_1.noviceItemId)(character.classId, slot), equipped = character.equipment[slot] === id;
        return { slot, id, equipped, crafted: character.craftedNoviceItemIds?.includes(id) ?? false,
            owned: equipped || [...state.inventory.stacks, ...state.bank.stacks].some(stack => stack.itemId === id && stack.quantity > 0) };
    });
    return { set, pieces, crafted: pieces.filter(piece => piece.crafted).length, equipped: pieces.filter(piece => piece.equipped).length, canEquip: pieces.every(piece => piece.owned), unlocked: pieces.every(piece => piece.crafted) };
}
function resolveCharacterAppearance(state) {
    const character = state.character;
    if (!character)
        return 'mixed';
    const progress = noviceSetProgress(state);
    if (progress.pieces.every(piece => piece.equipped) && visibleSlots.every(slot => progress.set.slots.includes(slot) || !character.equipment[slot]))
        return 'first-crafted';
    const start = classes_1.CLASSES.find(def => def.id === character.classId).starterEquipment.weapon;
    if (character.equipment.weapon === start && visibleSlots.every(slot => slot === 'weapon' || !character.equipment[slot]))
        return 'starting';
    return 'mixed';
}
