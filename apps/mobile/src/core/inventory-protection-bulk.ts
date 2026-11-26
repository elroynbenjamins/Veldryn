import {itemDef} from '../content/items';
import {craftedGearInstances} from './crafted-gear-instances';
import {setCraftedGearInstanceLock} from './crafted-gear-ownership';
import {inventoryBulkSelectionId} from './inventory-bulk';
import type {GameState,ItemStack} from './types';

export type InventoryProtectionKind='lock'|'favorite';

/**
 * One authoritative, atomic preference change for up to 100 selected stacks.
 * Favorites and legacy locks are item-type preferences; fully linked forged
 * equipment locks target the exact physical copy. No item is guessed by name.
 */
export function applyBulkInventoryProtection(
  state:GameState,selectedIds:readonly string[],kind:InventoryProtectionKind,enabled:boolean,
):GameState{
  if(kind!=='lock'&&kind!=='favorite')throw new Error('Invalid inventory protection action');
  if(typeof enabled!=='boolean')throw new Error('Invalid inventory protection state');
  if(!Array.isArray(selectedIds)||selectedIds.length<1||selectedIds.length>100
    ||selectedIds.some(id=>typeof id!=='string'||!id.trim()||id.length>190))
    throw new Error('Select between 1 and 100 item stacks');

  const ids=[...new Set(selectedIds)];
  const available=new Map<string,ItemStack>();
  for(const stack of [...state.inventory.stacks,...state.bank.stacks]){
    if(stack.quantity>0)available.set(inventoryBulkSelectionId(stack),stack);
  }
  const records=new Map(craftedGearInstances(state).map(record=>[record.id,record]));
  const itemIds=new Set<string>(),copyIds=new Set<string>();
  for(const id of ids){
    const stack=available.get(id);
    if(!stack)throw new Error('Selected items changed. Review the selection and retry.');
    const item=itemDef(stack.itemId);
    if(kind==='favorite'){itemIds.add(item.id);continue;}
    if(stack.instanceId&&item.type==='gear'){
      if(!records.has(stack.instanceId)||records.get(stack.instanceId)?.itemId!==item.id)
        throw new Error('An equipment copy cannot be verified. Review its identity first.');
      copyIds.add(stack.instanceId);
      // Older item-type locks can still protect every copy. Unlocking the
      // selected type must clear that older protection as well.
      if(!enabled&&state.settings.lockedItemIds?.includes(item.id))itemIds.add(item.id);
    }else itemIds.add(item.id);
  }
  const key=kind==='lock'?'lockedItemIds':'favoriteItemIds';
  const nextIds=new Set(state.settings[key]??[]);
  for(const id of itemIds)if(enabled)nextIds.add(id);else nextIds.delete(id);
  if(nextIds.size>100)throw new Error('Inventory protection limit reached (100 item types)');
  let next:GameState={...state,settings:{...state.settings,[key]:[...nextIds]}};
  for(const instanceId of copyIds)next=setCraftedGearInstanceLock(next,instanceId,enabled);
  return next;
}
