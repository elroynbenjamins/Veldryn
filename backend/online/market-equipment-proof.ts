import type {CraftedGearInstance,GameState,GearSlot,ItemStack} from '../../apps/mobile/src/core/types';
import {auditCraftedGearOwnership} from '../../apps/mobile/src/core/crafted-gear-ownership';
import {isValidCraftedGearQuality} from '../../apps/mobile/src/core/crafted-gear-instances';
import {normalizeEnhancementGemSlots} from '../../apps/mobile/src/core/equipment-enhancement';
import {itemDef} from '../../apps/mobile/src/content/items';
import {equipmentPouchForCharacter} from '../../apps/mobile/src/core/equipment-pouch';

/**
 * Market V7: strict read-only exact-copy proof. No mutation, RPC grant, escrow,
 * delivery, owner rebind, client route or generated equipment is permitted.
 * The *only* valid future escrow is an atomic database debit + receipt move
 * under the authoritative online_game_states lock and revision fence.
 */
export const MARKET_EQUIPMENT_ESCROW_RELEASED_V7=false as const;

export type MarketGearStorageV7='inventory'|'bank'|'equipment_pouch';
export interface MarketGearTransferEnvelopeV7{
  instanceId:string;
  itemId:string;
  sourceLocation:MarketGearStorageV7;
  sourceCharacterId:string|null;
  sourceIndex:number;
  sourceRevision:number;
  originalOwnerCharacterId:string;
  /** Full exact Forge record; not only rarity/quality projections. */
  exactReceipt:CraftedGearInstance;
}
export interface MarketGearInspectionV7{
  canEscrowNow:false;
  problems:string[];
  envelope:MarketGearTransferEnvelopeV7|null;
}
export interface MarketGearDeliveryInspectionV7{
  canDeliverNow:false;
  problems:string[];
  destinationCharacterId:string|null;
  destination:'inventory'|'equipment_pouch';
}

const errorResult=(problems:string[]):MarketGearInspectionV7=>
  ({canEscrowNow:false,problems:[...new Set(problems)],envelope:null});

