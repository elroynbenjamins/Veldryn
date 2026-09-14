export {blessingRows,faithLevel,selectedFaithBlessing} from './faith';
import {updateFaithPreference} from './faith';
import type {GameState} from './types';
export const selectFaithBlessing=(state:GameState,id:string)=>updateFaithPreference(state,'blessing',id);
export const setFaithFavorite=(state:GameState,id:string,enabled:boolean)=>updateFaithPreference(state,'favorite',id,enabled);
export const setFaithHideWeaker=(state:GameState,enabled:boolean)=>updateFaithPreference(state,'hide',undefined,enabled);
export const faithBlessingDef=undefined;
