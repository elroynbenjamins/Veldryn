"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settleEquipmentCraftV32 = settleEquipmentCraftV32;
const equipment_catalog_v23_1 = require("./equipment-catalog-v23");
const equipment_types_v22_1 = require("./equipment-types-v22");
async function settleEquipmentCraftV32(repo, receipt) {
    const piece = equipment_catalog_v23_1.EQUIPMENT_PIECES_V23.find(p => p.id === receipt.pieceId);
    if (!piece)
        throw new Error('unknown_piece');
    if (await repo.hasMutationKey(receipt.idempotencyKey)) {
        const crafted = await repo.listCraftedPieceIds(receipt.characterId);
        return { ...skinProgress(piece.setId, crafted), duplicate: true, firstCraft: false };
    }
    const firstCraft = !(await repo.hasCraftReceipt(receipt.characterId, receipt.pieceId));
    if (firstCraft)
        await repo.insertCraftReceipt(receipt);
    await repo.markMutationKey(receipt.idempotencyKey);
    const crafted = await repo.listCraftedPieceIds(receipt.characterId);
    const progress = skinProgress(piece.setId, crafted);
    let skinUnlocked;
    if (progress.skinProgress.crafted === progress.skinProgress.required && !(await repo.hasSkin(receipt.characterId, piece.setId))) {
        await repo.unlockSkin(receipt.characterId, piece.setId, 'equipment_set');
        skinUnlocked = piece.setId;
    }
    return { ...progress, duplicate: false, firstCraft, skinUnlocked };
}
function skinProgress(setId, craftedIds) {
    const set = equipment_catalog_v23_1.EQUIPMENT_SETS_V23.find(s => s.id === setId);
    if (!set)
        throw new Error('unknown_set');
    const crafted = new Set(craftedIds);
    const pieces = equipment_catalog_v23_1.EQUIPMENT_PIECES_V23.filter(p => p.setId === setId && p.requiredForSkin);
    const slots = new Set(pieces.filter(p => crafted.has(p.id)).map(p => p.slot));
    const missing = equipment_types_v22_1.SKIN_REQUIRED_SLOTS.filter(s => !slots.has(s));
    return { skinProgress: { setId, crafted: equipment_types_v22_1.SKIN_REQUIRED_SLOTS.length - missing.length, required: equipment_types_v22_1.SKIN_REQUIRED_SLOTS.length, missingSlots: missing } };
}
