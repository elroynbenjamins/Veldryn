"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENT_SKINS_V22 = void 0;
exports.resolveCompletedSetSkinV22 = resolveCompletedSetSkinV22;
const equipment_types_v22_1 = require("./equipment-types-v22");
function resolveCompletedSetSkinV22(characterId, setId, pieces, history) { const setPieces = pieces.filter(p => p.setId === setId && p.requiredForSkin); const crafted = new Set(history.filter(h => h.characterId === characterId).map(h => h.pieceId)); const slots = new Set(); for (const p of setPieces)
    if (crafted.has(p.id))
        slots.add(p.slot); return equipment_types_v22_1.SKIN_REQUIRED_SLOTS.every(s => slots.has(s)); }
exports.EVENT_SKINS_V22 = { tierless: true, providesEquipmentStats: false, providesSetBonuses: false, characterBound: true };
