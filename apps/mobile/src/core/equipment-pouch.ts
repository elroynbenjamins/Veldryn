import {itemDef} from '../content/items';
import {entitlementStorageCapacity} from './account-entitlements';
import type {CharacterState,GameState,InventoryState,ItemStack} from './types';

/** Character-bound equipment storage. Each physical gear copy uses one slot. */
export const EQUIPMENT_POUCH_BASE_CAPACITY=30;
export const EQUIPMENT_POUCH_UPGRADES=[
  {capacity:40,cost:10000,level:10},
  {capacity:50,cost:30000,level:20},
  {capacity:60,cost:80000,level:35},
  {capacity:75,cost:200000,level:50},
  {capacity:100,cost:500000,level:70},
] as const;

export function isEquipmentPouchItemId(id:string){
  try{return itemDef(id).type==='gear';}catch{return false;}
}
/** Preserve all existing physical copies even if a historical save exceeds capacity. */
export function equipmentPouchForCharacter(character:CharacterState|null|undefined):InventoryState{
  const raw=character?.equipmentPouch;
  const capacity=raw&&[EQUIPMENT_POUCH_BASE_CAPACITY,...EQUIPMENT_POUCH_UPGRADES.map(row=>row.capacity)].includes(raw.capacity)
    ?raw.capacity:EQUIPMENT_POUCH_BASE_CAPACITY;
  return {capacity,stacks:Array.isArray(raw?.stacks)?raw!.stacks.map(row=>({...row})):[]};
}
export function equipmentPouch(state:GameState){return equipmentPouchForCharacter(state.character);}
export function equipmentPouchUpgradePreview(state:GameState){
  return EQUIPMENT_POUCH_UPGRADES.find(row=>row.capacity>equipmentPouch(state).capacity)??null;
}
export function upgradeEquipmentPouch(state:GameState):GameState{
  if(!state.character)throw new Error('Create a character first');
  const next=equipmentPouchUpgradePreview(state);
  if(!next)throw new Error('Equipment Pouch is already at maximum capacity');
  if(state.character.level<next.level)throw new Error(`Requires Level ${next.level}`);
  if(state.character.gold<next.cost)throw new Error(`Requires ${next.cost.toLocaleString()} Gold`);
  return {...state,character:{...state.character,gold:state.character.gold-next.cost,
    equipmentPouch:{...equipmentPouch(state),capacity:next.capacity}}};
}
/** The target is always the original character, never the account's current character. */
export function tryStoreEquipmentInPouch(state:GameState,stack:ItemStack,ownerCharacterId=state.character?.id):GameState|null{
  if(!ownerCharacterId||!isEquipmentPouchItemId(stack.itemId)||!Number.isSafeInteger(stack.quantity)||stack.quantity!==1)return null;
  const active=state.character?.id===ownerCharacterId;
  const index=active?-1:state.otherCharacters?.findIndex(row=>row.character.id===ownerCharacterId)??-1;
  const character=active?state.character:index>=0?state.otherCharacters![index].character:undefined;
  if(!character)return null;
  const pouch=equipmentPouchForCharacter(character);
  if(pouch.stacks.length>=pouch.capacity)return null;
  if(stack.instanceId&&pouch.stacks.some(row=>row.instanceId===stack.instanceId))throw new Error('Duplicate equipment copy');
  const updated={...character,equipmentPouch:{...pouch,stacks:[...pouch.stacks,{...stack}]}};
  if(active)return {...state,character:updated};
  return {...state,otherCharacters:state.otherCharacters!.map((row,i)=>i===index?{...row,character:updated}:row)};
}
/** Safe manual movement for legacy item-ID gear, which has no exact Forge receipt.
 * Unique crafted copies must use gear_move with their verified instance ID. */
export function moveLegacyEquipmentPouchStack(state:GameState,itemId:string,quantity:number,from:'inventory'|'bank'|'equipment_pouch',to:'inventory'|'bank'|'equipment_pouch'):GameState{
  if(!state.character)throw new Error('Create a character first');
  if(!isEquipmentPouchItemId(itemId)||!Number.isSafeInteger(quantity)||quantity<1||quantity>100)throw new Error('Invalid equipment transfer');
  if(from===to)return state;
  const source=from==='equipment_pouch'?equipmentPouch(state).stacks:state[from].stacks;
  const matches=source.filter(row=>row.itemId===itemId&&row.instanceId===undefined);
  if(matches.reduce((n,row)=>n+row.quantity,0)<quantity)throw new Error('Not enough unlinked equipment in this storage');
  let left=quantity;
  const updated=source.flatMap(row=>{
    if(row.itemId!==itemId||row.instanceId!==undefined||left<=0)return [row];
    const taken=Math.min(left,row.quantity);left-=taken;
    return row.quantity>taken?[{...row,quantity:row.quantity-taken}]:[];
  });
  const dest=to==='equipment_pouch'?equipmentPouch(state):state[to];
  const cap=to==='equipment_pouch'?dest.capacity:entitlementStorageCapacity(state,to);
  if(dest.stacks.filter(row=>row.quantity>0).length+quantity>cap)throw new Error('Destination storage is full');
  const nextDest=[...dest.stacks,...Array.from({length:quantity},()=>({itemId,quantity:1}))];
  let next:GameState={...state};
  if(from==='equipment_pouch')next={...next,character:{...next.character!,equipmentPouch:{...equipmentPouch(state),stacks:updated}}};
  else next={...next,[from]:{...state[from],stacks:updated}};
  if(to==='equipment_pouch')next={...next,character:{...next.character!,equipmentPouch:{...equipmentPouch(next),stacks:nextDest}}};
  else next={...next,[to]:{...state[to],stacks:nextDest}};
  return next;
}
