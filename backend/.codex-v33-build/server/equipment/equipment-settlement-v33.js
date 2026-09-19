"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settleEquipmentCraftV33 = settleEquipmentCraftV33;
exports.setSkinProgressV33 = setSkinProgressV33;
const equipment_catalog_v33_1 = require("./equipment-catalog-v33");
const equipment_skin_progress_v33_1 = require("./equipment-skin-progress-v33");
const equipment_types_v33_1 = require("./equipment-types-v33");
async function settleEquipmentCraftV33(repo, receipt) {
    const piece = equipment_catalog_v33_1.EQUIPMENT_PIECES_V33.find(entry => entry.id === receipt.pieceId);
    if (!piece)
        throw new Error('unknown_piece');
    if (await repo.hasMutationKey(receipt.idempotencyKey))
        return { duplicate: true, firstCraft: false, skinProgress: (0, equipment_skin_progress_v33_1.skinProgressV33)(piece.setId, await repo.listCraftedPieceIds(receipt.characterId)) };
    const firstCraft = !(await repo.hasCraftReceipt(receipt.characterId, receipt.pieceId));
    if (firstCraft)
        await repo.insertCraftReceipt(receipt);
    await repo.markMutationKey(receipt.idempotencyKey);
    const progress = (0, equipment_skin_progress_v33_1.skinProgressV33)(piece.setId, await repo.listCraftedPieceIds(receipt.characterId));
    let skinUnlocked;
    if (progress.complete && !(await repo.hasSkin(receipt.characterId, piece.setId))) {
        await repo.unlockSkin(receipt.characterId, piece.setId);
        skinUnlocked = piece.setId;
    }
    return { duplicate: false, firstCraft, skinProgress: progress, skinUnlocked };
}
function setSkinProgressV33(characterId, setId, history) {
    const crafted = new Set(history.filter(h => h.characterId === characterId).map(h => h.pieceId));
    const setPieces = equipment_catalog_v33_1.EQUIPMENT_PIECES_V33.filter(p => p.setId === setId);
    const slots = new Set(setPieces.filter(p => crafted.has(p.id)).map(p => p.slot));
    const missing = equipment_types_v33_1.SKIN_REQUIRED_SLOTS_V33.filter(s => !slots.has(s));
    return { setId, crafted: 10 - missing.length, required: 10, missingSlots: missing, complete: missing.length === 0 };
}
