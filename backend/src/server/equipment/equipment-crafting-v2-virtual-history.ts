import type {V2LegacyGearSlot as GearSlot} from './equipment-crafting-v2-legacy-custody-view';
import type {V2CustodyLocation} from './equipment-crafting-v2-custody';
import {verifyEquipmentV2StorageReservations,type V2HiddenStorageReservation} from './equipment-crafting-v2-storage-reservations';
import {V2DraftCraftError,type V2DraftItem} from './equipment-crafting-v2-transaction';

/** Server-only immutable receipt projection for hidden 2.0 custody.
 * No GameState, mobile item catalogue, account writes or client authority.
 * Reader is strictly replay verification over minted exact copies.
 */
export type V2VirtualLocation=V2CustodyLocation|'deferred';
export interface V2VirtualCopy {
 instanceId:string;itemId:string;location:V2VirtualLocation;
 holderCharacterId:string|null;equippedSlot?:GearSlot;
}
export type V2VirtualMoveKind='store_deferred'|'deposit_bank'|'withdraw_bank'|'equip'|'unequip';
export interface V2VirtualMoveCommand {
 kind:V2VirtualMoveKind;requestId:string;expectedVersion:number;instanceId:string;
}
export interface V2VirtualMoveReceipt {
 requestId:string;fingerprint:string;instanceId:string;actorCharacterId:string;
 from:V2VirtualLocation;to:V2VirtualLocation;
 oldHolder:string|null;newHolder:string|null;
 version:number;equippedSlot?:GearSlot;
 physicallyDelivered:false;
}
const fail=(reason:string):never=>{throw new V2DraftCraftError(reason);};
const safe=(n:number)=>Number.isSafeInteger(n)&&n>=0;
export const v2VirtualFingerprint=(kind:V2VirtualMoveKind,id:string)=>'custody:'+kind+':'+id;
const fromReservation=(row:V2HiddenStorageReservation):V2VirtualCopy=>({
 instanceId:row.instanceId,itemId:row.itemId,
 location:row.destination==='equipment_pouch'?'pouch':row.destination,
 holderCharacterId:row.ownerCharacterId,
});
function validLocation(value:unknown):value is V2VirtualLocation{
 return value==='pouch'||value==='inventory'||value==='bank'||value==='equipped'||value==='deferred';
}
export function v2VirtualAllowedTransition(kind:V2VirtualMoveKind,from:V2VirtualLocation,to:V2VirtualLocation){
 if(kind==='store_deferred')return from==='deferred'&&(to==='pouch'||to==='inventory');
 if(kind==='deposit_bank')return (from==='pouch'||from==='inventory')&&to==='bank';
 if(kind==='withdraw_bank')return from==='bank'&&(to==='pouch'||to==='inventory');
 if(kind==='equip')return (from==='pouch'||from==='inventory')&&to==='equipped';
 return kind==='unequip'&&from==='equipped'&&(to==='pouch'||to==='inventory');
}
/** Reconstruct every virtual copy from immutable claim reservations and
 * subsequent move receipts; reject forged, missing, duplicated or conflicting
 * transitions instead of silently repairing account ownership.
 */
export function readEquipmentV2VirtualCustody(
 items:readonly V2DraftItem[],reservations:readonly V2HiddenStorageReservation[],
 receipts:readonly V2VirtualMoveReceipt[],
):V2VirtualCopy[]{
 if(!Array.isArray(items)||!Array.isArray(reservations)||!Array.isArray(receipts))
  fail('invalid_v2_virtual_custody');
 const byId=new Map<string,V2VirtualCopy>();
 for(const row of reservations){
  if(byId.has(row.instanceId))fail('duplicate_v2_virtual_copy');
  byId.set(row.instanceId,fromReservation(row));
 }
 if(byId.size!==items.length||items.some(item=>!byId.has(item.id)))
  fail('unreconciled_v2_virtual_claim');
 // Every claim reserve must match the original minted item and owner. This
 // pure reader is used by Effect Gem checks without a higher-level ledger.
 if(items.length){
  const accountId=items[0].accountId;
  if(!accountId||items.some(item=>item.accountId!==accountId))
   fail('invalid_v2_virtual_claim_account');
  verifyEquipmentV2StorageReservations(accountId,items,reservations);
 }
 const seen=new Set<string>();
 let priorVersion=-1;
 for(const row of receipts){
  if(!row||typeof row.requestId!=='string'||!row.requestId||seen.has(row.requestId)
   ||typeof row.instanceId!=='string'||!row.instanceId
   ||typeof row.actorCharacterId!=='string'||!row.actorCharacterId
   ||typeof row.fingerprint!=='string'
   ||!safe(row.version)||row.version<=priorVersion||!validLocation(row.from)
   ||!validLocation(row.to)||row.physicallyDelivered!==false)
   fail('invalid_v2_virtual_move_receipt');
  const segments=row.fingerprint.split(':');
  const kind=segments[1] as V2VirtualMoveKind;
  if(segments.length!==3
   ||!['deposit_bank','withdraw_bank','equip','unequip','store_deferred'].includes(kind)
   ||row.fingerprint!==v2VirtualFingerprint(kind,row.instanceId))
   fail('invalid_v2_virtual_move_receipt');
  seen.add(row.requestId);priorVersion=row.version;
  const before=byId.get(row.instanceId);
  if(!before||before.location!==row.from||before.holderCharacterId!==row.oldHolder
   ||!v2VirtualAllowedTransition(kind,row.from,row.to))
   throw new V2DraftCraftError('v2_virtual_move_history_conflict');
  const newHolder=row.to==='bank'?null:row.actorCharacterId;
  const mustAlreadyHold=kind!=='withdraw_bank';
  if(row.newHolder!==newHolder
   ||(mustAlreadyHold&&row.oldHolder!==row.actorCharacterId)
   ||(kind==='withdraw_bank'&&row.oldHolder!==null))
   fail('v2_virtual_move_owner_conflict');
  if(row.to==='equipped'){
   const item=items.find(item=>item.id===row.instanceId);
   if(!item||item.exactItem.slot!==row.equippedSlot)fail('v2_virtual_move_slot_conflict');
  }else if(row.equippedSlot!==undefined)fail('v2_virtual_move_slot_conflict');
  byId.set(row.instanceId,{
   ...before,location:row.to,holderCharacterId:row.newHolder,
   ...(row.equippedSlot?{equippedSlot:row.equippedSlot}:{equippedSlot:undefined}),
  });
 }
 const current=[...byId.values()];
 for(const owner of new Set(current.map(row=>row.holderCharacterId).filter(Boolean))){
  const worn=current.filter(row=>row.holderCharacterId===owner&&row.location==='equipped');
  const slots=new Set<string>();
  for(const row of worn){
   if(!row.equippedSlot||slots.has(row.equippedSlot))
    throw new V2DraftCraftError('duplicate_v2_virtual_equipped_slot');
   slots.add(row.equippedSlot);
  }
  const weapon=worn.find(row=>row.equippedSlot==='weapon');
  const offhand=worn.find(row=>row.equippedSlot==='offhand');
  const weaponDef=items.find(item=>item.id===weapon?.instanceId);
  if(weaponDef&&weaponDef.exactItem.hands!=='one'&&offhand)
   fail('v2_virtual_two_hand_conflict');
 }
 return current;
}

