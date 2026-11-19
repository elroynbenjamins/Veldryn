"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPOSITE_COMPONENTS_V27 = exports.EXACT_PIECE_RECIPES_V27 = void 0;
exports.exactRecipeV27 = exactRecipeV27;
exports.compositeComponentV27 = compositeComponentV27;
exports.finalInventoryRequirementsV27 = finalInventoryRequirementsV27;
exports.componentInventoryRequirementsV27 = componentInventoryRequirementsV27;
exports.canStartExactPieceCraftV27 = canStartExactPieceCraftV27;
exports.canCraftCompositeComponentV27 = canCraftCompositeComponentV27;
exports.validateExactRecipeCatalogV27 = validateExactRecipeCatalogV27;
const equipment_exact_recipes_v27_json_1 = __importDefault(require("../../../data/equipment_exact_recipes_v27.json"));
const equipment_components_v27_json_1 = __importDefault(require("../../../data/equipment_components_v27.json"));
const equipment_processing_v26_1 = require("./equipment-processing-v26");
const recipes = equipment_exact_recipes_v27_json_1.default.recipes;
const components = equipment_components_v27_json_1.default.components;
const byPiece = new Map(recipes.map(r => [r.pieceId, r]));
const byComponent = new Map(components.map(c => [c.componentId, c]));
exports.EXACT_PIECE_RECIPES_V27 = recipes;
exports.COMPOSITE_COMPONENTS_V27 = components;
function exactRecipeV27(pieceId) { return byPiece.get(pieceId); }
function compositeComponentV27(componentId) { return byComponent.get(componentId); }
function addQty(target, key, qty) { target[key] = (target[key] ?? 0) + qty; }
/** Inventory keys used by final assembly. Component IDs are stored as their componentId.
 * Processed inputs use PROCESSING_DEFINITIONS_V26.processedKey. Required boss resources use the canonical resource key. */
function finalInventoryRequirementsV27(pieceId) {
    const recipe = byPiece.get(pieceId);
    if (!recipe)
        throw new Error(`unknown_piece:${pieceId}`);
    const req = {};
    for (const c of recipe.components) {
        if (c.componentId) {
            addQty(req, c.componentId, c.qty);
            continue;
        }
        if (c.canonicalResource) {
            if (c.dungeonBossComponent) {
                addQty(req, c.canonicalResource, c.qty);
                continue;
            }
            const def = (0, equipment_processing_v26_1.processingDefinitionV26)(c.canonicalResource);
            if (!def)
                throw new Error(`missing_processing_definition:${c.canonicalResource}`);
            addQty(req, def.processedKey, c.qty);
        }
    }
    return req;
}
function componentInventoryRequirementsV27(componentId) {
    const component = byComponent.get(componentId);
    if (!component)
        throw new Error(`unknown_component:${componentId}`);
    const req = {};
    for (const input of component.inputs) {
        const def = (0, equipment_processing_v26_1.processingDefinitionV26)(input.canonicalResource);
        if (!def)
            throw new Error(`missing_processing_definition:${input.canonicalResource}`);
        addQty(req, def.processedKey, input.qty);
    }
    return req;
}
function inventoryErrors(req, inv) {
    const errors = [];
    for (const [key, qty] of Object.entries(req))
        if ((inv[key] ?? 0) < qty)
            errors.push(`missing:${key}:${qty - (inv[key] ?? 0)}`);
    return errors;
}
/** Final assembly checks only the primary assembly skill plus already-crafted inputs.
 * Supporting profession levels are enforced when each intermediate component is crafted. */
function canStartExactPieceCraftV27(pieceId, skillLevels, inventory) {
    const recipe = byPiece.get(pieceId);
    if (!recipe)
        return { ok: false, errors: [`unknown_piece:${pieceId}`], requirements: {} };
    const requirements = finalInventoryRequirementsV27(pieceId);
    const errors = [];
    const level = skillLevels[recipe.finalAssembly.skillId] ?? 0;
    if (level < recipe.finalAssembly.level)
        errors.push(`skill:${recipe.finalAssembly.skillId}:${recipe.finalAssembly.level}`);
    errors.push(...inventoryErrors(requirements, inventory));
    return { ok: errors.length === 0, errors, requirements };
}
function canCraftCompositeComponentV27(componentId, skillLevels, inventory) {
    const component = byComponent.get(componentId);
    if (!component)
        return { ok: false, errors: [`unknown_component:${componentId}`], requirements: {} };
    const requirements = componentInventoryRequirementsV27(componentId);
    const errors = [];
    const level = skillLevels[component.craftSkillId] ?? 0;
    if (level < component.skillLevel)
        errors.push(`skill:${component.craftSkillId}:${component.skillLevel}`);
    errors.push(...inventoryErrors(requirements, inventory));
    return { ok: errors.length === 0, errors, requirements };
}
function validateExactRecipeCatalogV27() {
    if (recipes.length !== 1701)
        throw new Error(`recipe_count:${recipes.length}`);
    if (components.length !== 33)
        throw new Error(`component_count:${components.length}`);
    const ids = new Set();
    for (const r of recipes) {
        if (ids.has(r.pieceId))
            throw new Error(`duplicate_recipe:${r.pieceId}`);
        ids.add(r.pieceId);
        if (r.finalAssembly.level !== r.requiredLevel)
            throw new Error(`final_skill_mismatch:${r.pieceId}`);
        if (r.tier === 'T1' && r.effectGemSupported)
            throw new Error(`t1_effect_gem:${r.pieceId}`);
        if (r.tier === 'T2' && (!r.statGemSupported || r.effectGemSupported))
            throw new Error(`t2_socket_rule:${r.pieceId}`);
        if (Number(r.tier.slice(1)) >= 3 && (!r.statGemSupported || !r.effectGemSupported))
            throw new Error(`t3plus_socket_rule:${r.pieceId}`);
        for (const c of r.components) {
            if (c.componentId && !byComponent.has(c.componentId))
                throw new Error(`unknown_component_ref:${r.pieceId}:${c.componentId}`);
            if (c.componentId === 'COMP_T9_HEART' && r.requiredLevel < 70)
                throw new Error(`frozen_heart_too_early:${r.pieceId}`);
        }
    }
    return true;
}
