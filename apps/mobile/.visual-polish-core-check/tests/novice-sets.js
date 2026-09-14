"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const novice_sets_1 = require("../src/content/novice-sets");
const classes_1 = require("../src/content/classes");
const items_1 = require("../src/content/items");
const skills_1 = require("../src/content/skills");
const game_1 = require("../src/core/game");
const character_appearance_1 = require("../src/core/character-appearance");
const playability_1 = require("../src/core/playability");
const save_migrations_1 = require("../src/core/save-migrations");
function ok(value, message) { if (!value)
    throw new Error(message); }
function rejects(action, message) { let failed = false; try {
    action();
}
catch {
    failed = true;
} ok(failed, message); }
function count(state, id) { return [...state.inventory.stacks, ...state.bank.stacks, ...state.overflow.stacks].filter(s => s.itemId === id).reduce((n, s) => n + s.quantity, 0) + Object.values(state.character.equipment).filter(item => item === id).length; }
ok(novice_sets_1.NOVICE_SETS.length === 9 && novice_sets_1.NOVICE_ITEMS.length === 90 && novice_sets_1.NOVICE_RECIPES.length === 90, 'Nine complete ten-piece sets and ninety unique piece recipes');
ok(new Set(items_1.ITEMS.map(item => item.id)).size === items_1.ITEMS.length, 'No item ID collisions');
for (const set of novice_sets_1.NOVICE_SETS) {
    for (const body of ['male', 'female']) {
        const initial = (0, game_1.createCharacter)((0, game_1.newGame)(1000), set.classId, 'Novice', body);
        ok(!(0, character_appearance_1.noviceSetProgress)(initial).unlocked, 'No free novice unlock');
        ok(Object.values(initial.character.equipment).length === 1, 'Creation still grants one weapon');
        let state = { ...initial, character: { ...initial.character, level: 5, gold: 1000 }, bank: { ...initial.bank, stacks: [{ itemId: 'COPPER_ORE', quantity: 400 }, { itemId: 'GREENWOOD_LOG', quantity: 400 }, { itemId: 'MOSS_FIBER', quantity: 200 }] } };
        const snapshot = JSON.stringify(state);
        rejects(() => (0, game_1.craftRecipe)(state, (0, novice_sets_1.noviceRecipeId)(set.classId, 'weapon')), 'Weapon requires chest first');
        ok(JSON.stringify(state) === snapshot, 'Failed craft does not mutate input');
        const other = novice_sets_1.NOVICE_SETS.find(candidate => candidate.classId !== set.classId);
        rejects(() => (0, game_1.craftRecipe)(state, (0, novice_sets_1.noviceRecipeId)(other.classId, 'chest')), 'Cross-class crafting rejected');
        for (const slot of set.slots) {
            const id = (0, novice_sets_1.noviceItemId)(set.classId, slot), recipeId = (0, novice_sets_1.noviceRecipeId)(set.classId, slot);
            ok((0, playability_1.recipeAvailability)(state, recipeId).ready, 'Workshop eligibility agrees with core');
            state = (0, game_1.craftRecipe)(state, recipeId);
            ok(count(state, id) === 1, 'Crafted one piece into storage');
            ok(state.character.craftedNoviceItemIds.includes(id), 'Crafting history records each piece');
            if (slot === 'chest')
                ok((0, game_1.equipItem)(state, id).character.equipment.chest === id, 'Single armor piece equips independently');
        }
        const cost = novice_sets_1.NOVICE_RECIPES.filter(recipe => recipe.classId === set.classId).reduce((sum, recipe) => sum + recipe.gold, 0);
        ok(state.character.gold === 1000 - cost, 'Exact crafting cost deducted');
        ok((0, character_appearance_1.noviceSetProgress)(state).unlocked, 'All pieces unlock completion milestone');
        const equipped = (0, game_1.equipNoviceSet)(state);
        ok((0, character_appearance_1.noviceSetProgress)(equipped).pieces.every(piece => piece.equipped), 'Bulk equip uses every owned gameplay piece');
        ok((0, game_1.effectiveStats)(equipped).defense > (0, game_1.effectiveStats)(initial).defense, 'Armor affects gameplay stats');
        ok(equipped.character.currentHp <= (0, game_1.effectiveStats)(equipped).hp, 'Health remains bounded');
        ok(count(equipped, classes_1.CLASSES.find(candidate => candidate.id === set.classId).starterEquipment.weapon) === 1, 'Starting weapon preserved in storage');
        const again = (0, game_1.equipNoviceSet)(equipped);
        for (const slot of set.slots)
            ok(count(again, (0, novice_sets_1.noviceItemId)(set.classId, slot)) === 1, 'Repeat equip cannot duplicate gear');
        const loaded = (0, save_migrations_1.migrateSave)(JSON.parse(JSON.stringify(equipped)));
        ok((0, character_appearance_1.noviceSetProgress)(loaded).pieces.every(piece => piece.equipped) && (0, character_appearance_1.noviceSetProgress)(loaded).unlocked, 'Save/load preserves equipment and milestone');
        ok(loaded.character.bodyPresentation === body, 'Gender survives save/load');
        const removed = (0, game_1.unequipItem)(equipped, 'helmet');
        ok(!(0, character_appearance_1.noviceSetProgress)(removed).pieces.every(piece => piece.equipped), 'Removing a piece updates equipment state');
        ok((0, character_appearance_1.noviceSetProgress)(removed).unlocked, 'Crafting milestone remains unlocked after unequip');
        const incompatible = { ...equipped, inventory: { ...equipped.inventory, stacks: [...equipped.inventory.stacks, { itemId: (0, novice_sets_1.noviceItemId)(set.classId, 'cape'), quantity: 1 }] }, character: { ...equipped.character, equipment: { ...equipped.character.equipment, cape: 'OATHGLASS_CAPE' } } };
        const restored = (0, game_1.equipNoviceSet)(incompatible);
        ok((0, character_appearance_1.noviceSetProgress)(restored).pieces.every(piece => piece.equipped) && count(restored, 'OATHGLASS_CAPE') === 1, 'Set equip stores incompatible cape');
        const foreignId = (0, novice_sets_1.noviceItemId)(other.classId, 'chest');
        rejects(() => (0, game_1.equipItem)({ ...state, inventory: { ...state.inventory, stacks: [...state.inventory.stacks, { itemId: foreignId, quantity: 1 }] } }, foreignId), 'Cross-class equip rejected');
        const missing = { ...state, inventory: { ...state.inventory, stacks: state.inventory.stacks.filter(stack => stack.itemId !== (0, novice_sets_1.noviceItemId)(set.classId, 'helmet')) } };
        rejects(() => (0, game_1.equipNoviceSet)(missing), 'Missing piece cannot be granted by equip-all');
        const bankOnly = { ...state, bank: { ...state.bank, stacks: [...state.bank.stacks, ...state.inventory.stacks.filter(stack => (0, items_1.itemDef)(stack.itemId).noviceSetId)] }, inventory: { ...state.inventory, stacks: state.inventory.stacks.filter(stack => !(0, items_1.itemDef)(stack.itemId).noviceSetId) } };
        ok((0, character_appearance_1.noviceSetProgress)((0, game_1.equipNoviceSet)(bankOnly)).pieces.every(piece => piece.equipped), 'Equip-all consumes owned Bank pieces');
        const cramped = { ...equipped, character: { ...equipped.character, equipment: { ...equipped.character.equipment, weapon: classes_1.CLASSES.find(candidate => candidate.id === set.classId).starterEquipment.weapon, cape: 'OATHGLASS_CAPE' } }, inventory: { stacks: [], capacity: 0 }, bank: { stacks: [{ itemId: (0, novice_sets_1.noviceItemId)(set.classId, 'weapon'), quantity: 1 }], capacity: 1 } };
        const crampedBefore = JSON.stringify(cramped);
        rejects(() => (0, game_1.equipNoviceSet)(cramped), 'Cannot discard replaced gear when storage is full');
        ok(JSON.stringify(cramped) === crampedBefore, 'Failed bulk equip is atomic');
    }
}
const fresh = (0, game_1.createCharacter)((0, game_1.newGame)(1000), 'IRONWARDEN');
const rich = { ...fresh, bank: { ...fresh.bank, stacks: [{ itemId: 'COPPER_ORE', quantity: 100 }, { itemId: 'GREENWOOD_LOG', quantity: 100 }, { itemId: 'MOSS_FIBER', quantity: 100 }] } };
const chest = (0, game_1.craftRecipe)(rich, (0, novice_sets_1.noviceRecipeId)('IRONWARDEN', 'chest'));
rejects(() => (0, game_1.craftRecipe)(chest, (0, novice_sets_1.noviceRecipeId)('IRONWARDEN', 'weapon')), 'Character-level gate enforced');
const legacy = (0, save_migrations_1.migrateSave)(JSON.parse(JSON.stringify(fresh)));
ok((0, character_appearance_1.noviceSetProgress)(legacy).crafted === 0, 'Old saves get no free crafting history');
rejects(() => (0, game_1.craftRecipe)({ ...rich, character: { ...rich.character, gold: 0 } }, (0, novice_sets_1.noviceRecipeId)('IRONWARDEN', 'chest')), 'Insufficient gold fails');
rejects(() => (0, game_1.craftRecipe)(fresh, (0, novice_sets_1.noviceRecipeId)('IRONWARDEN', 'chest')), 'Insufficient materials fail');
const noRoom = { ...rich, inventory: { stacks: [], capacity: 0 }, bank: { ...rich.bank, capacity: 3 } };
const noRoomBefore = JSON.stringify(noRoom);
rejects(() => (0, game_1.craftRecipe)(noRoom, (0, novice_sets_1.noviceRecipeId)('IRONWARDEN', 'chest')), 'Craft output requires storage');
ok(JSON.stringify(noRoom) === noRoomBefore, 'Failed craft does not spend materials or record history');
console.log(`PASS: 18 novice variants, ${skills_1.RECIPES.length} recipes including capes, amulets and rings, class/stage gates, bank crafting, atomic equip and save migration`);
