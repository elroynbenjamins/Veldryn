"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const equipment_sets_1 = require("../src/content/equipment-sets");
const novice_sets_1 = require("../src/content/novice-sets");
const character_skin_sets_1 = require("../src/content/character-skin-sets");
const character_skins_1 = require("../src/core/character-skins");
const game_1 = require("../src/core/game");
const save_migrations_1 = require("../src/core/save-migrations");
function ok(value, message) { if (!value)
    throw new Error(message); }
const set = equipment_sets_1.EQUIPMENT_SETS.find(candidate => candidate.id === 'rimewall_oath');
let state = (0, game_1.createCharacter)((0, game_1.newGame)(1_000), 'IRONWARDEN', 'SkinTester');
state = { ...state,
    inventory: { ...state.inventory, stacks: [set.itemIds[0], ...set.itemIds.slice(4)].map(itemId => ({ itemId, quantity: 1 })) },
    bank: { ...state.bank, stacks: [{ itemId: set.itemIds[1], quantity: 1 }] },
    overflow: { stacks: [{ itemId: set.itemIds[2], quantity: 1 }], expiresAtMs: 10_000 },
    character: { ...state.character, equipment: { ...state.character.equipment, ring: set.itemIds[3] } },
};
const complete = (0, character_skins_1.characterSkinCollection)(state).find(skin => skin.setId === set.id);
ok(complete.ownedPieces === set.itemIds.length && complete.unlocked, 'Every ownership location must count toward a complete set');
state = (0, character_skins_1.discoverCharacterSkins)(state);
const skinId = (0, character_skins_1.equipmentSetSkinId)(set.id);
ok(state.character.unlockedSkinIds.includes(skinId), 'Complete-set ownership must be recorded');
ok(state.character.selectedSkinId === 'starting', 'Discovering a skin must not equip or select it');
ok((0, character_skins_1.selectCharacterSkin)(state, skinId).character.selectedSkinId === skinId, 'Approved progression artwork must be selectable');
ok((0, character_skins_1.selectCharacterSkin)(state, 'starting').character.selectedSkinId === 'starting', 'The starting skin must remain selectable');
const emptied = { ...state, inventory: { ...state.inventory, stacks: [] }, bank: { ...state.bank, stacks: [] }, overflow: { stacks: [], expiresAtMs: null }, character: { ...state.character, equipment: {} } };
ok((0, character_skins_1.characterSkinCollection)(emptied).find(skin => skin.id === skinId).unlocked, 'The skin must survive losing every set piece');
ok((0, save_migrations_1.migrateSave)(JSON.parse(JSON.stringify(emptied))).character.unlockedSkinIds.includes(skinId), 'The skin must survive save migration');
const allCarried = { ...(0, game_1.createCharacter)((0, game_1.newGame)(2_000), 'IRONWARDEN', 'Seller'), inventory: { stacks: set.itemIds.map(itemId => ({ itemId, quantity: 1 })), capacity: 30 } };
const sold = (0, game_1.sellItem)(allCarried, set.itemIds[0]);
ok(sold.character.unlockedSkinIds.includes(skinId), 'Selling a piece must first capture simultaneous full-set ownership');
ok(!(0, character_skins_1.characterSkinCollection)((0, game_1.createCharacter)((0, game_1.newGame)(3_000), 'BASTION', 'OtherClass')).some(skin => skin.id === skinId), 'Collections must remain character-class scoped');
ok(novice_sets_1.NOVICE_SETS.length === 9 && novice_sets_1.NOVICE_SETS.every(candidate => candidate.slots.length === 10 && !!candidate.appearanceId), 'Every class must have an artwork-ready ten-piece beginner set');
const novice = novice_sets_1.NOVICE_SETS.find(candidate => candidate.classId === 'IRONWARDEN');
let noviceState = (0, game_1.createCharacter)((0, game_1.newGame)(4_000), 'IRONWARDEN', 'BeginnerSkinTester');
noviceState = { ...noviceState, inventory: { ...noviceState.inventory, stacks: novice.slots.map(slot => ({ itemId: (0, novice_sets_1.noviceItemId)(novice.classId, slot), quantity: 1 })) } };
noviceState = (0, character_skins_1.discoverCharacterSkins)(noviceState);
const noviceSkinId = (0, character_skins_1.equipmentSetSkinId)(novice.id);
ok(noviceState.character.unlockedSkinIds.includes(noviceSkinId), 'A complete beginner set must unlock its matching skin');
ok((0, character_skins_1.selectCharacterSkin)(noviceState, noviceSkinId).character.selectedSkinId === noviceSkinId, 'An approved beginner skin must be selectable');
ok(equipment_sets_1.EQUIPMENT_SETS.length === 27 && equipment_sets_1.EQUIPMENT_SETS.every(candidate => !!candidate.appearanceId), 'Every accepted regional set must expose its front skin');
ok(character_skin_sets_1.CHARACTER_SKIN_SETS.some(candidate => candidate.id === 'aster_iron' && candidate.itemIds.length === 10), 'The accepted Aster Iron set must participate in skin discovery');
const harvestSet = character_skin_sets_1.CHARACTER_SKIN_SETS.find(candidate => candidate.id === 'harvestwake-harvest-defender');
ok(harvestSet.appearanceId === 'event-front-harvestwake-harvest-defender' && harvestSet.unlockEventSkinId === 'skin_harvestwake_ironwarden', 'Harvestwake must map its class reward to the approved production appearance');
let eventState = (0, game_1.createCharacter)((0, game_1.newGame)(5_000), 'IRONWARDEN', 'EventSkinTester');
eventState = { ...eventState, account: { ...eventState.account, unlockedEventSkinIds: ['skin_harvestwake_ironwarden'] } };
const eventSkinId = (0, character_skins_1.equipmentSetSkinId)(harvestSet.id);
ok((0, character_skins_1.characterSkinCollection)(eventState).find(skin => skin.id === eventSkinId)?.unlocked === true, 'An earned event reward must immediately appear in the class skin collection');
eventState = (0, character_skins_1.selectCharacterSkin)(eventState, eventSkinId);
ok(eventState.character.selectedSkinId === eventSkinId, 'An earned Harvestwake appearance must be selectable without equipment ownership');
eventState = (0, character_skins_1.discoverCharacterSkins)(eventState);
ok(eventState.character.unlockedSkinIds.includes(eventSkinId), 'Event appearance discovery must persist the selectable skin ID');
ok((0, save_migrations_1.migrateSave)(JSON.parse(JSON.stringify(eventState))).character.selectedSkinId === eventSkinId, 'Save migration must preserve a selected earned event appearance');
console.log('PASS: accepted front skins, progression sets, Aster Iron, beginner sets, and Harvestwake rewards unlock class-bound appearances');
