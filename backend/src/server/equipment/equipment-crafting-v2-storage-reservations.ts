import type {GameState,InventoryState} from '../../../../apps/mobile/src/core/types';
import {equipmentPouchForCharacter} from '../../../../apps/mobile/src/core/equipment-pouch';
import type {V2DraftItem} from './equipment-crafting-v2-transaction';
import {V2DraftCraftError} from './equipment-crafting-v2-transaction';
import {proposeEquipmentV2ClaimCustody,type V2HiddenClaimCustody} from './equipment-crafting-v2-delivery';

/**
 * Hidden, account-scoped capacity reservations for UNDELIVERED EQ2 claims.
 * Claims still live exclusively in immutable account metadata, not the V33
 * Inventory/Bank/Equipment Pouch. Every reservation survives retries and
 * character switches; it is NOT an actual physical storage location.
 */
export interface V2HiddenStorageReservation {
 instanceId:string;jobId:string;ownerCharacterId:string;itemId:string;
 destination:'equipment_pouch'|'inventory'|'deferred';
 quantity:1;
}
const fail=(reason:string):never=>{throw new V2DraftCraftError(reason);};
const safe=(value:number)=>Number.isSafeInteger(value)&&value>=0;
function ownerStorage(state:GameState,id:string):
 {inventory:InventoryState;pouch:InventoryState|undefined}|null {
 if(state.character?.id===id)return {
  inventory:state.inventory,pouch:equipmentPouchForCharacter(state.character),
 };
 const other=state.otherCharacters?.find(row=>row.character.id===id);
 return other?{inventory:other.inventory,pouch:equipmentPouchForCharacter(other.character)}:null;
}
function validateStorage(state:InventoryState|undefined){
 if(!state)return false;
 if(!safe(state.capacity)||!Array.isArray(state.stacks)
  ||state.stacks.some(row=>!row||!safe(row.quantity)||row.quantity<1))fail('invalid_v2_storage_capacity');
 return true;
}
export function verifyEquipmentV2StorageReservations(
 accountId:string,items:readonly V2DraftItem[],reservations:readonly V2HiddenStorageReservation[],
):void {
 if(!accountId||!Array.isArray(items)||!Array.isArray(reservations))fail('invalid_v2_storage_ledger');
 const byId=new Map(items.map(item=>[item.id,item]));
 const seen=new Set<string>();
 for(const row of reservations){
  if(!row||typeof row.instanceId!=='string'||!row.instanceId||seen.has(row.instanceId))
   fail('duplicate_v2_storage_reservation');
  seen.add(row.instanceId);
  const item=byId.get(row.instanceId);
  if(!item||item.accountId!==accountId||row.jobId!==item.jobId
   ||row.ownerCharacterId!==item.ownerCharacterId||row.itemId!==item.exactItem.pieceId
   ||row.quantity!==1||!['equipment_pouch','inventory','deferred'].includes(row.destination))
   fail('invalid_v2_storage_reservation');
 }
}
/** Reserves virtual capacity without ever creating an EQ2 item stack.
 * A full storage destination defers; it does not discard the exact copy.
 * This must run inside the same eventual account CAS as the claim receipt.
 */
/** Optional current placements are verified, replayed custody positions.
 * This prevents later Forge claims from counting obsolete original pouch
 * reservations after earlier copies move to Bank or become equipped.
 */
export interface V2ShadowStorageOccupancy{
 holderCharacterId:string|null;location:'pouch'|'inventory'|'bank'|'equipped'|'deferred';
}
export function reserveEquipmentV2HiddenClaim(
 state:GameState,accountId:string,item:V2DraftItem,
 prior:readonly V2HiddenStorageReservation[],
 currentPlacements?:readonly V2ShadowStorageOccupancy[],
):{reservation:V2HiddenStorageReservation;delivery:V2HiddenClaimCustody} {
 if(prior.some(row=>row.instanceId===item.id))fail('duplicate_v2_storage_reservation');
 const verified=proposeEquipmentV2ClaimCustody(state,accountId,item);
 const owner=ownerStorage(state,item.ownerCharacterId);
 if(!owner)fail('unknown_v2_delivery_owner');
 const space=(storage:InventoryState|undefined,destination:'equipment_pouch'|'inventory')=>{
  if(!validateStorage(storage)||!storage)return false;
  const reserved=currentPlacements
   ?currentPlacements.filter(row=>row.holderCharacterId===item.ownerCharacterId
     &&row.location===(destination==='equipment_pouch'?'pouch':'inventory')).length
   :prior.filter(row=>row.ownerCharacterId===item.ownerCharacterId&&row.destination===destination).length;
  return storage.stacks.length+reserved<storage.capacity;
 };
 const destination=space(owner.pouch,'equipment_pouch')?'equipment_pouch'
  :space(owner.inventory,'inventory')?'inventory':'deferred';
 const reservation:V2HiddenStorageReservation={
  instanceId:item.id,jobId:item.jobId,ownerCharacterId:item.ownerCharacterId,
  itemId:item.exactItem.pieceId,destination,quantity:1,
 };
 return {reservation,delivery:{
  ...verified,suggestedLocation:destination,
  reason:destination==='deferred'?'storage_full':'space_available',
 }};
}
