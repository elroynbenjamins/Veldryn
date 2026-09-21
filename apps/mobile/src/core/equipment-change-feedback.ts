import {itemDef} from '../content/items';
import {equipmentSetDef,equippedSetPieceCount} from '../content/equipment-sets';
import {effectiveStats} from './game';
import type {GameState,GearSlot} from './types';

const SLOTS:GearSlot[]=['weapon','offhand','helmet','chest','legs','boots','gloves','cape','amulet','ring'];
const MILESTONES=[
 {pieces:2,key:'twoPiece' as const},
 {pieces:4,key:'fourPiece' as const},
 {pieces:6,key:'sixPiece' as const},
 {pieces:8,key:'eightPiece' as const},
 {pieces:10,key:'tenPiece' as const},
];

export interface EquipmentFeedbackSnapshot{
 characterId?:string;
 equipment:Partial<Record<GearSlot,string>>;
 stats:{attack:number;defense:number;hp:number;power:number};
}
export interface EquipmentSetFeedback{
 type:'activated'|'lost';
 setId:string;
 setName:string;
 pieces:number;
 bonus:string;
}
export interface EquipmentChangeFeedback{
 action:'equipped'|'unequipped'|'replaced';
 slot:GearSlot;
 itemId?:string;
 itemName?:string;
 previousItemId?:string;
 previousItemName?:string;
 delta:{attack:number;defense:number;hp:number;power:number};
 setChanges:EquipmentSetFeedback[];
}

export function equipmentFeedbackSnapshot(state:GameState):EquipmentFeedbackSnapshot{
 const stats=effectiveStats(state);
 return {
  characterId:state.character?.id,
  equipment:{...(state.character?.equipment??{})},
  stats:{attack:stats.attack,defense:stats.defense,hp:stats.hp,power:stats.power},
 };
}

function setIdFor(itemId:unknown){
 if(typeof itemId!=='string'||!itemId)return undefined;
 try{return itemDef(itemId).equipmentSetId}catch{return undefined}
}
function setChanges(before:EquipmentFeedbackSnapshot,after:EquipmentFeedbackSnapshot,fromId?:string,toId?:string):EquipmentSetFeedback[]{
 const setIds=[...new Set([setIdFor(fromId),setIdFor(toId)].filter((id):id is string=>Boolean(id)))],changes:EquipmentSetFeedback[]=[];
 for(const setId of setIds){
  const set=equipmentSetDef(setId);if(!set)continue;
  const beforeCount=equippedSetPieceCount(before.equipment,set),afterCount=equippedSetPieceCount(after.equipment,set);
  for(const milestone of MILESTONES){
   if(beforeCount<milestone.pieces&&afterCount>=milestone.pieces)changes.push({type:'activated',setId,setName:set.name,pieces:milestone.pieces,bonus:set[milestone.key]});
   else if(beforeCount>=milestone.pieces&&afterCount<milestone.pieces)changes.push({type:'lost',setId,setName:set.name,pieces:milestone.pieces,bonus:set[milestone.key]});
  }
 }
 return changes;
}

/** Derives one-slot equipment feedback only after committed state changes. */
export function equipmentChangeFeedback(before:EquipmentFeedbackSnapshot,after:EquipmentFeedbackSnapshot):EquipmentChangeFeedback|null{
 if(!before.characterId||before.characterId!==after.characterId)return null;
 const changed=SLOTS.filter(slot=>(before.equipment[slot]??'')!==(after.equipment[slot]??''));
 if(changed.length!==1)return null;
 const slot=changed[0],previousItemId=before.equipment[slot],itemId=after.equipment[slot];
 const action=previousItemId&&itemId?'replaced':itemId?'equipped':'unequipped';
 return {
  action,slot,itemId,itemName:itemId?itemDef(itemId).name:undefined,previousItemId,previousItemName:previousItemId?itemDef(previousItemId).name:undefined,
  delta:{attack:after.stats.attack-before.stats.attack,defense:after.stats.defense-before.stats.defense,hp:after.stats.hp-before.stats.hp,power:after.stats.power-before.stats.power},
  setChanges:setChanges(before,after,previousItemId,itemId),
 };
}
