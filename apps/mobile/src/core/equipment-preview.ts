import {itemDef} from '../content/items';
import {GameState} from './types';

/** Returns an equipment comparison state without mutating or consuming items. */
export function previewEquipment(state:GameState,id:string):GameState{
  if(!state.character)throw new Error('No character');
  const item=itemDef(id);
  if(item.type!=='gear'||!item.slot)throw new Error('Only equipment can be previewed');
  if(item.classRestriction&&item.classRestriction!==state.character.classId)throw new Error('This equipment belongs to another class');
  const hasUnmarkedSpare=state.inventory.stacks.some(row=>row.itemId===id&&row.instanceId===undefined&&row.quantity>0);
  const replacingSameEquippedItem=state.character.equipment[item.slot]===id&&hasUnmarkedSpare;
  // A preview of an unmarked Inventory duplicate must not inherit the upgraded
  // equipped item's legacy itemId-based rank, gems or exact Forge instance ID.
  const gearEnhancements={...(state.character.gearEnhancements??{})};
  const equipmentInstanceIds={...(state.character.equipmentInstanceIds??{})};
  if(replacingSameEquippedItem){delete gearEnhancements[id];delete equipmentInstanceIds[item.slot];}
  return {...state,character:{...state.character,equipment:{...state.character.equipment,[item.slot]:id},gearEnhancements,equipmentInstanceIds}};
}
