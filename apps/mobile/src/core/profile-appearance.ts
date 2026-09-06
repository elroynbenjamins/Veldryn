import {GameState} from './types';
export function useLiveProfileAppearance(state:GameState):GameState{if(!state.character)return state;return {...state,character:{...state.character,profileAppearanceMode:'live'}}}
export function saveShowcaseAppearance(state:GameState):GameState{if(!state.character)return state;return {...state,character:{...state.character,profileAppearanceMode:'showcase',profileEquipmentSnapshot:{...state.character.equipment}}}}
export function profileEquipment(state:GameState){const c=state.character;if(!c)return {};return c.profileAppearanceMode==='showcase'?(c.profileEquipmentSnapshot??{}):c.equipment}