function validSavedReceipt(receipt:CraftedGearInstance,instanceId:string){
  const problems:string[]=[];
  const rarity=['common','uncommon','rare','epic','legendary','mythic'];
  if(receipt.id!==instanceId
    ||typeof receipt.id!=='string'||!receipt.id.trim()||receipt.id.length>180
    ||typeof receipt.itemId!=='string'||!receipt.itemId.trim()
    ||typeof receipt.ownerCharacterId!=='string'||!receipt.ownerCharacterId.trim()
    ||receipt.acquireSource!=='craft'
    ||typeof receipt.sourceReceiptKey!=='string'||!receipt.sourceReceiptKey.trim()
    ||!Number.isSafeInteger(receipt.createdAtMs)||receipt.createdAtMs<0
    ||!rarity.includes(receipt.rarity)
    ||!isValidCraftedGearQuality(receipt.quality)
    ||(receipt.statRoll!==undefined
      &&(typeof receipt.statRoll!=='number'||!Number.isFinite(receipt.statRoll)
        ||receipt.statRoll<0||receipt.statRoll>=1))
    ||(receipt.locked!==undefined&&typeof receipt.locked!=='boolean')
  )problems.push('unverified_exact_forge_receipt');

  const enhancement=receipt.enhancement;
  if(!enhancement
    ||!Number.isSafeInteger(enhancement.rank)||enhancement.rank<0||enhancement.rank>4
    ||!Number.isSafeInteger(enhancement.failures)||enhancement.failures<0
    ||!Array.isArray(enhancement.gemIds)||enhancement.gemIds.length>2
    ||enhancement.gemIds.some(id=>typeof id!=='string'||!id.trim())
    ||(enhancement.statGemId!==undefined&&typeof enhancement.statGemId!=='string')
    ||(enhancement.effectGemId!==undefined&&typeof enhancement.effectGemId!=='string')
  )problems.push('invalid_enhancement_or_socket_data');
  else{
    const canonical=normalizeEnhancementGemSlots(enhancement);
    // Item IDs, socket types and the legacy ordered gemIds mirror must all
    // agree. Otherwise a transfer could silently discard or duplicate gems.
    if(canonical.statGemId!==enhancement.statGemId
      ||canonical.effectGemId!==enhancement.effectGemId
      ||JSON.stringify(canonical.gemIds)!==JSON.stringify(enhancement.gemIds))
      problems.push('socket_reconciliation_required');
  }
  try{
    if(itemDef(receipt.itemId).type!=='gear')problems.push('not_equipment');
  }catch{problems.push('unknown_equipment');}
  return problems;
}
function hasLegacyItemEnhancement(state:GameState,itemId:string){
  return [state.character,...(state.otherCharacters??[]).map(entry=>entry.character)]
    .some(character=>{
      const legacy=character?.gearEnhancements?.[itemId];
      return !!legacy &&(legacy.rank>0||legacy.failures>0||!!legacy.statGemId
        ||!!legacy.effectGemId||(legacy.gemIds?.length??0)>0);
    });
}
function savedLoadoutReferences(state:GameState,record:CraftedGearInstance){
  return [state.character,...(state.otherCharacters??[]).map(entry=>entry.character)]
    .some(character=>(character?.savedLoadouts??[]).some(preset=>
      Object.entries(preset.equipment).some(([slot,id])=>id===record.itemId
        &&(!preset.equipmentInstanceIds?.[slot as GearSlot]
          ||preset.equipmentInstanceIds?.[slot as GearSlot]===record.id))));
}
function stacksForLocation(state:GameState,
  location:MarketGearStorageV7,holderId?:string):ItemStack[]|undefined{
  if(location==='bank')return state.bank.stacks;
  if(state.character?.id===holderId){
    return location==='inventory'?state.inventory.stacks:
      equipmentPouchForCharacter(state.character).stacks;
  }
  const entry=(state.otherCharacters??[]).find(row=>row.character.id===holderId);
  return location==='inventory'?entry?.inventory.stacks:
    entry?equipmentPouchForCharacter(entry.character).stacks:undefined;
}

export function inspectExactMarketGearV7(
  state:GameState,accountId:string,revision:number,instanceId:string,
):MarketGearInspectionV7{
  if(typeof accountId!=='string'||!accountId
    ||state.account.longTermAccountScopeId!==accountId
    ||!Number.isSafeInteger(revision)||revision<0)
    return errorResult(['unverified_account_or_revision']);
  if(typeof instanceId!=='string'||!instanceId.trim()||instanceId.length>180)
    return errorResult(['invalid_instance_id']);

  const audit=auditCraftedGearOwnership(state);
  const problems:string[]=[];
  if(!audit.consistent||audit.unlocatedInstanceIds.length
    ||audit.unmarkedPhysicalCopies||audit.problems.length)
    problems.push('equipment_ownership_audit_not_clean');

  // Read the raw saved record; never substitute the strongest or normalized
  // item of the same type for a missing original copy.
  const records=state.account.craftedGearInstances??[];
  const exact=records.filter(row=>row?.id===instanceId);
  if(exact.length!==1)return errorResult([...problems,'exact_receipt_missing_or_duplicate']);
  const record=exact[0];
  problems.push(...validSavedReceipt(record,instanceId));
  const characters=[state.character,...(state.otherCharacters??[]).map(row=>row.character)]
    .filter((row):row is NonNullable<typeof row>=>!!row);
  if(!characters.some(row=>row.id===record.ownerCharacterId))
    problems.push('original_owner_character_not_in_account');

  const locations=audit.linked.filter(row=>row.instanceId===instanceId);
  if(locations.length!==1){
    problems.push('exact_physical_copy_not_unique');
    return errorResult(problems);
  }
  const location=locations[0];
  if(location.itemId!==record.itemId)problems.push('instance_item_mismatch');
  if(location.place!=='inventory'&&location.place!=='bank'&&location.place!=='equipment_pouch')
    problems.push('equipped_or_overflow_copy_not_tradable');
  if(record.locked||state.settings.lockedItemIds?.includes(record.itemId))
    problems.push('locked_equipment');
  if(state.settings.favoriteItemIds?.includes(record.itemId))
    problems.push('favorite_equipment');
  if(savedLoadoutReferences(state,record))
    problems.push('saved_loadout_references_copy');
  if(hasLegacyItemEnhancement(state,record.itemId))
    problems.push('legacy_item_level_upgrades_unreconciled');

  if(problems.length)return errorResult(problems);
  const sourceLocation=location.place as MarketGearStorageV7;
  const sourceCharacterId=location.holderCharacterId??null;
  const stacks=stacksForLocation(state,sourceLocation,sourceCharacterId??undefined);
  const sourceIndex=stacks?.findIndex(row=>row.instanceId===instanceId)??-1;
  if(sourceIndex<0||stacks?.[sourceIndex]?.quantity!==1
    ||stacks[sourceIndex].itemId!==record.itemId)
    return errorResult(['source_storage_identity_unverified']);

  const exactReceipt=JSON.parse(JSON.stringify(record)) as CraftedGearInstance;
  return {canEscrowNow:false,problems:['transactional_equipment_bridge_not_released'],
    envelope:{
      instanceId,itemId:record.itemId,
      sourceLocation,sourceCharacterId,sourceIndex,sourceRevision:revision,
      originalOwnerCharacterId:record.ownerCharacterId,exactReceipt,
    }};
}

