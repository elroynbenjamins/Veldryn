"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assertions_1 = require("./assertions");
const game_1 = require("../src/core/game");
const collection_preferences_1 = require("../src/core/collection-preferences");
const loadout_storage_1 = require("../src/core/loadout-storage");
const character_loadouts_1 = require("../src/core/character-loadouts");
const save_migrations_1 = require("../src/core/save-migrations");
const inventory_view_1 = require("../src/core/inventory-view");
const crafting_catalog_1 = require("../src/core/crafting-catalog");
const skills_1 = require("../src/content/skills");
let state = (0, game_1.createCharacter)((0, game_1.newGame)(1), 'IRONWARDEN', 'Loadout Tester');
state = (0, collection_preferences_1.toggleFavorite)(state, 'item', 'TRAVEL_RATION');
(0, assertions_1.equal)((0, collection_preferences_1.isFavorite)(state, 'item', 'TRAVEL_RATION'), true, 'favorite toggles on');
state = (0, character_loadouts_1.saveCharacterLoadout)(state, 0, 'Starter build', 10);
(0, assertions_1.equal)((0, character_loadouts_1.normalizeCharacterLoadouts)(state.character.savedLoadouts, 'IRONWARDEN')[0].name, 'Starter build', 'loadout saves');
const planned = (0, loadout_storage_1.planLoadoutStorage)({ inventory: [{ itemId: 'GEAR_B', quantity: 1 }], bank: [{ itemId: 'GEAR_A', quantity: 1 }], inventoryCapacity: 4, bankCapacity: 4, currentEquipment: { weapon: 'GEAR_A' }, desiredEquipment: { weapon: 'GEAR_B' } });
(0, assertions_1.deepEqual)(planned.inventory, [{ itemId: 'GEAR_A', quantity: 1 }], 'displaced gear returns to inventory');
let missing = '';
try {
    (0, loadout_storage_1.planLoadoutStorage)({ inventory: [], bank: [], inventoryCapacity: 4, bankCapacity: 4, currentEquipment: {}, desiredEquipment: { weapon: 'MISSING' } });
}
catch (error) {
    missing = error instanceof Error ? error.message : '';
}
(0, assertions_1.equal)(missing, 'MISSING:MISSING', 'missing gear is rejected');
const roundTrip = (0, save_migrations_1.migrateSave)(JSON.parse(JSON.stringify(state)));
(0, assertions_1.equal)(roundTrip.version, 11, 'new persistence state uses current save boundary');
(0, assertions_1.equal)((0, collection_preferences_1.isFavorite)(roundTrip, 'item', 'TRAVEL_RATION'), true, 'favorites survive migration');
(0, assertions_1.equal)(roundTrip.character.savedLoadouts?.[0]?.name, 'Starter build', 'loadouts survive migration');
const favoriteRecipe = skills_1.RECIPES.find(recipe => !recipe.noviceSetId);
if (!favoriteRecipe)
    throw new Error('Expected a catalog recipe');
const recipeState = (0, collection_preferences_1.toggleFavorite)(state, 'recipe', favoriteRecipe.id);
(0, assertions_1.equal)((0, inventory_view_1.visibleStacks)([{ itemId: 'TRAVEL_RATION', quantity: 1 }], '', 'favorites', 'favorite', ['TRAVEL_RATION']).length, 1, 'favorite inventory filter');
(0, assertions_1.equal)((0, crafting_catalog_1.visibleRecipes)(recipeState, favoriteRecipe.skillId, '', 'favorites', 'favorite').some(row => row.recipe.id === favoriteRecipe.id), true, 'favorite recipe filter');
console.log('search-loadouts-v1 passed');
