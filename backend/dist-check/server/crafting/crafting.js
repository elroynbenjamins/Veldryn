"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCraft = validateCraft;
function validateCraft(recipe, skillLevel, qty) { if (qty < 1 || qty > 999)
    throw new Error('invalid_quantity'); if (skillLevel < recipe.levelReq)
    throw new Error('skill_level_too_low'); return { ingredients: recipe.ingredients.map(x => ({ ...x, quantity: x.quantity * qty })), outputs: recipe.outputs.map(x => ({ ...x, quantity: x.quantity * qty })), xp: recipe.xp * qty, durationSec: recipe.durationSec * qty }; }
