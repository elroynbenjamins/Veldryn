"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_commands_1 = require("../src/core/game-commands");
const game_1 = require("../src/core/game");
function equal(actual, expected, message) { if (actual !== expected)
    throw new Error(`${message}: ${String(actual)} !== ${String(expected)}`); }
function different(actual, expected, message) { if (actual === expected)
    throw new Error(`${message}: values unexpectedly match`); }
function throws(action, message) { let failed = false; try {
    action();
}
catch {
    failed = true;
} if (!failed)
    throw new Error(message); }
const firstId = '11111111-1111-4111-8111-111111111111';
const secondId = '22222222-2222-4222-8222-222222222222';
let state = (0, game_commands_1.executeGameCommand)((0, game_1.newGame)(1), { type: 'create', args: { classId: 'IRONWARDEN', name: 'First', body: 'male' } }, 1, { characterId: firstId }).state;
throws(() => (0, game_commands_1.executeGameCommand)(state, { type: 'roster_create', args: { classId: 'BASTION', name: 'Locked', body: 'male' } }, 2, { characterId: secondId }), 'locked roster slot must reject creation');
throws(() => (0, game_commands_1.executeGameCommand)(state, { type: 'roster_create', args: { classId: 'NOT_A_CLASS', name: 'Invalid', body: 'male' } }, 2, { characterId: secondId }), 'unknown roster class must reject creation');
throws(() => (0, game_commands_1.executeGameCommand)(state, { type: 'roster_switch', args: { id: secondId } }, 2), 'unknown roster member must reject switching');
state = { ...state, version: 11, account: { ...state.account, unlockedCharacterSlots: 2 } };
state = (0, game_commands_1.executeGameCommand)(state, { type: 'roster_create', args: { classId: 'BASTION', name: 'Second', body: 'female' } }, 2, { characterId: secondId }).state;
equal(state.character?.id, secondId, 'active created roster member');
equal(state.version, 11, 'roster creation retains schema version');
equal(state.otherCharacters?.length, 1, 'previous character retained');
equal(state.otherCharacters?.[0].character.id, firstId, 'previous character identity');
different(state.character?.classId, state.otherCharacters?.[0].character.classId, 'character state is independent');
state = (0, game_commands_1.executeGameCommand)(state, { type: 'roster_switch', args: { id: firstId } }, 3).state;
equal(state.character?.id, firstId, 'switched active character');
equal(state.otherCharacters?.[0].character.id, secondId, 'switched character retained');
equal(state.character?.gold, 100, 'active wallet retained');
equal(state.otherCharacters?.[0].character.gold, 100, 'inactive wallet retained');
console.log('PASS online roster create and switch commands preserve independent character state');
