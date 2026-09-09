import {itemDef} from '../content/items';
import {GameState} from './types';

/** Returns an equipment comparison state without mutating or consuming items. */
export function previewEquipment(state:GameState,id:string):GameState{
  if(!state.character)throw new Error('No character');
  const item=itemDef(id);
  if(item.type!=='gear'||!item.slot)throw new Error('Only equipment can be previewed');
  if(item.classRestriction&&item.classRestriction!==state.character.classId)throw new Error('This equipment belongs to another class');
  return {...state,character:{...state.character,equipment:{...state.character.equipment,[item.slot]:id}}};
}