/**
 * The destination is scoped to one buyer account, with no mutation. A real
 * claim must update the exact Forge receipt and the physical stack atomically
 * under both account locks, and fail without consuming delivery if full.
 */
export function inspectMarketGearDeliveryV7(
  buyer:GameState,buyerAccountId:string,
  payload:MarketGearTransferEnvelopeV7,
  destinationCharacterId:string,
  destination:'inventory'|'equipment_pouch',
):MarketGearDeliveryInspectionV7{
  const problems:string[]=[];
  if(!buyerAccountId||buyer.account.longTermAccountScopeId!==buyerAccountId)
    problems.push('buyer_account_unverified');
  const all=[buyer.character,...(buyer.otherCharacters??[]).map(x=>x.character)]
    .filter((x):x is NonNullable<typeof x>=>!!x);
  const character=all.find(x=>x.id===destinationCharacterId);
  if(!character)problems.push('destination_character_not_owned');
  if(!payload||payload.instanceId!==payload.exactReceipt.id
    ||payload.itemId!==payload.exactReceipt.itemId)
    problems.push('delivery_payload_mismatch');
  const recorded=buyer.account.craftedGearInstances??[];
  if(recorded.some(x=>x.id===payload.instanceId)
    ||auditCraftedGearOwnership(buyer).linked.some(x=>x.instanceId===payload.instanceId))
    problems.push('duplicate_instance_id_in_destination');
  if(!auditCraftedGearOwnership(buyer).consistent
    &&recorded.length>0)problems.push('buyer_gear_ownership_unverified');

  const stacks=destination==='equipment_pouch'
    ?(character?equipmentPouchForCharacter(character).stacks:[])
    :(buyer.character?.id===destinationCharacterId
      ?buyer.inventory.stacks
      :(buyer.otherCharacters??[]).find(x=>x.character.id===destinationCharacterId)
        ?.inventory.stacks??[]);
  const capacity=destination==='equipment_pouch'
    ?(character?equipmentPouchForCharacter(character).capacity:0)
    :(buyer.character?.id===destinationCharacterId
      ?buyer.inventory.capacity
      :(buyer.otherCharacters??[]).find(x=>x.character.id===destinationCharacterId)
        ?.inventory.capacity??0);
  if(!Number.isSafeInteger(capacity)||capacity<1||stacks.length>=capacity)
    problems.push('destination_storage_full_or_unverified');
  return {canDeliverNow:false,
    problems:[...new Set([...problems,'transactional_equipment_delivery_not_released'])],
    destinationCharacterId:character?.id??null,destination};
}
