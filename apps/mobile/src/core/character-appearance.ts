import {noviceItemId,noviceSetFor} from '../content/novice-sets';
import {GameState} from './types';

/** Gameplay equipment progress only. Character artwork is selected independently. */
export function noviceSetProgress(state:GameState){
  const character=state.character!;const set=noviceSetFor(character.classId);
  const pieces=set.slots.map(slot=>{
    const id=noviceItemId(character.classId,slot),equipped=character.equipment[slot]===id;
    return {slot,id,equipped,crafted:character.craftedNoviceItemIds?.includes(id)??false,
      owned:equipped||[...state.inventory.stacks,...state.bank.stacks].some(stack=>stack.itemId===id&&stack.quantity>0)};
  });
  return {set,pieces,crafted:pieces.filter(piece=>piece.crafted).length,equipped:pieces.filter(piece=>piece.equipped).length,canEquip:pieces.every(piece=>piece.owned),unlocked:pieces.every(piece=>piece.crafted)};
}
