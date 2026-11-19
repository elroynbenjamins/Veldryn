"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settleCraftCompletionV22 = settleCraftCompletionV22;
const equipment_catalog_v22_1 = require("./equipment-catalog-v22");
async function settleCraftCompletionV22(repo, receipt) {
    if (!equipment_catalog_v22_1.EQUIPMENT_PIECES_V22.some(p => p.id === receipt.pieceId))
        throw new Error('unknown_piece');
    const firstCraft = !(await repo.hasCraftReceipt(receipt.characterId, receipt.pieceId));
    if (firstCraft)
        await repo.insertCraftReceipt(receipt);
    return { firstCraft };
}
