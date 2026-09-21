import {itemDef} from '../content/items';
import {gearInstanceById,migrateToPerInstanceGear} from './gear-instances';
import {GameState} from './types';

/** Returns an exact-copy equipment comparison state without mutating or consuming items. */
export function previewEquipment(state:GameState,itemId:string,instanceId?:string):GameState{
  const projected=migrateToPerInstanceGear(state);if(!projected.character)throw new Error('No character');
  const item=itemDef(itemId);if(item.type!=='gear'||!item.slot)throw new Error('Only equipment can be previewed');
  if(item.classRestriction&&item.classRestriction!==projected.character.classId)throw new Error('This equipment belongs to another class');
  if(instanceId){const instance=gearInstanceById(projected,instanceId);if(!instance||instance.itemId!==itemId)throw new Error('Equipment copy does not match this item');}
  return {...projected,character:{...projected.character,equipment:{...projected.character.equipment,[item.slot]:itemId},equipmentInstanceIds:{...(projected.character.equipmentInstanceIds??{}),...(instanceId?{[item.slot]:instanceId}:{})}}};
}
