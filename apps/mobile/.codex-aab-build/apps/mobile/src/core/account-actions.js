"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAccountCharacter = createAccountCharacter;
exports.transitionAccountFaithPractice = transitionAccountFaithPractice;
exports.setAccountFaithBlessing = setAccountFaithBlessing;
exports.switchAccountCharacter = switchAccountCharacter;
const game_1 = require("./game");
const account_roster_1 = require("./account-roster");
function snapshot(state) { return { character: structuredClone(state.character), inventory: structuredClone(state.inventory), overflow: structuredClone(state.overflow), activity: structuredClone(state.activity), skills: structuredClone(state.skills), quests: structuredClone(state.quests), currentRegionId: state.currentRegionId }; }
function createAccountCharacter(state, classId, name, body, now) {
    if (!state.character)
        return (0, game_1.createCharacter)(state, classId, name, body);
    if ((0, account_roster_1.accountCharacters)(state).length >= (0, account_roster_1.unlockedCharacterSlots)(state))
        throw new Error('Character slot is locked.');
    const next = (0, game_1.createCharacter)((0, game_1.newGame)(now), classId, name, body);
    const active = snapshot(state);
    const id = `LOCAL_CHAR_${(0, account_roster_1.accountCharacters)(state).length + 1}`;
    next.character.id = id;
    return { ...next, version: state.version, createdAtMs: state.createdAtMs, settings: state.settings, bank: state.bank, account: { ...state.account, createdCharacterCount: Math.max(state.account.createdCharacterCount, (0, account_roster_1.accountCharacters)(state).length + 1) }, otherCharacters: [...(state.otherCharacters ?? []), active] };
}
function transitionAccountFaithPractice(state, now, tierId, count) { const { reserveFaithPractice } = require('./faith'); return { state: reserveFaithPractice(state, tierId, count, now) }; }
function setAccountFaithBlessing(state, id, now) { const { updateFaithPreference } = require('./faith'); return updateFaithPreference(state, 'blessing', id); }
function switchAccountCharacter(state, id, now) {
    if (!state.character)
        return state;
    if (state.character.id === id)
        return state;
    const target = state.otherCharacters?.find(x => x.character.id === id);
    if (!target)
        throw new Error('Character is not owned.');
    const remaining = (state.otherCharacters ?? []).filter(x => x.character.id !== id);
    const active = snapshot(state);
    return { ...state, character: target.character, inventory: target.inventory, overflow: target.overflow, activity: target.activity, skills: target.skills, quests: target.quests, currentRegionId: target.currentRegionId, otherCharacters: [...remaining, active] };
}
