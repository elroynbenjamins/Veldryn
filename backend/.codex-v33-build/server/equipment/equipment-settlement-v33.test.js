"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const equipment_catalog_v33_1 = require("./equipment-catalog-v33");
const equipment_settlement_v33_1 = require("./equipment-settlement-v33");
const set = equipment_catalog_v33_1.EQUIPMENT_SETS_V33[0], pieces = equipment_catalog_v33_1.EQUIPMENT_PIECES_V33.filter(piece => piece.setId === set.id);
const receipts = new Set(), keys = new Set(), skins = new Set();
const repo = { hasMutationKey: async (key) => keys.has(key), markMutationKey: async (key) => void keys.add(key), hasCraftReceipt: async (_c, p) => receipts.has(p), insertCraftReceipt: async (receipt) => void receipts.add(receipt.pieceId), listCraftedPieceIds: async (_c) => [...receipts], hasSkin: async (_c, s) => skins.has(s), unlockSkin: async (_c, s) => void skins.add(s) };
(async () => {
    let last;
    for (const piece of pieces)
        last = await (0, equipment_settlement_v33_1.settleEquipmentCraftV33)(repo, { characterId: 'c', pieceId: piece.id, instanceId: `i-${piece.id}`, completedAt: '2026-09-15T00:00:00Z', idempotencyKey: `k-${piece.id}` });
    strict_1.default.equal(last.skinProgress.complete, true);
    strict_1.default.equal(last.skinUnlocked, set.id);
    const duplicate = await (0, equipment_settlement_v33_1.settleEquipmentCraftV33)(repo, { characterId: 'c', pieceId: pieces[0].id, instanceId: 'duplicate', completedAt: '2026-09-15T00:00:00Z', idempotencyKey: 'k-' + pieces[0].id });
    strict_1.default.equal(duplicate.duplicate, true);
    strict_1.default.equal(duplicate.skinProgress.complete, true);
    console.log('v33 equipment settlement passed');
})();
