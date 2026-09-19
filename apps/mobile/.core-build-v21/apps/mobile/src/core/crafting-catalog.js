"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.visibleRecipes = visibleRecipes;
const skills_1 = require("../content/skills");
const items_1 = require("../content/items");
const playability_1 = require("./playability");
function visibleRecipes(state, skillId, query = '', filter = 'all', sort = 'level') {
    const term = query.trim().toLowerCase(), favorites = new Set(state.account.collectionPreferences?.favoriteRecipeIds ?? []), skill = state.skills.find(entry => entry.skillId === skillId);
    return skills_1.RECIPES.filter(recipe => recipe.skillId === skillId && !recipe.noviceSetId).map(recipe => ({ recipe, status: (0, playability_1.recipeAvailability)(state, recipe.id), favorite: favorites.has(recipe.id) })).filter(row => {
        const output = (0, items_1.itemDef)(row.recipe.output.itemId), matches = !term || row.recipe.name.toLowerCase().includes(term) || output.name.toLowerCase().includes(term);
        if (!matches)
            return false;
        if (filter === 'favorites' && !row.favorite)
            return false;
        if (filter === 'craftable' && !row.status.ready)
            return false;
        if (filter === 'locked' && (skill?.level ?? 0) >= row.recipe.level)
            return false;
        return true;
    }).sort((a, b) => {
        const fav = sort === 'favorite' ? Number(b.favorite) - Number(a.favorite) : 0;
        const primary = sort === 'name' ? a.recipe.name.localeCompare(b.recipe.name) : a.recipe.level - b.recipe.level;
        return fav || primary || a.recipe.name.localeCompare(b.recipe.name);
    });
}
