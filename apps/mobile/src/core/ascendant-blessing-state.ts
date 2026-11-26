import {isUltraLuxeProfileCosmetic} from './ultra-luxe-cosmetics';
import type {GameState} from './types';
import {
 activeAscendantBlessingTotals,isAscendantBlessing,previewAscendantBlessingTotals,
 type AscendantBlessing,type AscendantBlessingInput,
} from './ascendant-blessings';

export type AscendantBlessingEquipSlot='pet'|'background';

function equippedId(state:GameState,slot:AscendantBlessingEquipSlot){
 return slot==='pet'?state.character?.selectedCosmeticPetId:state.character?.profileBackgroundId;
}
function owned(state:GameState,slot:AscendantBlessingEquipSlot,id:string){
 return slot==='pet'
  ?(state.account.unlockedCosmeticPetIds??[]).includes(id)
  :(state.account.unlockedProfileBackgroundIds??[]).includes(id);
}
function eligible(slot:AscendantBlessingEquipSlot,id:string|undefined){
 return !!id&&isUltraLuxeProfileCosmetic(slot,id);
}
function selected(state:GameState,slot:AscendantBlessingEquipSlot){
 return slot==='pet'?state.character?.ascendantPetBlessing:state.character?.ascendantBackgroundBlessing;
}

export function ascendantBlessingInputFromState(state:GameState):AscendantBlessingInput{
 const petId=equippedId(state,'pet'),backgroundId=equippedId(state,'background');
 return {
  pet:{
   blessing:selected(state,'pet')??null,
   equipped:!!petId,
   owned:!!petId&&owned(state,'pet',petId),
   eligible:eligible('pet',petId),
  },
  background:{
   blessing:selected(state,'background')??null,
   equipped:!!backgroundId,
   owned:!!backgroundId&&owned(state,'background',backgroundId),
   eligible:eligible('background',backgroundId),
  },
 };
}
export function previewAscendantBlessingsForState(state:GameState){
 return previewAscendantBlessingTotals(ascendantBlessingInputFromState(state));
}
export function activeAscendantBlessingsForState(state:GameState){
 return activeAscendantBlessingTotals(ascendantBlessingInputFromState(state));
}
/** Selects a preference only for the currently equipped, authoritatively owned eligible cosmetic. */
export function selectAscendantBlessing(state:GameState,slot:AscendantBlessingEquipSlot,blessing:AscendantBlessing):GameState{
 if(!state.character)throw new Error('character_required');
 if(!isAscendantBlessing(blessing))throw new Error('invalid_ascendant_blessing');
 const id=equippedId(state,slot);
 if(!id||!eligible(slot,id))throw new Error('ascendant_cosmetic_not_equipped');
 if(!owned(state,slot,id))throw new Error('ascendant_cosmetic_not_owned');
 const field=slot==='pet'?'ascendantPetBlessing':'ascendantBackgroundBlessing';
 return {...state,character:{...state.character,[field]:blessing}};
}
