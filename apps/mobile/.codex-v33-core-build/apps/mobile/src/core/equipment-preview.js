"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.previewEquipment = previewEquipment;
const items_1 = require("../content/items");
/** Returns an equipment comparison state without mutating or consuming items. */
function previewEquipment(state, id) {
    if (!state.character)
        throw new Error('No character');
    const item = (0, items_1.itemDef)(id);
    if (item.type !== 'gear' || !item.slot)
        throw new Error('Only equipment can be previewed');
    if (item.classRestriction && item.classRestriction !== state.character.classId)
        throw new Error('This equipment belongs to another class');
    return { ...state, character: { ...state.character, equipment: { ...state.character.equipment, [item.slot]: id } } };
}
