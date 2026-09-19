"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../src/core/game");
const equipment_screen_1 = require("../src/core/equipment-screen");
const state = (0, game_1.createCharacter)((0, game_1.newGame)(0), 'IRONWARDEN', 'Equipment Test', 'female');
const model = (0, equipment_screen_1.equipmentScreenModel)(state);
if (equipment_screen_1.EQUIPMENT_SLOT_ORDER.length !== 10 || new Set(equipment_screen_1.EQUIPMENT_SLOT_ORDER).size !== 10)
    throw new Error('Equipment screen must expose ten unique canonical slots');
if (model.slots.length !== 10 || model.equippedCount !== 1)
    throw new Error('Equipment screen model does not reflect live equipment state');
if (model.slots.find(slot => slot.slot === 'weapon')?.itemId !== 'basic_sword')
    throw new Error('Equipment screen did not read the equipped weapon');
if (model.stats.maxHp !== 155 || model.stats.attack !== 19 || model.stats.defense !== 19)
    throw new Error('Equipment screen stats must come from effectiveStats');
if (model.loadouts.map(loadout => loadout.id).join(',') !== 'LOAD_001,LOAD_002,LOAD_003')
    throw new Error('Ironwarden loadout guides must follow canonical order');
const enhancedState = { ...state, character: { ...state.character, gearEnhancements: { basic_sword: { rank: 2, failures: 1, gemIds: [] } } } };
const enhancedWeapon = (0, equipment_screen_1.equipmentScreenModel)(enhancedState).slots.find(slot => slot.slot === 'weapon');
if (enhancedWeapon?.enhancement?.rank !== 2 || enhancedWeapon.enhancedStats?.attack !== 5)
    throw new Error('Equipment tiles and inspector must expose the live enhanced rank and stats');
if (state.character?.bodyPresentation !== 'female')
    throw new Error('Saved character presentation must remain authoritative');
console.log('PASS: equipment screen uses ten live slots, canonical stats, loadout guides and saved presentation');
