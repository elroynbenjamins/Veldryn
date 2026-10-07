import {ITEMS} from '../content/items';
import type {GameState,GearSlot} from './types';

/** Only carried gear that the character can equip now belongs in the slot picker. */
export function availableEquipmentForSlot(state:GameState,slot:GearSlot){
 const character=state.character;
 if(!character)return [];
 const owned=new Set(state.inventory.stacks.filter(stack=>stack.quantity>0).map(stack=>stack.itemId));
 return ITEMS.filter(item=>owned.has(item.id)&&item.type==='gear'&&item.slot===slot
  &&(!item.classRestriction||item.classRestriction===character.classId)
  &&character.level>=(item.requiredLevel??1));
}
