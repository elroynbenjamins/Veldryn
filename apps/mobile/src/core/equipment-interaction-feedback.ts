import {itemDef} from '../content/items';
import {effectiveStats} from './game';
import type {GameState,GearSlot} from './types';

export interface EquipmentEquipFeedback{
  slot:GearSlot;
  itemId:string;
  itemName:string;
  replacedItemId?:string;
  replacedItemName?:string;
  deltas:{hp:number;attack:number;defense:number};
}

const SLOTS:GearSlot[]=['weapon','offhand','helmet','chest','legs','boots','gloves','cape','amulet','ring'];

/** Detects a committed single-slot equipment change from two authoritative/local states. */
export function equipmentEquipFeedback(before:GameState|undefined|null,after:GameState|undefined|null):EquipmentEquipFeedback|null{
  if(!before?.character||!after?.character||before.character.id!==after.character.id)return null;
  const changed=SLOTS.filter(slot=>before.character!.equipment[slot]!==after.character!.equipment[slot]);
  if(changed.length!==1)return null;
  const slot=changed[0],itemId=after.character.equipment[slot],replacedItemId=before.character.equipment[slot];
  if(!itemId)return null;
  let itemName=itemId,replacedItemName=replacedItemId;
  try{itemName=itemDef(itemId).name}catch{}
  if(replacedItemId){try{replacedItemName=itemDef(replacedItemId).name}catch{}}
  const previous=effectiveStats(before),next=effectiveStats(after);
  return {
    slot,itemId,itemName,
    ...(replacedItemId?{replacedItemId,replacedItemName}:{}),
    deltas:{hp:next.hp-previous.hp,attack:next.attack-previous.attack,defense:next.defense-previous.defense},
  };
}

export function equipmentEquipDeltaLabel(feedback:EquipmentEquipFeedback){
  const rows:[string,number][]=[['ATK',feedback.deltas.attack],['DEF',feedback.deltas.defense],['HP',feedback.deltas.hp]];
  const changed=rows.filter(([,value])=>value!==0).map(([label,value])=>`${label} ${value>0?'+':''}${value}`);
  return changed.length?changed.join(' · '):'No primary stat change';
}
