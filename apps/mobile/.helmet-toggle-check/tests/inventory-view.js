"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../src/core/game");
const inventory_view_1 = require("../src/core/inventory-view");
function ok(value, message) { if (!value)
    throw new Error(message); }
const state = (0, game_1.createCharacter)((0, game_1.newGame)(1000), 'IRONWARDEN');
const stacks = [{ itemId: 'COPPER_ORE', quantity: 12 }, { itemId: 'TRAVEL_RATION', quantity: 3 }];
const original = JSON.stringify(stacks);
ok((0, inventory_view_1.visibleStacks)(stacks, ' copper ', 'all', 'name').length === 1, 'Search trims and ignores case');
ok((0, inventory_view_1.visibleStacks)(stacks, '', 'food', 'name')[0].itemId === 'TRAVEL_RATION', 'Food filter');
ok((0, inventory_view_1.visibleStacks)(stacks, '', 'gear', 'name').length === 0, 'Empty category');
ok((0, inventory_view_1.visibleStacks)(stacks, '', 'all', 'quantity')[0].quantity === 12, 'Descending quantity');
ok(JSON.stringify(stacks) === original, 'Sorting does not mutate save stacks');
ok((0, inventory_view_1.transferAmount)(3, 10) === 3, 'Quantity clamps to owned count');
ok((0, inventory_view_1.transferAmount)(25, 'all') === 25, 'All transfer');
ok((0, inventory_view_1.transferAmount)(25, 1) === 1, 'Single transfer');
ok((0, inventory_view_1.recoveryAmount)(state, 'TRAVEL_RATION') === 0, 'No healing at full HP');
ok((0, inventory_view_1.recoveryAmount)({ ...state, character: { ...state.character, currentHp: (0, game_1.effectiveStats)(state).hp - 2 } }, 'TRAVEL_RATION') === 2, 'Healing clamps to missing HP');
ok((0, inventory_view_1.transferError)(state, 'TRAVEL_RATION', 10, 'inventory') === '', 'Valid transfer');
ok(!!(0, inventory_view_1.transferError)({ ...state, bank: { stacks: [], capacity: 0 } }, 'TRAVEL_RATION', 1, 'inventory'), 'Full destination rejected');
ok(!!(0, inventory_view_1.transferError)(state, 'TRAVEL_RATION', 100, 'inventory'), 'Insufficient quantity rejected');
ok(!!(0, inventory_view_1.transferError)(state, 'TRAVEL_RATION', 1, 'bank'), 'Empty bank cannot withdraw');
console.log('PASS: inventory search, filters, sorting, transfer preflight and healing previews');
