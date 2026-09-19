"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.settleCraftCompletionV22 = settleCraftCompletionV22;
const equipment_catalog_v22_1 = require("./equipment-catalog-v22");
const equipment_skins_v22_1 = require("./equipment-skins-v22");
async function settleCraftCompletionV22(repo, receipt) {
    const piece = equipment_catalog_v22_1.EQUIPMENT_PIECES_V22.find(p => p.id === receipt.pieceId);
    if (!piece)
        throw new Error('unknown_piece');
    if (!(await repo.hasCraftReceipt(receipt.characterId, receipt.pieceId)))
        await repo.insertCraftReceipt(receipt);
    const crafted = await repo.listCraftedPieceIds(receipt.characterId);
    const history = crafted.map((pieceId, i) => ({ pieceId, characterId: receipt.characterId, craftedAt: String(i) }));
    if ((0, equipment_skins_v22_1.resolveCompletedSetSkinV22)(receipt.characterId, piece.setId, equipment_catalog_v22_1.EQUIPMENT_PIECES_V22, history) && !(await repo.hasSkin(receipt.characterId, piece.setId))) {
        await repo.unlockSkin(receipt.characterId, piece.setId, 'equipment_set');
        return { skinUnlocked: piece.setId };
    }
    return {};
}
