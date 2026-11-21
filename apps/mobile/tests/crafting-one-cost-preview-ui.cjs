'use strict';
const fs = require('node:fs');
const assert = require('node:assert/strict');
const read = file => fs.readFileSync('src/components/' + file, 'utf8');
const equipment = read('SmithingCollection.tsx');
const recipes = read('RecipeCard.tsx');
const consumables = read('ConsumableWorkshop.tsx');

// An unavailable recipe is a one-craft cost preview, never a zero-cost recipe.
assert.ok(equipment.includes('craftCount=craftMax?Math.min(craftMax,Math.max(1,requestedCraftCount)):1;'));
assert.ok(equipment.includes('detailsOnly externalQuantity={craftCount}'));
assert.ok(recipes.includes('Math.max(1,externalQuantity??quantity)'));
assert.ok(equipment.includes('recipe.gold*craftCount'));
assert.ok(equipment.includes("craftMax<1?unavailableCraftLabel:craftCount+' × '"));
assert.ok(equipment.includes('disabled={!ready||craftMax<1||craftPending}'));
const ingredients=read('IngredientList.tsx');
assert.ok(recipes.includes('numberMode={state.settings.numberMode} compact/>'));
assert.ok(ingredients.includes('ItemArtwork itemId={input.itemId} size={compact?28:32}'));

assert.ok(recipes.includes('quantity=quantityMax>0?Math.min(quantityMax,Math.max(1,wantedQuantity)):1;'));
assert.ok(recipes.includes('externalQuantity!==undefined?quantityInputs:quantityMax>0?quantityInputs:effectiveStatus.inputs'));
assert.ok(recipes.includes('input.quantity*(recipe.requiredKnowledgeId'));
assert.ok(recipes.includes('f(quantity*recipe.gold)'));
assert.ok(recipes.includes(':!craftReady||quantityMax<1?unavailableActionLabel:alchemy?'));
assert.ok(recipes.includes('disabled={!craftReady||quantityMax<1||starting||craftPending}'));
assert.ok(recipes.includes('if(!onAlchemyStart||!craftReady||quantityMax<1||startingRef.current)return;'));
assert.ok(recipes.includes('if(!onProcessingStart||!craftReady||quantityMax<1||startingRef.current)return;'));

assert.ok(consumables.includes('selectedBatches[recipe.id]??1)):1;'));
assert.ok(consumables.includes('{count(recipe)>0?<CraftQuantitySelector'));
assert.ok(consumables.includes('{count(detail)>0?<CraftQuantitySelector'));
assert.ok(consumables.includes(":count(recipe)<1?missingReason(recipe):gt('Brew')"));
assert.ok(consumables.includes('<IngredientList inputs={recipe.inputs.map'));
assert.ok(consumables.includes('<IngredientList inputs={detail.inputs.map'));
console.log('PASS: blocked crafting previews retain one-craft costs and disable unavailable actions');
