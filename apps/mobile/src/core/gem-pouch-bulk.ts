import {itemDef} from '../content/items';
import type {GameState} from './types';
import {gemPouch,sellPouchGem} from './gem-pouch';
import {canonicalGemMetaV1,dismantleGemV1,GEM_DISMANTLE_DUST_V1} from './gem-progression-v1';
import {workingTowardInventoryProtectionMap} from './working-toward-inventory';

/** Candidate counts are grounded in physically owned pouch stacks, never socketed gems. */
export function gemPouchBulkSummary(state:GameState,ids:readonly string[]){
  const selected=new Set(ids);
  const goalProtected=ids.length?new Set(workingTowardInventoryProtectionMap(state).keys()):new Set<string>();
  const stacks=gemPouch(state).stacks.filter(stack=>stack.quantity>0&&selected.has(stack.itemId));
  const safe=stacks.filter(stack=>!state.settings.favoriteItemIds?.includes(stack.itemId)
    &&!state.settings.lockedItemIds?.includes(stack.itemId)&&!goalProtected.has(stack.itemId));
  const sellable=safe.filter(stack=>itemDef(stack.itemId).value>0);
  const dismantleable=safe.filter(stack=>!!canonicalGemMetaV1(stack.itemId));
  return {
    selectedCount:stacks.length,
    selectedUnits:stacks.reduce((sum,stack)=>sum+stack.quantity,0),
    sellableIds:sellable.map(stack=>stack.itemId),
    sellGold:sellable.reduce((sum,stack)=>sum+stack.quantity*itemDef(stack.itemId).value,0),
    dismantleIds:dismantleable.map(stack=>stack.itemId),
    dismantleDust:dismantleable.reduce((sum,stack)=>sum+stack.quantity*GEM_DISMANTLE_DUST_V1[canonicalGemMetaV1(stack.itemId)!.grade],0),
    protectedCount:stacks.length-safe.length,
  };
}

/** All selected gems must remain eligible; the server command commits one state only. */
export function disposeGemPouchSelected(state:GameState,ids:readonly string[],method:'sell'|'dismantle'):GameState{
  if(!Array.isArray(ids)||ids.length<1||ids.length>100
    ||ids.some(id=>typeof id!=='string'||!id||id.length>120)
    ||new Set(ids).size!==ids.length)throw new Error('Select 1–100 unique gem stacks');
  const summary=gemPouchBulkSummary(state,ids),eligible=method==='sell'?summary.sellableIds:summary.dismantleIds;
  if(eligible.length!==ids.length||ids.some(id=>!eligible.includes(id)))
    throw new Error('Selection changed or includes protected gems; review your selection');
  let next=state;
  for(const id of ids){
    const quantity=gemPouch(next).stacks.find(stack=>stack.itemId===id)?.quantity??0;
    if(quantity<1)throw new Error('Selected gem is no longer in the pouch');
    next=method==='sell'?sellPouchGem(next,id,quantity):dismantleGemV1(next,id,quantity);
  }
  return next;
}
