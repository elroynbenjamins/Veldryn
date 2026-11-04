import {ITEMS,itemDef} from '../content/items';
import {craftedGearInstances} from './crafted-gear-instances';
import {equipmentPouch} from './equipment-pouch';
import {isReleasedEquipmentItemId} from '../content/equipment-release';
import type {GameState,GearSlot} from './types';

/** Only carried gear that the character can equip now belongs in the slot picker. */
export function availableEquipmentForSlot(state:GameState,slot:GearSlot){
 const character=state.character;
 if(!character)return [];
 const owned=new Set(state.inventory.stacks.filter(stack=>stack.quantity>0).map(stack=>stack.itemId));
 return ITEMS.filter(item=>owned.has(item.id)&&item.type==='gear'&&isReleasedEquipmentItemId(item.id)&&item.slot===slot
  &&(!item.classRestriction||item.classRestriction===character.classId)
  &&character.level>=(item.requiredLevel??1));
}

/** Each unique Forge copy is selectable across Inventory and Equipment Pouch.
 * Legacy items are one choice per storage location so commands remain exact. */
export function availableEquipmentChoicesForSlot(state:GameState,slot:GearSlot):Array<{itemId:string;instanceId?:string;source:'inventory'|'equipment_pouch'}>{
 const character=state.character;if(!character)return [];
 const records=new Map(craftedGearInstances(state).map(record=>[record.id,record]));
 const choices:Array<{itemId:string;instanceId?:string;source:'inventory'|'equipment_pouch'}>=[];
 for(const source of ['inventory','equipment_pouch'] as const){
  const stacks=source==='inventory'?state.inventory.stacks:equipmentPouch(state).stacks;
  const legacySeen=new Set<string>();
  for(const stack of stacks){
   if(stack.quantity<=0)continue;
   const item=itemDef(stack.itemId);
   if(item.type!=='gear'||item.slot!==slot||!isReleasedEquipmentItemId(item.id)
     ||item.classRestriction&&item.classRestriction!==character.classId
     ||character.level<(item.requiredLevel??1))continue;
   if(stack.instanceId){
    const record=records.get(stack.instanceId);
    if(record?.itemId===item.id&&record.ownerCharacterId===character.id)
     choices.push({itemId:item.id,instanceId:stack.instanceId,source});
   }else if(!legacySeen.has(item.id)){
    legacySeen.add(item.id);choices.push({itemId:item.id,source});
   }
  }
 }
 return choices;
}
