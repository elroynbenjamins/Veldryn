"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const game_1 = require("../src/core/game");
const arena_squad_1 = require("../src/core/arena-squad");
const ok = (value, message) => { if (!value)
    throw new Error(message); };
const state = () => (0, game_1.createCharacter)((0, game_1.newGame)(0), 'IRONWARDEN', 'Front');
const withRoster = () => { const first = state(); const second = (0, game_1.createCharacter)({ ...first, character: null }, 'WAYFINDER', 'Middle'); const third = (0, game_1.createCharacter)({ ...second, character: null }, 'DAWNKEEPER', 'Back'); second.character.id = 'LOCAL_CHAR_2'; third.character.id = 'LOCAL_CHAR_3'; return { ...third, character: first.character, otherCharacters: [{ character: second.character, inventory: second.inventory, overflow: second.overflow, activity: null, skills: second.skills, quests: second.quests, currentRegionId: second.currentRegionId }, { character: third.character, inventory: third.inventory, overflow: third.overflow, activity: null, skills: third.skills, quests: third.quests, currentRegionId: third.currentRegionId }], account: { ...third.account, createdCharacterCount: 3 } }; };
const base = withRoster();
base.character.level = 15;
base.otherCharacters.forEach(entry => { entry.character.level = 15; });
const chosen = (0, arena_squad_1.setArenaSquadSlot)((0, arena_squad_1.setArenaSquadSlot)((0, arena_squad_1.setArenaSquadSlot)(base, 0, base.character.id), 1, base.otherCharacters[0].character.id), 2, base.otherCharacters[1].character.id);
ok((0, arena_squad_1.arenaSquadIds)(chosen).length === 3, 'Arena must expose three stable slots');
ok((0, arena_squad_1.arenaSquadStatus)(chosen).ready, 'Level-one fixtures should be promoted for readiness test');
const moved = (0, arena_squad_1.setArenaSquadSlot)(chosen, 0, base.otherCharacters[0].character.id);
ok((0, arena_squad_1.arenaSquadIds)(moved)[0] === base.otherCharacters[0].character.id && (0, arena_squad_1.arenaSquadIds)(moved)[1] === '', 'Moving a character must clear its prior slot');
const normalized = { ...chosen, account: { ...chosen.account, arenaSquadCharacterIds: ['missing', base.character.id, base.character.id] } };
ok((0, arena_squad_1.arenaSquadIds)(normalized)[0] === '' && (0, arena_squad_1.arenaSquadIds)(normalized)[1] === base.character.id, 'Invalid and duplicate saved IDs must be ignored');
console.log('arena squad tests passed');
