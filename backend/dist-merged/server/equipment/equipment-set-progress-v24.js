"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setCraftProgressV24 = setCraftProgressV24;
const equipment_catalog_v23_1 = require("./equipment-catalog-v23");
const equipment_types_v22_1 = require("./equipment-types-v22");
function setCraftProgressV24(className, craftedPieceIds, completedSetIds) { const crafted = new Set(craftedPieceIds), unlocked = new Set(completedSetIds); return equipment_catalog_v23_1.EQUIPMENT_SETS_V23.filter(s => s.className === className).map(s => { const pieces = equipment_catalog_v23_1.EQUIPMENT_PIECES_V23.filter(p => p.setId === s.id), slots = new Set(pieces.filter(p => crafted.has(p.id)).map(p => p.slot)), missing = equipment_types_v22_1.SET_PIECE_SLOTS.filter(slot => !slots.has(slot)); return { setId: s.id, setName: s.name, tier: s.tier, crafted: equipment_types_v22_1.SET_PIECE_SLOTS.length - missing.length, required: equipment_types_v22_1.SET_PIECE_SLOTS.length, missingSlots: missing, unlocked: missing.length === 0 }; }); }
