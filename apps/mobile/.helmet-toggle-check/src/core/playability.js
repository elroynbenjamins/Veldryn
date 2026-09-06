"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transitionActivity = transitionActivity;
exports.recipeAvailability = recipeAvailability;
const skills_1 = require("../content/skills");
const game_1 = require("./game");
/** Settle earned rewards before replacing or stopping an activity. Pure and atomic. */
function transitionActivity(state, nowMs, next) {
    const claimed = (0, game_1.claimActivity)(state, nowMs);
    const updated = next
        ? next.kind === 'combat' ? (0, game_1.startCombat)(claimed.state, next.id, nowMs) : (0, game_1.startGathering)(claimed.state, next.id, nowMs)
        : (0, game_1.stopActivity)(claimed.state);
    return { state: updated, reward: claimed.reward };
}
/** Reuse the pure craft operation so UI checks include bank use and output capacity. */
function recipeAvailability(state, recipeId) {
    const recipe = skills_1.RECIPES.find(item => item.id === recipeId);
    if (!recipe)
        return { ready: false, reason: 'Unknown recipe', inputs: [] };
    const inputs = recipe.inputs.map(input => ({ ...input,
        inventory: state.inventory.stacks.find(stack => stack.itemId === input.itemId)?.quantity ?? 0,
        bank: state.bank.stacks.find(stack => stack.itemId === input.itemId)?.quantity ?? 0,
    }));
    try {
        (0, game_1.craftRecipe)(state, recipeId);
        return { ready: true, reason: 'Ready to craft', inputs };
    }
    catch (error) {
        return { ready: false, reason: error instanceof Error ? error.message : 'Cannot craft yet', inputs };
    }
}
