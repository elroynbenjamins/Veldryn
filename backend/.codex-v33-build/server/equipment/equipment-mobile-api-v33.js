"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.equipmentSetDetailPayloadV33 = equipmentSetDetailPayloadV33;
exports.craftingScreenPayloadV33 = craftingScreenPayloadV33;
exports.equipmentLoadoutPayloadV33 = equipmentLoadoutPayloadV33;
const equipment_catalog_t1_t9_v33_json_1 = __importDefault(require("../../../data/equipment_catalog_t1_t9_v33.json"));
const equipment_exact_recipes_v33_json_1 = __importDefault(require("../../../data/equipment_exact_recipes_v33.json"));
const equipment_catalog_v33_1 = require("./equipment-catalog-v33");
const equipment_set_resolver_v33_1 = require("./equipment-set-resolver-v33");
function equipmentSetDetailPayloadV33(setId, craftedPieceIds) {
    const set = equipment_catalog_v33_1.EQUIPMENT_SETS_V33.find(entry => entry.id === setId);
    if (!set)
        throw new Error('unknown_set');
    const crafted = new Set(craftedPieceIds);
    const pieces = equipment_catalog_v33_1.EQUIPMENT_PIECES_V33.filter(piece => piece.setId === setId).map(piece => ({ ...piece, crafted: crafted.has(piece.id) }));
    return { set, pieces, slotOrder: equipment_catalog_t1_t9_v33_json_1.default.slotOrder, setThresholds: equipment_catalog_t1_t9_v33_json_1.default.setThresholds, skinRule: 'Craft all 10 distinct pieces once on this character.' };
}
function craftingScreenPayloadV33(pieceId) {
    const piece = equipment_catalog_v33_1.EQUIPMENT_PIECES_V33.find(entry => entry.id === pieceId);
    if (!piece)
        throw new Error('unknown_piece');
    const recipe = equipment_exact_recipes_v33_json_1.default.recipes.find(entry => entry.pieceId === pieceId);
    if (!recipe)
        throw new Error('missing_recipe');
    return { piece, recipe, visualStatus: 'Not Started', freshGeneratedArtOnly: true };
}
function equipmentLoadoutPayloadV33(equipped) {
    const activeSets = (0, equipment_set_resolver_v33_1.resolveSetBonusesV33)(equipped, equipment_catalog_v33_1.EQUIPMENT_SETS_V33);
    return { slotOrder: equipment_catalog_t1_t9_v33_json_1.default.slotOrder, equipped, activeSets, setThresholds: equipment_catalog_t1_t9_v33_json_1.default.setThresholds };
}
