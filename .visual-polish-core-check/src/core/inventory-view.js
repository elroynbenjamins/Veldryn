"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visibleStacks = visibleStacks;
exports.transferAmount = transferAmount;
exports.transferError = transferError;
exports.recoveryAmount = recoveryAmount;
const items_1 = require("../content/items");
const game_1 = require("./game");
function visibleStacks(stacks, query, filter, sort) {
    const term = query.trim().toLowerCase();
    return stacks.filter(stack => { const item = (0, items_1.itemDef)(stack.itemId); return stack.quantity > 0 && item.name.toLowerCase().includes(term) && (filter === 'all' || item.type === filter); }).sort((a, b) => {
        const first = (0, items_1.itemDef)(a.itemId), second = (0, items_1.itemDef)(b.itemId);
        const difference = sort === 'quantity' ? b.quantity - a.quantity : sort === 'value' ? second.value - first.value : 0;
        return difference || first.name.localeCompare(second.name);
    });
}
function transferAmount(quantity, choice) { return Math.min(quantity, choice === 'all' ? quantity : choice); }
function transferError(state, id, quantity, from) {
    try {
        (from === 'inventory' ? game_1.depositToBank : game_1.withdrawFromBank)(state, id, quantity);
        return '';
    }
    catch (error) {
        return error instanceof Error ? error.message : 'Cannot transfer';
    }
}
function recoveryAmount(state, id) { return Math.max(0, Math.min((0, items_1.itemDef)(id).heal ?? 0, (0, game_1.effectiveStats)(state).hp - (state.character?.currentHp ?? 0))); }
