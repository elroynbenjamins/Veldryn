"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PVE_REQUIREMENTS_BY_PIECE_V30 = void 0;
exports.pveRequirementsForPieceV30 = pveRequirementsForPieceV30;
exports.validateExactPveCatalogV30 = validateExactPveCatalogV30;
const equipment_exact_recipes_v30_json_1 = __importDefault(require("../../../data/equipment_exact_recipes_v30.json"));
const equipment_pve_rewards_v30_1 = require("./equipment-pve-rewards-v30");
const rows = equipment_exact_recipes_v30_json_1.default.recipes;
exports.PVE_REQUIREMENTS_BY_PIECE_V30 = Object.fromEntries(rows.map(r => [r.pieceId, r]));
function pveRequirementsForPieceV30(pieceId) {
    const r = exports.PVE_REQUIREMENTS_BY_PIECE_V30[pieceId];
    if (!r)
        throw new Error(`unknown_equipment_piece:${pieceId}`);
    if (r.regionalCombatRequirement && !equipment_pve_rewards_v30_1.COMBAT_SOURCES_V30[r.regionalCombatRequirement.sourceId])
        throw new Error(`unknown_combat_source_for_piece:${pieceId}`);
    if (r.dungeonBossRequirement && !equipment_pve_rewards_v30_1.TOKEN_SOURCES_V30[r.dungeonBossRequirement.tokenId])
        throw new Error(`unknown_token_source_for_piece:${pieceId}`);
    if (r.frozenHeartRequirement > 0 && r.requiredLevel < 70)
        throw new Error(`frozen_heart_before_70:${pieceId}`);
    return r;
}
function validateExactPveCatalogV30() {
    if (rows.length !== 1701)
        throw new Error(`expected_1701_pve_recipes_got_${rows.length}`);
    for (const r of rows)
        pveRequirementsForPieceV30(r.pieceId);
    return true;
}
