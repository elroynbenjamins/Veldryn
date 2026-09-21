import {characterSkinSetsFor} from '../content/character-skin-sets';
import {GameState} from './types';

export interface CharacterSkinCollectionEntry{
  id:string;
  setId:string;
  name:string;
  unlocked:boolean;
  ownedPieces:number;
  requiredItemIds:string[];
  artworkReady:boolean;
  selected:boolean;
}

/** Stable collection ID. It deliberately does not depend on an artwork filename. */
export function equipmentSetSkinId(setId:string){return `equipment-set:${setId}`;}

function ownedItemIds(state:GameState){
  const ids=new Set<string>();
  for(const stack of [...state.inventory.stacks,...state.bank.stacks,...state.overflow.stacks]){
    if(stack.quantity>0)ids.add(stack.itemId);
  }
  if(state.character){
    for(const id of Object.values(state.character.equipment))if(id)ids.add(id);
  }
  return ids;
}

function eligibleSets(state:GameState){
  if(!state.character)return [];
  return characterSkinSetsFor(state.character.classId);
}

/** Records complete-set ownership permanently without activating unapproved artwork. */
export function discoverCharacterSkins(state:GameState):GameState{
  if(!state.character)return state;
  const validIds=new Set(eligibleSets(state).map(set=>equipmentSetSkinId(set.id)));
  const unlocked=new Set((state.character.unlockedSkinIds??[]).filter(id=>validIds.has(id)));
  const owned=ownedItemIds(state);
  for(const set of eligibleSets(state)){
    const eventUnlocked=set.unlockEventSkinId&&state.character.unlockedEventSkinIds?.includes(set.unlockEventSkinId);
    const equipmentUnlocked=set.itemIds.length>0&&set.itemIds.every(id=>owned.has(id));
    if(eventUnlocked||equipmentUnlocked)unlocked.add(equipmentSetSkinId(set.id));
  }
  const next=['starting',...unlocked];
  const selectableIds=new Set(['starting',...eligibleSets(state).filter(set=>set.appearanceId).map(set=>equipmentSetSkinId(set.id))]);
  const selectedSkinId=next.includes(state.character.selectedSkinId??'starting')&&selectableIds.has(state.character.selectedSkinId??'starting')?state.character.selectedSkinId??'starting':'starting';
  const previous=state.character.unlockedSkinIds??[];
  if(next.length===previous.length&&next.every(id=>previous.includes(id))&&state.character.selectedSkinId===selectedSkinId)return state;
  return {...state,character:{...state.character,unlockedSkinIds:next,selectedSkinId}};
}

export function selectCharacterSkin(state:GameState,skinId:string):GameState{
  if(!state.character)throw new Error('Create a character before choosing a skin.');
  if(skinId==='starting')return {...state,character:{...state.character,selectedSkinId:'starting'}};
  const set=eligibleSets(state).find(candidate=>equipmentSetSkinId(candidate.id)===skinId);
  if(!set)throw new Error('This skin is not available for your class.');
  const eventUnlocked=set.unlockEventSkinId&&state.character.unlockedEventSkinIds?.includes(set.unlockEventSkinId);
  if(!(state.character.unlockedSkinIds??[]).includes(skinId)&&!eventUnlocked)throw new Error(set.unlockEventSkinId?'Earn this appearance from its event to unlock it.':'Own the complete equipment set to unlock this skin.');
  if(!set.appearanceId)throw new Error('This supplied skin is still awaiting visual approval.');
  return {...state,character:{...state.character,selectedSkinId:skinId}};
}

export function characterSkinCollection(state:GameState):CharacterSkinCollectionEntry[]{
  if(!state.character)return [];
  const owned=ownedItemIds(state);
  const unlocked=new Set(state.character.unlockedSkinIds??[]);
  return eligibleSets(state).map(set=>{
    const id=equipmentSetSkinId(set.id);
    const ownedPieces=set.itemIds.filter(itemId=>owned.has(itemId)).length;
    return {
      id,
      setId:set.id,
      name:set.name,
      unlocked:unlocked.has(id)||Boolean(set.unlockEventSkinId&&state.character!.unlockedEventSkinIds?.includes(set.unlockEventSkinId))||(set.itemIds.length>0&&ownedPieces===set.itemIds.length),
      ownedPieces,
      requiredItemIds:set.itemIds,
      artworkReady:!!set.appearanceId,
      selected:state.character!.selectedSkinId===id,
    };
  });
}

export function newlyUnlockedCharacterSkins(before:GameState|null,after:GameState):CharacterSkinCollectionEntry[]{
  const previous=new Set(before?.character?.unlockedSkinIds??[]);
  return characterSkinCollection(after).filter(skin=>skin.unlocked&&!previous.has(skin.id));
}
