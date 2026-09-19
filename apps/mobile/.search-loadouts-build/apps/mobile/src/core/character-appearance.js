"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.noviceSetProgress = noviceSetProgress;
const novice_sets_1 = require("../content/novice-sets");
/** Gameplay equipment progress only. Character artwork is selected independently. */
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
