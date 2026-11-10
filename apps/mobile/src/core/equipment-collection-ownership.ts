import type {GameState} from './types';

/** Definition-level ownership badges in the Smithing/Tailoring set browser.
 * A crafted piece counts regardless of which personal storage holds it. */
export function ownedEquipmentDefinitionIds(state:GameState):Set<string>{
 const owned=new Set<string>();
 for(const storage of [state.inventory,state.bank,state.character?.equipmentPouch]){
  for(const stack of storage?.stacks??[])if(stack.quantity>0)owned.add(stack.itemId);
 }
 for(const itemId of Object.values(state.character?.equipment??{}))if(itemId)owned.add(itemId);
 return owned;
}
