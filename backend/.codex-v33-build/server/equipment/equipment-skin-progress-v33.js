"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.skinProgressV33 = skinProgressV33;
const equipment_catalog_v33_1 = require("./equipment-catalog-v33");
const equipment_types_v33_1 = require("./equipment-types-v33");
function skinProgressV33(setId, craftedPieceIds, unlockedSkinSetIds = []) {
    const set = equipment_catalog_v33_1.EQUIPMENT_SETS_V33.find(entry => entry.id === setId);
    if (!set)
        throw new Error('unknown_set');
    const crafted = new Set(craftedPieceIds), pieces = equipment_catalog_v33_1.EQUIPMENT_PIECES_V33.filter(piece => piece.setId === setId && crafted.has(piece.id));
    const slots = new Set(pieces.map(piece => piece.slot));
    const missingSlots = equipment_types_v33_1.SKIN_REQUIRED_SLOTS_V33.filter(slot => !slots.has(slot));
    return { setId, crafted: 10 - missingSlots.length, required: 10, missingSlots, complete: missingSlots.length === 0, unlocked: unlockedSkinSetIds.includes(setId) };
}
