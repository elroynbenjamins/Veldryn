"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const character_skin_sets_1 = require("../src/content/character-skin-sets");
const character_skins_1 = require("../src/core/character-skins");
const game_1 = require("../src/core/game");
const state = (0, game_1.createCharacter)((0, game_1.newGame)(1_000), 'IRONWARDEN', 'SkinTester');
if (character_skin_sets_1.CHARACTER_SKIN_SETS.length !== 0)
    throw new Error('V33 starts with a fresh skin registry');
if ((0, character_skin_sets_1.characterSkinSetsFor)('IRONWARDEN').length !== 0)
    throw new Error('Legacy class skin entries must not survive the v33 cutover');
if ((0, character_skins_1.characterSkinCollection)(state).length !== 0)
    throw new Error('Fresh v33 characters must not inherit legacy equipment skins');
if ((0, character_skins_1.discoverCharacterSkins)(state).character?.unlockedSkinIds?.join(',') !== 'starting')
    throw new Error('Fresh v33 discovery must not unlock legacy skins');
console.log('PASS: v33 starts with a fresh fixed-mannequin skin registry');
