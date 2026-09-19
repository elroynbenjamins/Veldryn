"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARENA_POSITIONS = exports.ARENA_MIN_LEVEL = exports.ARENA_SQUAD_SIZE = void 0;
exports.arenaSquadIds = arenaSquadIds;
exports.setArenaSquadSlot = setArenaSquadSlot;
exports.arenaSquadStatus = arenaSquadStatus;
const classes_1 = require("../content/classes");
const account_roster_1 = require("./account-roster");
exports.ARENA_SQUAD_SIZE = 3;
exports.ARENA_MIN_LEVEL = 15;
exports.ARENA_POSITIONS = ['Front', 'Middle', 'Back'];
/** Returns three stable slots. Invalid, duplicate, or no-longer-owned IDs are empty. */
function arenaSquadIds(state) {
    const owned = new Set((0, account_roster_1.accountCharacters)(state).map(entry => entry.character.id));
    const saved = state.account.arenaSquadCharacterIds ?? [];
    const seen = new Set();
    return Array.from({ length: exports.ARENA_SQUAD_SIZE }, (_, index) => {
        const id = typeof saved[index] === 'string' ? saved[index] : '';
        if (!id || !owned.has(id) || seen.has(id))
            return '';
        seen.add(id);
        return id;
    });
}
function setArenaSquadSlot(state, slot, characterId) {
    const owned = (0, account_roster_1.accountCharacters)(state).map(entry => entry.character.id);
    if (characterId && !owned.includes(characterId))
        throw new Error('That character does not belong to this account.');
    const ids = arenaSquadIds(state);
    if (characterId) {
        const duplicate = ids.findIndex((id, index) => index !== slot && id === characterId);
        if (duplicate >= 0)
            ids[duplicate] = '';
    }
    ids[slot] = characterId ?? '';
    return { ...state, account: { ...state.account, arenaSquadCharacterIds: ids } };
}
function arenaSquadStatus(state) {
    const byId = new Map((0, account_roster_1.accountCharacters)(state).map(entry => [entry.character.id, entry]));
    const ids = arenaSquadIds(state);
    const members = ids.map(id => id ? byId.get(id) : undefined).filter((entry) => !!entry);
    const below = members.filter(entry => entry.character.level < exports.ARENA_MIN_LEVEL);
    const roles = members.map(entry => classes_1.CLASSES.find(def => def.id === entry.character.classId)?.role ?? 'Damage');
    const selectedCount = ids.filter(Boolean).length;
    const ready = selectedCount === exports.ARENA_SQUAD_SIZE && members.length === exports.ARENA_SQUAD_SIZE && !below.length;
    const reason = ready ? undefined : selectedCount < exports.ARENA_SQUAD_SIZE ? 'Select three different account characters.' : below.length ? `Every Arena character must be level ${exports.ARENA_MIN_LEVEL} or higher.` : 'The saved Arena squad is invalid.';
    return { ids, members, selectedCount, ready, reason, roles, averageLevel: members.length ? members.reduce((sum, entry) => sum + entry.character.level, 0) / members.length : 0, balanced: roles.includes('Tank') && roles.includes('Damage') && roles.includes('Support') };
}
