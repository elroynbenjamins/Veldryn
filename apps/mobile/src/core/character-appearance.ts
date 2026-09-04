import {CLASSES} from '../content/classes';
import {noviceItemId,noviceSetFor} from '../content/novice-sets';
import {GameState,GearSlot} from './types';

const visibleSlots:GearSlot[]=['weapon','offhand','helmet','chest','gloves','boots','legs','cape'];
export function noviceSetProgress(state:GameState){
  const character=state.character!;const set=noviceSetFor(character.classId);
  const pieces=set.slots.map(slot=>{
    const id=noviceItemId(character.classId,slot),equipped=character.equipment[slot]===id;
    return {slot,id,equipped,crafted:character.craftedNoviceItemIds?.includes(id)??false,
      owned:equipped||[...state.inventory.stacks,...state.bank.stacks].some(stack=>stack.itemId===id&&stack.quantity>0)};
  });
  return {set,pieces,crafted:pieces.filter(piece=>piece.crafted).length,equipped:pieces.filter(piece=>piece.equipped).length,canEquip:pieces.every(piece=>piece.owned),unlocked:pieces.every(piece=>piece.crafted)};
}
export function resolveCharacterAppearance(state:GameState):'starting'|'first-crafted'|'mixed'{
  const character=state.character;if(!character)return 'mixed';
  const progress=noviceSetProgress(state);
  if(progress.pieces.every(piece=>piece.equipped)&&visibleSlots.every(slot=>progress.set.slots.includes(slot)||!character.equipment[slot]))return 'first-crafted';
  const start=CLASSES.find(def=>def.id===character.classId)!.starterEquipment.weapon;
  if(character.equipment.weapon===start&&visibleSlots.every(slot=>slot==='weapon'||!character.equipment[slot]))return 'starting';
  return 'mixed';
}
