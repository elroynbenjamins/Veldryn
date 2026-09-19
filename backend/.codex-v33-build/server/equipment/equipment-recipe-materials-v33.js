"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.recipeInventoryRequirementsV33 = recipeInventoryRequirementsV33;
exports.missingV33RecipeResourceKeys = missingV33RecipeResourceKeys;
exports.validateV33RecipeMaterialBindings = validateV33RecipeMaterialBindings;
const equipment_exact_recipes_v33_json_1 = __importDefault(require("../../../data/equipment_exact_recipes_v33.json"));
const equipment_resource_map_v25_1 = require("./equipment-resource-map-v25");
function recipeInventoryRequirementsV33(pieceId) {
    const recipe = equipment_exact_recipes_v33_json_1.default.recipes.find(entry => entry.pieceId === pieceId);
    if (!recipe)
        throw new Error(`unknown_piece_recipe:${pieceId}`);
    return Object.entries(recipe.expandedRawRequirements).map(([canonicalResource, quantity]) => ({
        itemId: (0, equipment_resource_map_v25_1.inventoryItemIdV25)(canonicalResource), canonicalResource, quantity: Number(quantity),
    }));
}
function missingV33RecipeResourceKeys(pieceId) {
    const recipe = equipment_exact_recipes_v33_json_1.default.recipes.find(entry => entry.pieceId === pieceId);
    if (!recipe)
        throw new Error(`unknown_piece_recipe:${pieceId}`);
    return Object.keys(recipe.expandedRawRequirements).filter(key => {
        try {
            (0, equipment_resource_map_v25_1.inventoryItemIdV25)(key);
            return false;
        }
        catch {
            return true;
        }
    });
}
function validateV33RecipeMaterialBindings() {
    const errors = [];
    for (const recipe of equipment_exact_recipes_v33_json_1.default.recipes) {
        for (const key of Object.keys(recipe.expandedRawRequirements)) {
            try {
                (0, equipment_resource_map_v25_1.inventoryItemIdV25)(key);
            }
            catch {
                errors.push(`${recipe.pieceId}:${key}`);
            }
        }
    }
    return errors;
}
