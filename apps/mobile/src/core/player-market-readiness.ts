import {itemDef} from '../content/items';
import {auditCraftedGearOwnership} from './crafted-gear-ownership';
import {craftedGearInstances,isValidCraftedGearQuality} from './crafted-gear-instances';
import {equipmentPouch} from './equipment-pouch';
import {gemPouch} from './gem-pouch';
import {PLAYER_MARKET_RELEASED} from './release-flags';
import {workingTowardInventoryProtectionMap} from './working-toward-inventory';
import type {CharacterState,GameState,ItemStack,GearSlot} from './types';

/**
 * Read-only preview for the future Player Market. It is deliberately NOT an
 * authorization check: all listings/purchases must be revalidated by a server
 * transaction against canonical ownership, reservations and item definitions.
 *
 * Never mutate inventories or infer a unique gear receipt from an item ID.
 */
export type MarketStorageLocation='inventory'|'bank'|'equipment_pouch'|'gem_pouch';
export type MarketBlockReason=
  |'market_not_released'|'character_required'|'missing_stack'|'invalid_quantity'
  |'item_restricted'|'favorite_protected'|'item_locked'|'working_toward_reserved'
  |'stack_identity_invalid'|'legacy_equipment_unverified'|'equipment_identity_conflict'
  |'equipment_not_owned'|'equipment_location_mismatch'|'equipment_locked'
  |'saved_loadout_reserved'|'legacy_quality_unverified';

export interface PlayerMarketReadinessPreview {
  itemId:string;
  instanceId?:string;
  location:MarketStorageLocation;
  requestedQuantity:number;
  availableQuantity:number;
  /** Local, advisory validation only. Even true never authorizes a listing. */
  candidate:boolean;
  /** Always false until a separate, audited, server-authoritative market launch. */
  canListNow:false;
  blockedBy:MarketBlockReason[];
}

/** Ordinary resources, raw/single gems and individually receipted gear are
 * candidates. Quest, guild, premium, tool, food and potion assets are not.
 * This never substitutes for the eventual server-owned tradability catalog.
 */
export function marketCatalogCandidate(itemId:string):boolean{
  try{
    const item=itemDef(itemId);
    return !item.guildOnly&&!item.knowledgeUnlockId&&item.value>0
      &&(item.type==='material'||item.type==='gem'||item.type==='gear');
  }catch{return false;}
}

function stacksAt(state:GameState,location:MarketStorageLocation):readonly ItemStack[]{
  if(location==='inventory')return state.inventory.stacks;
  if(location==='bank')return state.bank.stacks;
  if(location==='equipment_pouch')return equipmentPouch(state).stacks;
  return gemPouch(state).stacks;
}

/** Every character on the account, active first. */
export function accountCharacters(state:GameState):CharacterState[]{
  return [state.character,...(state.otherCharacters??[]).map(entry=>entry.character)]
    .filter((row):row is CharacterState=>!!row);
}

/** A saved loadout on ANY character reserves this exact copy. A legacy loadout slot
 * with no instance id conservatively reserves every copy of that item.
 * Shared by the client preview and the server custody/escrow inspections.
 */
export function savedLoadoutReservesGearCopy(state:GameState,itemId:string,instanceId:string):boolean{
  return accountCharacters(state).some(character=>character.savedLoadouts?.some(loadout=>
    Object.entries(loadout.equipment).some(([slot,id])=>
      id===itemId&&(loadout.equipmentInstanceIds?.[slot as GearSlot]===instanceId
        ||!loadout.equipmentInstanceIds?.[slot as GearSlot]))));
}

/** Items reserved by Working Toward goals of every character, not only the active one.
 * verified=false means at least one character's goals could not be evaluated, so
 * callers must treat the result as incomplete and block rather than allow.
 */
