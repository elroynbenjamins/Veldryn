import type {GameState,CharacterState,InventoryState,GearSlot} from '../../../../apps/mobile/src/core/types';
import {equipmentPouchForCharacter} from '../../../../apps/mobile/src/core/equipment-pouch';
import {equipmentV2AuthoritativeReadiness} from '../../../../apps/mobile/src/core/equipment-crafting-v2-authoritative-readiness';
import {assertEquipmentCraftingV2Released} from './equipment-crafting-v2-gate';
import {verifyEquipmentV2HiddenLedger} from './equipment-crafting-v2-delivery';
import {verifyEquipmentV2StorageReservations,type V2HiddenStorageReservation} from './equipment-crafting-v2-storage-reservations';
import {verifyEquipmentV2GemSidecar,type V2GemSidecarState} from './equipment-crafting-v2-gem-sidecar';
import {v2ServerCustodyPreflight,type V2CustodyState,type V2CustodyLocation} from './equipment-crafting-v2-custody';
import {V2DraftCraftError,type V2DraftItem,type V2DraftJob,type V2DraftReceipt,type V2DraftSkillAward} from './equipment-crafting-v2-transaction';

/**
 * Private virtual custody / CAS boundary. ALL changes are account metadata;
 * these entries are NOT physical V33 gear, grants, usable equipment or live
 * Bank transfers. Never insert an EQ2 ID in V33 storage until the combined
 * item catalogue and one authoritative online commit are approved.
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
export interface V2VirtualMoveInput{
 state:GameState;accountId:string;onlineVersion:number;
 onlineCharacterId:string|null;authoritativeWalletGold:number|null;
 command:V2VirtualMoveCommand;
}
export interface V2VirtualLedger {
 schemaVersion:'eq2-hidden-game-state-v1';
 jobs:V2DraftJob[];items:V2DraftItem[];
 receipts:V2DraftReceipt[];skillAwards:V2DraftSkillAward[];
 storageReservations?:V2HiddenStorageReservation[];
 gemSocketState?:V2GemSidecarState;
 custodyReceipts?:V2VirtualMoveReceipt[];
}
const fail=(reason:string):never=>{throw new V2DraftCraftError(reason);};
const safe=(n:number)=>Number.isSafeInteger(n)&&n>=0;
const fingerprint=(kind:V2VirtualMoveKind,id:string)=>'custody:'+kind+':'+id;
const fromReservation=(row:V2HiddenStorageReservation):V2VirtualCopy=>({
 instanceId:row.instanceId,itemId:row.itemId,
 location:row.destination==='equipment_pouch'?'pouch':row.destination,
 holderCharacterId:row.ownerCharacterId,
});
function sourceLedger(state:GameState,accountId:string):V2VirtualLedger{
 const meta=state.account.equipmentV2Hidden as V2VirtualLedger|undefined;
 if(!meta||meta.schemaVersion!=='eq2-hidden-game-state-v1'
  ||!Array.isArray(meta.jobs)||!Array.isArray(meta.items)
  ||!Array.isArray(meta.receipts)||!Array.isArray(meta.skillAwards)
  ||!Array.isArray(meta.storageReservations)
  ||(meta.custodyReceipts!==undefined&&!Array.isArray(meta.custodyReceipts)))
  fail('invalid_v2_virtual_ledger');
 verifyEquipmentV2HiddenLedger(accountId,meta.jobs,meta.items,meta.receipts,meta.skillAwards);
 verifyEquipmentV2StorageReservations(accountId,meta.items,meta.storageReservations);
 if(meta.gemSocketState)verifyEquipmentV2GemSidecar(meta.items,meta.gemSocketState);
 return meta;
}
function characterRow(state:GameState,id:string):
 {character:CharacterState;inventory:InventoryState}|null{
 if(state.character?.id===id)return {character:state.character,inventory:state.inventory};
 const other=state.otherCharacters?.find(row=>row.character.id===id);
 return other?{character:other.character,inventory:other.inventory}:null;
}
function characters(state:GameState){
 return [
 ...(state.character?[state.character]:[]),
 ...(state.otherCharacters??[]).map(row=>row.character),
 ];
}
function validLocation(value:unknown):value is V2VirtualLocation{
 return value==='pouch'||value==='inventory'||value==='bank'||value==='equipped'||value==='deferred';
}
function allowedTransition(kind:V2VirtualMoveKind,from:V2VirtualLocation,to:V2VirtualLocation){
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
 const seen=new Set<string>();
 let priorVersion=-1;
 for(const row of receipts){
  if(!row||typeof row.requestId!=='string'||!row.requestId||seen.has(row.requestId)
   ||!safe(row.version)||row.version<=priorVersion||!validLocation(row.from)
   ||!validLocation(row.to)||row.physicallyDelivered!==false
   ||!['deposit_bank','withdraw_bank','equip','unequip','store_deferred'].includes(row.fingerprint.split(':')[1])
   ||row.fingerprint!==fingerprint(row.fingerprint.split(':')[1] as V2VirtualMoveKind,row.instanceId))
   fail('invalid_v2_virtual_move_receipt');
  seen.add(row.requestId);priorVersion=row.version;
  const before=byId.get(row.instanceId);
  if(!before||before.location!==row.from||before.holderCharacterId!==row.oldHolder
   ||!allowedTransition(row.fingerprint.split(':')[1] as V2VirtualMoveKind,row.from,row.to))
   fail('v2_virtual_move_history_conflict');
  const kind=row.fingerprint.split(':')[1] as V2VirtualMoveKind;
  const newHolder=row.to==='bank'?null:row.actorCharacterId;
  if(!row.actorCharacterId||!row.newHolder&&! (row.to==='bank')
   ||row.newHolder!==newHolder
   ||(kind==='deposit_bank'||kind==='equip'||kind==='unequip'||kind==='store_deferred')
     &&row.oldHolder!==row.actorCharacterId)
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
   if(!row.equippedSlot||slots.has(row.equippedSlot))fail('duplicate_v2_virtual_equipped_slot');
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
function countIn(state:GameState,all:readonly V2VirtualCopy[],location:V2VirtualLocation,holder:string|null):boolean{
 const owned=holder?characterRow(state,holder):null;
 const storage=location==='bank'?state.bank
  :location==='pouch'?owned?equipmentPouchForCharacter(owned.character):null
  :location==='inventory'?owned?.inventory:null;
 if(!storage||!safe(storage.capacity)||!Array.isArray(storage.stacks))
  fail('invalid_v2_virtual_storage');
 const occupancy=storage.stacks.length+all.filter(row=>row.location===location
  &&row.holderCharacterId===holder).length;
 return occupancy<storage.capacity;
}
function rejectLiveEquipClash(state:GameState,actor:string,slot:GearSlot,hands?:string){
 const row=characterRow(state,actor);
 if(!row)fail('unknown_v2_virtual_character');
 if(row.character.equipment[slot])fail('v2_legacy_equipped_slot_conflict');
 if(slot==='weapon'&&hands!=='one'&&row.character.equipment.offhand)
  fail('v2_legacy_equipped_slot_conflict');
 // Legacy weapon hand metadata is not source-complete in this branch.
 if(slot==='offhand'&&row.character.equipment.weapon)
  fail('v2_legacy_weapon_hand_unverified');
}
export function simulateEquipmentV2VirtualCustody(input:V2VirtualMoveInput){
 const {state,accountId,onlineVersion,onlineCharacterId,authoritativeWalletGold,command}=input;
 if(!state?.character||!onlineCharacterId||state.character.id!==onlineCharacterId)
  fail('unauthenticated_v2_virtual_character');
 if(!safe(onlineVersion)||!safe(authoritativeWalletGold??NaN)
  ||state.character.gold!==authoritativeWalletGold)fail('untrusted_v2_virtual_wallet');
 const ready=equipmentV2AuthoritativeReadiness({
  state,accountId,onlineVersion,onlineCharacterId,authoritativeWalletGold,
 });
 if(ready.blocked)fail('v2_virtual_not_ready:'+ready.blockers.join(','));
 if(!command||!['deposit_bank','withdraw_bank','equip','unequip','store_deferred'].includes(command.kind)
  ||Object.keys(command).length!==4
  ||!safe(command.expectedVersion)
  ||!/^[A-Za-z0-9_-]{8,128}$/.test(command.requestId)
  ||typeof command.instanceId!=='string'||!command.instanceId)
  fail('invalid_v2_virtual_move_command');
 const meta=sourceLedger(state,accountId);
 if(meta.receipts.some(row=>row.requestId===command.requestId)
   ||meta.gemSocketState?.receipts.some(row=>row.requestId===command.requestId))
  fail('v2_cross_command_request_id_conflict');
 const oldReceipts=meta.custodyReceipts??[];
 const all=readEquipmentV2VirtualCustody(meta.items,meta.storageReservations??[],oldReceipts);
 const prior=oldReceipts.find(row=>row.requestId===command.requestId);
 if(prior){
  if(prior.fingerprint!==fingerprint(command.kind,command.instanceId))
   fail('v2_virtual_request_id_conflict');
  return {state,replayed:true,receipt:prior,copies:all};
 }
 if(command.expectedVersion!==onlineVersion)fail('stale_v2_virtual_version');
 const current=all.find(row=>row.instanceId===command.instanceId);
 const item=meta.items.find(row=>row.id===command.instanceId);
 if(!current||!item)fail('unknown_v2_virtual_copy');
 let target:V2VirtualLocation,holder:string|null=onlineCharacterId;
 if(command.kind==='deposit_bank'){target='bank';holder=null;}
 else if(command.kind==='equip')target='equipped';
 else if(command.kind==='withdraw_bank'||command.kind==='store_deferred'||command.kind==='unequip'){
  target=countIn(state,all,'pouch',holder)?'pouch'
   :countIn(state,all,'inventory',holder)?'inventory'
   :fail('v2_virtual_destination_full');
 }else fail('invalid_v2_virtual_move_command');
 if(!allowedTransition(command.kind,current.location,target))fail('invalid_v2_virtual_transition');
 if(command.kind==='withdraw_bank'){
  if(current.holderCharacterId!==null)fail('v2_virtual_bank_holder_conflict');
 }else if(current.holderCharacterId!==onlineCharacterId)
  fail('wrong_v2_virtual_owner');
 if(target==='bank'&&!countIn(state,all,'bank',null))fail('v2_virtual_bank_full');
 if(command.kind==='equip'){
  rejectLiveEquipClash(state,onlineCharacterId,item.exactItem.slot,item.exactItem.hands);
  const preflight:V2CustodyState={accountId,characters:characters(state).map(row=>({
   id:row.id,classId:row.classId,level:row.level,
  })),copies:all.filter(row=>row.location!=='deferred').map(row=>{
   const record=meta.items.find(item=>item.id===row.instanceId)!;
   return {instanceId:row.instanceId,accountId,ownerCharacterId:row.holderCharacterId,
    location:row.location,equippedSlot:row.equippedSlot,
    item:record.exactItem,locked:true,favorite:true};
  })};
  const policy=v2ServerCustodyPreflight(preflight,{
   kind:'equip',actorCharacterId:onlineCharacterId,instanceId:item.id,
  });
  if(!policy.allowed)fail('v2_virtual_equip_denied:'+policy.reason);
 }
 const receipt:V2VirtualMoveReceipt={
  requestId:command.requestId,
  fingerprint:fingerprint(command.kind,command.instanceId),
  instanceId:command.instanceId,actorCharacterId:onlineCharacterId,
  from:current.location,to:target,
  oldHolder:current.holderCharacterId,newHolder:holder,
  version:onlineVersion+1,
  ...(target==='equipped'?{equippedSlot:item.exactItem.slot}:{}),
  physicallyDelivered:false,
 };
 const updatedReceipts=[...oldReceipts,receipt];
 const nextCopies=readEquipmentV2VirtualCustody(meta.items,meta.storageReservations??[],updatedReceipts);
 const next:GameState={...state,account:{...state.account,equipmentV2Hidden:{
  ...meta,custodyReceipts:updatedReceipts,
 }}};
 // Mutates only opaque unreleased account metadata. The existing online commit
 // must later CAS the *whole* account alongside V33 and payment effects.
 if(next.character?.gold!==state.character?.gold||next.bank!==state.bank
  ||next.inventory!==state.inventory)fail('v2_virtual_modified_live_state');
 return {state:next,replayed:false,receipt,copies:nextCopies};
}
export function runEquipmentV2VirtualCustody(input:V2VirtualMoveInput){
 assertEquipmentCraftingV2Released();
 return simulateEquipmentV2VirtualCustody(input);
}
