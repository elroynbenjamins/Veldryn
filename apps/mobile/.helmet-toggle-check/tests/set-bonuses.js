"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../src/core/game");
const novice_sets_1 = require("../src/content/novice-sets");
let state = (0, game_1.createCharacter)((0, game_1.newGame)(0), 'BASTION', 'Tester');
state = { ...state, character: { ...state.character, level: 4, gold: 500 }, bank: { ...state.bank, stacks: [{ itemId: 'COPPER_ORE', quantity: 500 }, { itemId: 'GREENWOOD_LOG', quantity: 500 }, { itemId: 'MOSS_FIBER', quantity: 500 }] } };
for (const slot of ['chest', 'weapon', 'offhand', 'gloves', 'boots', 'helmet', 'legs'])
    state = (0, game_1.craftRecipe)(state, (0, novice_sets_1.noviceRecipeId)('BASTION', slot));
const before = (0, game_1.effectiveStats)(state), after = (0, game_1.effectiveStats)((0, game_1.equipNoviceSet)(state));
if (after.defense - before.defense < 12 || after.hp - before.hp < 42)
    throw new Error('Full set bonus not applied');
console.log(`PASS: Bastion full-set bonus adds ${after.defense - before.defense} DEF and ${after.hp - before.hp} HP`);
