"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EQUIPMENT_API_NAMES_V33 = void 0;
exports.dispatchEquipmentApiV33 = dispatchEquipmentApiV33;
const equipment_mobile_api_v33_1 = require("./equipment-mobile-api-v33");
const equipment_catalog_v33_1 = require("./equipment-catalog-v33");
exports.EQUIPMENT_API_NAMES_V33 = ['get_equipment_set_detail_v33', 'get_equipment_crafting_detail_v33', 'get_equipment_loadout_summary_v33'];
function assertText(value, label) {
    if (typeof value !== 'string' || !value.trim())
        throw new Error(`invalid_${label}`);
}
function validateEquipped(equipped) {
    const slots = new Set();
    const pieces = new Map(equipment_catalog_v33_1.EQUIPMENT_PIECES_V33.map(piece => [piece.id, piece]));
    for (const entry of equipped) {
        assertText(entry.pieceId, 'piece_id');
        assertText(entry.setId, 'set_id');
        assertText(entry.slot, 'slot');
        if (slots.has(entry.slot))
            throw new Error(`duplicate_equipped_slot:${entry.slot}`);
        const piece = pieces.get(entry.pieceId);
        if (!piece || piece.setId !== entry.setId || piece.slot !== entry.slot)
            throw new Error(`invalid_equipped_piece:${entry.pieceId}`);
        slots.add(entry.slot);
    }
}
function validateCraftedPieceIds(setId, ids) {
    const setPieceIds = new Set(equipment_catalog_v33_1.EQUIPMENT_PIECES_V33.filter(piece => piece.setId === setId).map(piece => piece.id));
    const seen = new Set();
    for (const id of ids) {
        assertText(id, 'crafted_piece_id');
        if (seen.has(id))
            throw new Error(`duplicate_crafted_piece:${id}`);
        if (!setPieceIds.has(id))
            throw new Error(`invalid_crafted_piece:${id}`);
        seen.add(id);
    }
}
function dispatchEquipmentApiV33(request) {
    if (!request || typeof request !== 'object')
        throw new Error('invalid_equipment_request');
    switch (request.name) {
        case 'get_equipment_set_detail_v33':
            assertText(request.setId, 'set_id');
            if (!Array.isArray(request.craftedPieceIds))
                throw new Error('invalid_crafted_piece_ids');
            validateCraftedPieceIds(request.setId, request.craftedPieceIds);
            return (0, equipment_mobile_api_v33_1.equipmentSetDetailPayloadV33)(request.setId, request.craftedPieceIds);
        case 'get_equipment_crafting_detail_v33':
            assertText(request.pieceId, 'piece_id');
            return (0, equipment_mobile_api_v33_1.craftingScreenPayloadV33)(request.pieceId);
        case 'get_equipment_loadout_summary_v33':
            if (!Array.isArray(request.equipped))
                throw new Error('invalid_equipped');
            validateEquipped(request.equipped);
            return (0, equipment_mobile_api_v33_1.equipmentLoadoutPayloadV33)(request.equipped);
        default: throw new Error('unknown_equipment_api');
    }
}
