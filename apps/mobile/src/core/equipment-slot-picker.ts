import {ITEMS,itemDef} from '../content/items';
import {craftedGearInstances} from './crafted-gear-instances';
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

/** Each physical Forge item is a separate candidate. Legacy stacks only
 * produce one candidate per item definition. Never collapse different rolls. */
export function availableEquipmentChoicesForSlot(state:GameState,slot:GearSlot):Array<{itemId:string;instanceId?:string}>{
 const character=state.character;if(!character)return [];
 const records=new Map(craftedGearInstances(state).map(record=>[record.id,record]));
 const legacySeen=new Set<string>();
 const choices:Array<{itemId:string;instanceId?:string}>=[];
 for(const stack of state.inventory.stacks){
  if(stack.quantity<=0)continue;
  const item=itemDef(stack.itemId);
  if(item.type!=='gear'||item.slot!==slot||!isReleasedEquipmentItemId(item.id)
    ||item.classRestriction&&item.classRestriction!==character.classId
    ||character.level<(item.requiredLevel??1))continue;
  if(stack.instanceId){
   const record=records.get(stack.instanceId);
   if(record?.itemId===item.id&&record.ownerCharacterId===character.id)
    choices.push({itemId:item.id,instanceId:stack.instanceId});
  }else if(!legacySeen.has(item.id)){
   legacySeen.add(item.id);choices.push({itemId:item.id});
  }
 }
 return choices;
}
