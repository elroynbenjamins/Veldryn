"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../src/core/game");
const customization_1 = require("../src/core/customization");
const save_migrations_1 = require("../src/core/save-migrations");
function ok(value, message) { if (!value)
    throw new Error(message); }
const choices = { skinTone: 'deep', hairStyle: 'braid', hairColor: 'silver' };
const initial = (0, game_1.newGame)(123);
const state = (0, game_1.createCharacter)(initial, 'BASTION', 'Elora', 'female', choices);
ok(initial.character === null, 'Creation does not mutate original save');
ok(JSON.stringify(state.character.customization) === JSON.stringify(choices), 'Creation stores choices');
const restored = (0, save_migrations_1.migrateSave)(JSON.parse(JSON.stringify(state)));
ok(JSON.stringify(restored.character.customization) === JSON.stringify(choices), 'Choices survive save round trip');
const old = JSON.parse(JSON.stringify(state));
delete old.character.customization;
ok(JSON.stringify((0, save_migrations_1.migrateSave)(old).character.customization) === JSON.stringify(customization_1.DEFAULT_CUSTOMIZATION), 'Old saves receive defaults');
for (const invalid of [null, undefined, 42, 'braid', { skinTone: 'invalid', hairStyle: 'invalid', hairColor: 'invalid' }]) {
    ok(JSON.stringify((0, customization_1.normalizeCustomization)(invalid)) === JSON.stringify(customization_1.DEFAULT_CUSTOMIZATION), 'Malformed choices safely normalized');
}
const baseline = (0, game_1.createCharacter)((0, game_1.newGame)(123), 'BASTION', 'Elora', 'female');
ok(JSON.stringify(baseline.character.equipment) === JSON.stringify(state.character.equipment), 'Customization does not grant gear');
ok(baseline.character.hp === state.character.hp && baseline.character.attack === state.character.attack, 'Customization does not change stats');
for (const body of ['male', 'female'])
    for (const style of customization_1.HAIR_STYLES) {
        ok((0, game_1.createCharacter)((0, game_1.newGame)(1), 'IRONWARDEN', 'Test', body, { ...choices, hairStyle: style.id }).character.customization.hairStyle === style.id, 'Every style works with both bodies');
    }
ok((0, save_migrations_1.migrateSave)((0, game_1.newGame)(1)).character === null, 'Empty saves stay empty');
const editingSnapshot = JSON.stringify(state);
const edited = (0, game_1.updateCharacterCustomization)(state, { skinTone: 'fair', hairStyle: 'bun', hairColor: 'auburn' });
ok(JSON.stringify(state) === editingSnapshot, 'Appearance editing does not mutate original state');
ok(edited.character.customization.hairStyle === 'bun', 'Appearance editing stores the selected style');
ok(JSON.stringify(edited.character.equipment) === JSON.stringify(state.character.equipment), 'Appearance editing preserves equipment');
ok(edited.activity === state.activity && edited.character.hp === state.character.hp && edited.character.xp === state.character.xp, 'Appearance editing preserves gameplay state');
let noCharacterRejected = false;
try {
    (0, game_1.updateCharacterCustomization)((0, game_1.newGame)(1), choices);
}
catch {
    noCharacterRejected = true;
}
ok(noCharacterRejected, 'Appearance editing requires a character');
console.log('PASS: customization persistence, old saves, invalid input, all styles and unchanged gameplay');
