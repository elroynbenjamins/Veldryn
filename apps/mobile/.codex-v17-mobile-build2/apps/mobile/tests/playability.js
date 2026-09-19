"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../src/core/game");
const playability_1 = require("../src/core/playability");
const world_navigation_1 = require("../src/core/world-navigation");
const monsters_1 = require("../src/content/monsters");
function ok(value, message) { if (!value)
    throw new Error(message); }
const initial = (0, game_1.createCharacter)((0, game_1.newGame)(1000), 'IRONWARDEN');
const combat = (0, game_1.startCombat)(initial, 'MOSS_RAT', 1000);
const expected = (0, game_1.previewActivityReward)(combat, 61000);
const stopped = (0, playability_1.transitionActivity)(combat, 61000);
ok(stopped.state.activity === null, 'Stop clears activity');
ok(stopped.state.character.xp === expected.xp, 'Stop preserves XP');
ok(stopped.state.character.gold === initial.character.gold + expected.gold, 'Stop preserves gold');
ok((0, playability_1.transitionActivity)(stopped.state, 61000).reward.kills === 0, 'Stop cannot duplicate rewards');
// Use a gathering activity in the current zone; v15 now requires travel before changing regions.
const switched = (0, playability_1.transitionActivity)(combat, 61000, { kind: 'gathering', id: 'GREENWOOD_TREE' });
ok(switched.state.character.xp === expected.xp, 'Switch preserves combat XP');
ok(switched.state.activity?.targetId === 'GREENWOOD_TREE', 'Switch changes activity');
ok((0, game_1.previewActivityReward)(switched.state, 61000).kills === 0, 'New activity clock resets');
const gathering = (0, game_1.startGathering)(initial, 'GREENWOOD_TREE', 1000), gatherPreview = (0, game_1.previewActivityReward)(gathering, 61000);
const gathered = (0, playability_1.transitionActivity)(gathering, 61000, { kind: 'combat', id: 'MOSS_RAT' });
ok(gathered.state.skills.find(sk => sk.skillId === 'woodcutting').xp === gatherPreview.xp && gatherPreview.xp > 0, 'Gathering XP preserved at current action time');
ok(gathered.state.inventory.stacks.some(s => s.itemId === 'GREENWOOD_LOG' && s.quantity === gatherPreview.items[0].quantity), 'Gathered items preserved');
const snapshot = JSON.stringify(combat);
let rejected = false;
try {
    (0, playability_1.transitionActivity)(combat, 61000, { kind: 'gathering', id: 'invalid' });
}
catch {
    rejected = true;
}
ok(rejected, 'Invalid transition rejects');
ok(JSON.stringify(combat) === snapshot, 'Invalid switch leaves input untouched');
for (const item of expected.items) {
    const before = initial.inventory.stacks.find(s => s.itemId === item.itemId)?.quantity ?? 0;
    const after = stopped.state.inventory.stacks.find(s => s.itemId === item.itemId)?.quantity ?? 0;
    ok(after === before + item.quantity, 'Stop preserves loot');
}
const capped = (0, playability_1.transitionActivity)(combat, 30 * 3600 * 1000);
ok(capped.reward.elapsedSeconds === 24 * 3600, 'Transition respects offline cap');
ok(!(0, playability_1.recipeAvailability)(initial, 'SMELT_COPPER_INGOT').ready, 'Missing materials disables recipe');
const supplied = { ...initial, bank: { ...initial.bank, stacks: [{ itemId: 'COPPER_ORE', quantity: 10 }] } };
ok((0, playability_1.recipeAvailability)(supplied, 'SMELT_COPPER_INGOT').ready, 'Bank-only materials work');
ok((0, playability_1.recipeAvailability)(supplied, 'SMELT_COPPER_INGOT').inputs[0].bank === 10, 'Bank breakdown');
ok((0, game_1.craftRecipe)(supplied, 'SMELT_COPPER_INGOT').inventory.stacks.some(s => s.itemId === 'COPPER_INGOT'), 'Craft availability matches operation');
ok(!(0, playability_1.recipeAvailability)({ ...supplied, character: { ...supplied.character, gold: 0 } }, 'SMELT_COPPER_INGOT').ready, 'Gold gate');
ok(!(0, playability_1.recipeAvailability)({ ...supplied, inventory: { stacks: [], capacity: 0 }, bank: { stacks: [{ itemId: 'COPPER_ORE', quantity: 20 }], capacity: 1 } }, 'SMELT_COPPER_INGOT').ready, 'Output storage gate');
ok((0, world_navigation_1.nextRegionUnlock)(1)?.minLevel === 5, 'Next region sorted by level');
ok((0, world_navigation_1.nextRegionUnlock)(25) === undefined, 'All regions unlocked');
ok((0, world_navigation_1.regionEncounters)(initial, 'Greenfields', ' MOSS ', true).length === 1, 'Search trims and ignores case');
ok((0, world_navigation_1.regionEncounters)(initial, 'Greenfields', 'impossible', false).length === 0, 'Empty search results');
const boss = monsters_1.MONSTERS.find(m => m.boss);
ok(!(0, world_navigation_1.encounterUnlocked)(initial, boss), 'Boss level gate');
const veteran = { ...initial, character: { ...initial.character, level: 25 } };
ok(!(0, world_navigation_1.encounterUnlocked)(veteran, boss), 'Boss quest gate');
ok((0, world_navigation_1.encounterUnlocked)({ ...veteran, quests: veteran.quests.map(q => q.questId === 'QST_014' ? { ...q, status: 'active' } : q) }, boss), 'Boss accessible without idle-monster unlock ID');
console.log('PASS: activity settlement, no duplicate claim, bank-aware recipes and world navigation');
