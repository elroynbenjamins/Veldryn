import { CHARACTER_SKIN_SETS, characterSkinSetsFor } from '../src/content/character-skin-sets';
import { characterSkinCollection, discoverCharacterSkins } from '../src/core/character-skins';
import { createCharacter, newGame } from '../src/core/game';

const state = createCharacter(newGame(1_000), 'IRONWARDEN', 'SkinTester');
if (CHARACTER_SKIN_SETS.length !== 0) throw new Error('V33 starts with a fresh skin registry');
if (characterSkinSetsFor('IRONWARDEN').length !== 0) throw new Error('Legacy class skin entries must not survive the v33 cutover');
if (characterSkinCollection(state).length !== 0) throw new Error('Fresh v33 characters must not inherit legacy equipment skins');
if (discoverCharacterSkins(state).character?.unlockedSkinIds?.join(',') !== 'starting') throw new Error('Fresh v33 discovery must not unlock legacy skins');

console.log('PASS: v33 starts with a fresh fixed-mannequin skin registry');
