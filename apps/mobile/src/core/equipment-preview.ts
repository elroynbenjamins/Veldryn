import {itemDef} from '../content/items';
import {craftedGearInstances} from './crafted-gear-instances';
import {equipCraftedGearInstance} from './crafted-gear-ownership';
import {equipmentPouch} from './equipment-pouch';
import {equipItem,equipItemFromEquipmentPouch} from './game';
import type {GameState} from './types';

export type EquipmentPreviewSource='inventory'|'equipment_pouch';

/**
 * Project the exact same pure reducer that the authoritative equip command
 * will execute. Do not hand-edit equipmentInstanceIds, gem sockets or
 * enhancements: doing so can disagree with the real equip result.
 *
 * This function never persists the projected state. In particular, an
 * invalid or impossible swap (missing copy, incompatible class, low level,
 * blocked replacement, full storage) throws rather than displaying made-up
 * post-equip stats.
 *
 * Historical Codex/source inspectors can preview an unobtained definition
 * only when no physical copy of that definition exists in this storage.
 * Those speculative previews are not equipped, and the equip UI always
 * supplies a physical owned item.
 */
export function previewEquipment(state:GameState,id:string,instanceId?:string|null,source:EquipmentPreviewSource='inventory'):GameState{
  if(!state.character)throw new Error('No character');
  const item=itemDef(id);
  if(item.type!=='gear'||!item.slot)throw new Error('Only equipment can be previewed');
  if(item.classRestriction&&item.classRestriction!==state.character.classId)
    throw new Error('This equipment belongs to another class');
  if(state.character.level<(item.requiredLevel??1))
    throw new Error(`Requires character level ${item.requiredLevel}`);
  const stacks=source==='equipment_pouch'?equipmentPouch(state).stacks:state.inventory.stacks;

  if(instanceId){
    const instance=craftedGearInstances(state).find(row=>row.id===instanceId&&row.itemId===id);
    if(!instance||instance.ownerCharacterId!==state.character.id||
       !stacks.some(row=>row.itemId===id&&row.instanceId===instanceId&&row.quantity===1))
      throw new Error('This exact equipment copy is no longer in character storage');
    return equipCraftedGearInstance(state,instanceId);
  }

  if(stacks.some(row=>row.itemId===id&&row.instanceId===undefined&&row.quantity>0))
    return source==='equipment_pouch'?equipItemFromEquipmentPouch(state,id):equipItem(state,id);

  if(stacks.some(row=>row.itemId===id&&row.instanceId!==undefined))
    throw new Error('Choose a specific equipment copy to compare');

  // Informational, unobtained equipment preview for recipe/Codex inspectors.
  // Never claim a real equip can occur when ownership has not been verified.
  if(state.character.equipmentInstanceIds?.[item.slot])
    throw new Error('An equipped unique copy must be replaced by an exact owned copy');
  return {...state,character:{...state.character,
    equipment:{...state.character.equipment,[item.slot]:id}}};
}
