import {itemDef} from '../content/items';
import {craftedGearInstances} from './crafted-gear-instances';
import {GameState} from './types';

/**
 * Project an equipment swap without consuming gear or mutating live state.
 * An exact Forge copy must carry its own instance ID into the projected
 * character, otherwise effectiveStats silently uses the wrong quality,
 * rarity, socketed gems and enhancement rank.
 */
export function previewEquipment(state:GameState,id:string,instanceId?:string|null):GameState{
  if(!state.character)throw new Error('No character');
  const item=itemDef(id);
  if(item.type!=='gear'||!item.slot)throw new Error('Only equipment can be previewed');
  if(item.classRestriction&&item.classRestriction!==state.character.classId)throw new Error('This equipment belongs to another class');
  if(instanceId){
    const instance=craftedGearInstances(state).find(row=>row.id===instanceId&&row.itemId===id);
    if(!instance||instance.ownerCharacterId!==state.character.id||
      !state.inventory.stacks.some(row=>row.itemId===id&&row.instanceId===instanceId&&row.quantity>0))
      throw new Error('This equipment copy is no longer in Inventory');
  }else if(!state.inventory.stacks.some(row=>row.itemId===id&&row.instanceId===undefined&&row.quantity>0)){
    // Legacy callers may preview an item before it is obtained, but never
    // silently compare a random Forge copy without selecting its identity.
    if(state.inventory.stacks.some(row=>row.itemId===id&&row.instanceId!==undefined))
      throw new Error('Select a specific equipment copy to compare');
  }
  const hasUnmarkedSpare=!instanceId&&state.inventory.stacks.some(row=>row.itemId===id&&row.instanceId===undefined&&row.quantity>0);
  const replacingSameEquippedItem=state.character.equipment[item.slot]===id&&hasUnmarkedSpare;
  const gearEnhancements={...(state.character.gearEnhancements??{})};
  const equipmentInstanceIds={...(state.character.equipmentInstanceIds??{})};
  // A legacy unmarked duplicate does not inherit the equipped original's gems.
  if(replacingSameEquippedItem)delete gearEnhancements[id];
  // Never carry the replaced item's exact marker into a new equip.
  if(instanceId)equipmentInstanceIds[item.slot]=instanceId;
  else delete equipmentInstanceIds[item.slot];
  return {...state,character:{...state.character,
    equipment:{...state.character.equipment,[item.slot]:id},
    gearEnhancements,equipmentInstanceIds}};
}