export function accountWorkingTowardReservations(state:GameState):{itemIds:Set<string>;verified:boolean}{
  const itemIds=new Set<string>();let verified=true;
  for(const character of accountCharacters(state)){
    try{
      const projection=character.id===state.character?.id?state:{...state,character};
      for(const id of workingTowardInventoryProtectionMap(projection).keys())itemIds.add(id);
    }catch{verified=false;}
  }
  return {itemIds,verified};
}

/** Checks only a specific stack in a specific storage location, never a whole
 * item type. Quantity is explicit for future partial-stack escrow support.
 */
export function previewPlayerMarketListing(
  state:GameState,location:MarketStorageLocation,stackIndex:number,requestedQuantity:number,
):PlayerMarketReadinessPreview{
  const blockedBy:MarketBlockReason[]=[];
  const block=(reason:MarketBlockReason)=>{if(!blockedBy.includes(reason))blockedBy.push(reason);};
  if(!PLAYER_MARKET_RELEASED)block('market_not_released');
  if(!state.character)block('character_required');
  const stacks=stacksAt(state,location);
  const stack=Number.isSafeInteger(stackIndex)&&stackIndex>=0?stacks[stackIndex]:undefined;
  if(!stack){block('missing_stack');return {
    itemId:'',location,requestedQuantity,availableQuantity:0,
    candidate:false,canListNow:false,blockedBy,
  };}
  if(!Number.isSafeInteger(stack.quantity)||stack.quantity<=0)block('stack_identity_invalid');
  if(!Number.isSafeInteger(requestedQuantity)||requestedQuantity<1||requestedQuantity>stack.quantity)
    block('invalid_quantity');
  const itemId=stack.itemId;
  if(!marketCatalogCandidate(itemId))block('item_restricted');
  if(state.settings.favoriteItemIds?.includes(itemId))block('favorite_protected');
  if(state.settings.lockedItemIds?.includes(itemId))block('item_locked');
  // Goals of alt characters reserve shared Bank / Gem Pouch stock too.
  const reservations=accountWorkingTowardReservations(state);
  if(!reservations.verified||reservations.itemIds.has(itemId))block('working_toward_reserved');

  let type:ReturnType<typeof itemDef>['type']|undefined;
  try{type=itemDef(itemId).type;}catch{block('item_restricted');}
  if(type==='gear'){
    if(!stack.instanceId){
      // A legacy itemId-only copy does not prove which rarity/quality/upgrades
      // or enhancements a seller actually owns.
      block('legacy_equipment_unverified');
    }else{
      if(stack.quantity!==1||requestedQuantity!==1)block('stack_identity_invalid');
      const audit=auditCraftedGearOwnership(state);
      if(!audit.consistent)block('equipment_identity_conflict');
      const record=craftedGearInstances(state).find(row=>row.id===stack.instanceId);
      // Forge receipts keep their ORIGINAL crafter. Gear moved between the account's
      // characters through the Bank is still owned by this account and must stay listable.
      if(!record||record.itemId!==itemId
        ||!accountCharacters(state).some(character=>character.id===record.ownerCharacterId))
        block('equipment_not_owned');
      const match=audit.linked.filter(row=>row.instanceId===stack.instanceId);
      if(match.length!==1||match[0].place!==location
        ||(location!=='bank'&&match[0].holderCharacterId!==state.character?.id))
        block('equipment_location_mismatch');
      if(record?.locked)block('equipment_locked');
      if(record&&!isValidCraftedGearQuality(record.quality))
        block('legacy_quality_unverified');
      if(savedLoadoutReservesGearCopy(state,itemId,stack.instanceId))
        block('saved_loadout_reserved');
    }
  }else if(stack.instanceId!==undefined){
    // Generic resources and gems are stack balances, not equipment receipts.
    block('stack_identity_invalid');
  }
  // A future server must additionally verify: account binding, event expiry,
  // unclaimed crafting reservations, escrow, balance version and transaction ID.
  return {
    itemId,instanceId:stack.instanceId,location,requestedQuantity,
    availableQuantity:stack.quantity,
    candidate:blockedBy.every(reason=>reason==='market_not_released'),
    canListNow:false,blockedBy,
  };
}
