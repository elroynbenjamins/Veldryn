import { CHARACTER_SKIN_SETS, characterSkinSetsFor } from '../src/content/character-skin-sets';
import { characterSkinCollection, discoverCharacterSkins, equipmentSetSkinId, selectCharacterSkin } from '../src/core/character-skins';
import { createCharacter, newGame } from '../src/core/game';

const state = createCharacter(newGame(1_000), 'IRONWARDEN', 'SkinTester');
const ironwardenSets=characterSkinSetsFor('IRONWARDEN');
if (CHARACTER_SKIN_SETS.length !== 3 || ironwardenSets.length !== 3) throw new Error('Only the three approved Ironwarden T1 skins should be registered');
if (characterSkinSetsFor('BASTION').length !== 0) throw new Error('Ironwarden skins must not leak to other classes');
if (characterSkinCollection(state).some(skin=>skin.unlocked||!skin.artworkReady)) throw new Error('New character skins must start locked with artwork ready');
if (discoverCharacterSkins(state).character?.unlockedSkinIds?.join(',') !== 'starting') throw new Error('Fresh character discovery must not unlock an incomplete set');

for(const set of ironwardenSets){
  const owned={...state,inventory:{...state.inventory,stacks:[...state.inventory.stacks,...set.itemIds.map(itemId=>({itemId,quantity:1}))]}};
  const unlocked=discoverCharacterSkins(owned);
  const skinId=equipmentSetSkinId(set.id);
  if(!unlocked.character?.unlockedSkinIds?.includes(skinId))throw new Error(`${set.id} did not unlock after all ten pieces were owned`);
  if(selectCharacterSkin(unlocked,skinId).character?.selectedSkinId!==skinId)throw new Error(`${set.id} could not be selected`);
}

console.log('PASS: approved Ironwarden T1 skins unlock and select independently');
