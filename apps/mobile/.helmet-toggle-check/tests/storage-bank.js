"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../src/core/game");
let s = (0, game_1.createCharacter)((0, game_1.newGame)(0), 'IRONWARDEN');
if (s.inventory.capacity !== 30)
    throw new Error('inventory should start 30');
if (s.bank.capacity !== 120)
    throw new Error('bank should start 120');
s = (0, game_1.depositToBank)(s, 'TRAVEL_RATION', 5);
if (s.bank.stacks.find(x => x.itemId === 'TRAVEL_RATION')?.quantity !== 5)
    throw new Error('deposit failed');
s = (0, game_1.withdrawFromBank)(s, 'TRAVEL_RATION', 2);
if (s.bank.stacks.find(x => x.itemId === 'TRAVEL_RATION')?.quantity !== 3)
    throw new Error('withdraw failed');
console.log(JSON.stringify({ status: 'PASS', inventoryCapacity: s.inventory.capacity, bankCapacity: s.bank.capacity, inventoryRations: s.inventory.stacks.find(x => x.itemId === 'TRAVEL_RATION')?.quantity, bankRations: s.bank.stacks.find(x => x.itemId === 'TRAVEL_RATION')?.quantity }, null, 2));
