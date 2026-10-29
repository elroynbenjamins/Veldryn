import {itemDef} from '../content/items';
import {entitlementStorageCapacity} from './account-entitlements';
import type {GameState,InventoryState,ItemStack} from './types';

/** Shared account storage. One slot holds one gem type/grade, not one individual gem. */
export const GEM_POUCH_BASE_CAPACITY=30;
export const GEM_POUCH_UPGRADES=[
  {capacity:40,cost:5000,level:10},
  {capacity:50,cost:15000,level:20},
  {capacity:60,cost:40000,level:35},
  {capacity:75,cost:100000,level:50},
  {capacity:100,cost:250000,level:70},
] as const;

export function isGemPouchItemId(itemId:string):boolean{
  try{const item=itemDef(itemId);return item.type==='gem'||!!item.rawGemFamilyId;}catch{return false}
}
export function normalizeGemPouch(raw:unknown):InventoryState{
  const value:Partial<InventoryState>=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Partial<InventoryState>:{};
  const capacity=[GEM_POUCH_BASE_CAPACITY,...GEM_POUCH_UPGRADES.map(t=>t.capacity)].includes(Number(value.capacity))
    ?Number(value.capacity):GEM_POUCH_BASE_CAPACITY;
  const grouped=new Map<string,number>();
  for(const stack of Array.isArray(value.stacks)?value.stacks:[]){
    if(!stack||typeof stack.itemId!=='string'||!isGemPouchItemId(stack.itemId)||stack.instanceId!==undefined
      ||!Number.isSafeInteger(stack.quantity)||stack.quantity<=0)continue;
    const next=(grouped.get(stack.itemId)??0)+stack.quantity;
    if(Number.isSafeInteger(next))grouped.set(stack.itemId,next);
  }
  // Never truncate historical ownership if a saved pouch exceeds its current capacity.
  return {capacity,stacks:[...grouped].map(([itemId,quantity])=>({itemId,quantity}))};
}
export function gemPouch(state:GameState):InventoryState{return normalizeGemPouch(state.account.gemPouch)}
export function gemPouchUpgradePreview(state:GameState){
  return GEM_POUCH_UPGRADES.find(tier=>tier.capacity>gemPouch(state).capacity)??null;
}
export function upgradeGemPouch(state:GameState):GameState{
  if(!state.character)throw new Error('Create a character first');
  const next=gemPouchUpgradePreview(state);
  if(!next)throw new Error('Gem Pouch is already at maximum capacity');
  if(state.character.level<next.level)throw new Error(`Requires Level ${next.level}`);
  if(state.character.gold<next.cost)throw new Error(`Requires ${next.cost.toLocaleString()} Gold`);
  return {...state,character:{...state.character,gold:state.character.gold-next.cost},
    account:{...state.account,gemPouch:{...gemPouch(state),capacity:next.capacity}}};
}
function stackQty(stacks:readonly ItemStack[],id:string){
  return stacks.reduce((total,row)=>total+(row.itemId===id&&row.instanceId===undefined?row.quantity:0),0);
}
export function gemStorageQuantity(state:GameState,id:string):number{
  return stackQty(state.inventory.stacks,id)+stackQty(state.bank.stacks,id)
    +(isGemPouchItemId(id)?stackQty(gemPouch(state).stacks,id):0);
}
function addStack(stacks:readonly ItemStack[],capacity:number,itemId:string,quantity:number):ItemStack[]|null{
  const index=stacks.findIndex(row=>row.itemId===itemId&&row.instanceId===undefined);
  if(index>=0){
    const next=stacks.map(row=>({...row}));
    const amount=next[index].quantity+quantity;
    if(!Number.isSafeInteger(amount))throw new Error('Gem stack quantity is too large');
    next[index].quantity=amount;return next;
  }
  if(stacks.filter(row=>row.quantity>0).length>=capacity)return null;
  return [...stacks,{itemId,quantity}];
}
/** First pouch, then legacy Inventory/Bank, so a full pouch cannot strand a finished craft. */
export function storePouchGem(state:GameState,itemId:string,quantity=1):GameState{
  if(!isGemPouchItemId(itemId)||!Number.isSafeInteger(quantity)||quantity<1)throw new Error('Invalid gem reward');
  const pouch=gemPouch(state),stored=addStack(pouch.stacks,pouch.capacity,itemId,quantity);
  if(stored)return {...state,account:{...state.account,gemPouch:{...pouch,stacks:stored}}};
  const inv=addStack(state.inventory.stacks,entitlementStorageCapacity(state,'inventory'),itemId,quantity);
  if(inv)return {...state,inventory:{...state.inventory,stacks:inv}};
  const bank=addStack(state.bank.stacks,entitlementStorageCapacity(state,'bank'),itemId,quantity);
  if(bank)return {...state,bank:{...state.bank,stacks:bank}};
  throw new Error('Gem Pouch, Inventory and Bank are full');
}
/** Uses pouch first, but retains compatibility with unmigrated/overflowed legacy gems. */
export function consumeGemFromStorage(state:GameState,itemId:string,quantity:number):GameState{
  if(!Number.isSafeInteger(quantity)||quantity<1||gemStorageQuantity(state,itemId)<quantity)
    throw new Error(`Need ${quantity} ${itemDef(itemId).name}`);
  let left=quantity;
  const take=(stacks:readonly ItemStack[])=>stacks.map(row=>{
    if(row.itemId!==itemId||row.instanceId!==undefined||left<=0)return row;
    const used=Math.min(left,row.quantity);left-=used;
    return {...row,quantity:row.quantity-used};
  }).filter(row=>row.quantity>0);
  const pouch=gemPouch(state),pouchStacks=isGemPouchItemId(itemId)?take(pouch.stacks):pouch.stacks;
  const inventory=take(state.inventory.stacks),bank=take(state.bank.stacks);
  return {...state,account:{...state.account,gemPouch:{...pouch,stacks:pouchStacks}},
    inventory:{...state.inventory,stacks:inventory},bank:{...state.bank,stacks:bank}};
}
/** Idempotent migration: do not move a legacy stack unless the entire stack fits. */
export function migrateGemPouch(state:GameState):GameState{
  let pouch=gemPouch(state);
  const move=(stacks:readonly ItemStack[])=>stacks.filter(row=>{
    if(!row||typeof row.itemId!=='string'||row.instanceId!==undefined||!isGemPouchItemId(row.itemId)||!Number.isSafeInteger(row.quantity)||row.quantity<=0)return true;
    const placed=addStack(pouch.stacks,pouch.capacity,row.itemId,row.quantity);
    if(!placed)return true;
    pouch={...pouch,stacks:placed};
    return false;
  });
  const inventory=move(state.inventory.stacks),bank=move(state.bank.stacks);
  const otherCharacters=state.otherCharacters?.map(entry=>({...entry,inventory:{...entry.inventory,stacks:move(Array.isArray(entry.inventory?.stacks)?entry.inventory.stacks:[])}}));
  return {...state,account:{...state.account,gemPouch:pouch},otherCharacters,
    inventory:{...state.inventory,stacks:inventory},bank:{...state.bank,stacks:bank}};
}
