import type {GameState,CharacterState,InventoryState,GearSlot} from '../../../../apps/mobile/src/core/types';
import {v2ServerLegacyPouchSnapshot} from './equipment-crafting-v2-pouch-snapshot';
import {
 readEquipmentV2VirtualCustody,v2VirtualAllowedTransition,v2VirtualFingerprint,
 type V2VirtualCopy,type V2VirtualLocation,type V2VirtualMoveCommand,
 type V2VirtualMoveKind,type V2VirtualMoveReceipt,
} from './equipment-crafting-v2-virtual-history';
export {readEquipmentV2VirtualCustody} from './equipment-crafting-v2-virtual-history';
export type {
 V2VirtualCopy,V2VirtualLocation,V2VirtualMoveCommand,
 V2VirtualMoveKind,V2VirtualMoveReceipt,
} from './equipment-crafting-v2-virtual-history';
import {equipmentV2AuthoritativeReadiness} from '../../../../apps/mobile/src/core/equipment-crafting-v2-authoritative-readiness';
import {assertEquipmentCraftingV2Released} from './equipment-crafting-v2-gate';
import {verifyEquipmentV2ReceiptNamespace} from './equipment-crafting-v2-receipt-coherence';
import {verifyEquipmentV2HiddenLedger} from './equipment-crafting-v2-delivery';
import {verifyEquipmentV2StorageReservations,type V2HiddenStorageReservation} from './equipment-crafting-v2-storage-reservations';
import {verifyEquipmentV2GemSidecar} from './equipment-crafting-v2-gem-verifier';
import type {V2GemSidecarState} from './equipment-crafting-v2-gem-sidecar-types';
import {v2ServerCustodyPreflight,type V2CustodyState,type V2CustodyLocation} from './equipment-crafting-v2-custody';
import {V2DraftCraftError,type V2DraftItem,type V2DraftJob,type V2DraftReceipt,type V2DraftSkillAward} from './equipment-crafting-v2-transaction';

/**
 * Private virtual custody / CAS boundary. ALL changes are account metadata;
 * these entries are NOT physical V33 gear, grants, usable equipment or live
 * Bank transfers. Never insert an EQ2 ID in V33 storage until the combined
 * item catalogue and one authoritative online commit are approved.
 */
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
function sourceLedger(state:GameState,accountId:string):V2VirtualLedger{
 const meta=state.account.equipmentV2Hidden as V2VirtualLedger|undefined;
 if(!meta||meta.schemaVersion!=='eq2-hidden-game-state-v1'
  ||!Array.isArray(meta.jobs)||!Array.isArray(meta.items)
  ||!Array.isArray(meta.receipts)||!Array.isArray(meta.skillAwards)
  ||!Array.isArray(meta.storageReservations)
  ||(meta.custodyReceipts!==undefined&&!Array.isArray(meta.custodyReceipts)))
  throw new V2DraftCraftError('invalid_v2_virtual_ledger');
 verifyEquipmentV2HiddenLedger(accountId,meta.jobs,meta.items,meta.receipts,meta.skillAwards);
 verifyEquipmentV2StorageReservations(accountId,meta.items,meta.storageReservations);
 if(meta.gemSocketState)verifyEquipmentV2GemSidecar(meta.items,meta.gemSocketState);
 verifyEquipmentV2ReceiptNamespace({forge:meta.receipts,gems:meta.gemSocketState?.receipts,custody:meta.custodyReceipts});
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
function countIn(state:GameState,all:readonly V2VirtualCopy[],location:V2VirtualLocation,holder:string|null):boolean{
 const owned=holder?characterRow(state,holder):null;
 const storage=location==='bank'?state.bank
  :location==='pouch'?owned?v2ServerLegacyPouchSnapshot(owned.character):null
  :location==='inventory'?owned?.inventory:null;
 if(!storage||!safe(storage.capacity)||!Array.isArray(storage.stacks))
  throw new V2DraftCraftError('invalid_v2_virtual_storage');
 const occupancy=storage.stacks.length+all.filter(row=>row.location===location
  &&row.holderCharacterId===holder).length;
 return occupancy<storage.capacity;
}
function rejectLiveEquipClash(state:GameState,actor:string,slot:GearSlot,hands?:string){
 const row=characterRow(state,actor);
 if(!row)throw new V2DraftCraftError('unknown_v2_virtual_character');
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
  throw new V2DraftCraftError('unauthenticated_v2_virtual_character');
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
  if(prior.fingerprint!==v2VirtualFingerprint(command.kind,command.instanceId))
   fail('v2_virtual_request_id_conflict');
  return {state,replayed:true,receipt:prior,copies:all};
 }
 if(command.expectedVersion!==onlineVersion)fail('stale_v2_virtual_version');
 const current=all.find(row=>row.instanceId===command.instanceId);
 const item=meta.items.find(row=>row.id===command.instanceId);
 if(!current||!item)throw new V2DraftCraftError('unknown_v2_virtual_copy');
 let target:V2VirtualLocation,holder:string|null=onlineCharacterId;
 if(command.kind==='deposit_bank'){target='bank';holder=null;}
 else if(command.kind==='equip')target='equipped';
 else if(command.kind==='withdraw_bank'||command.kind==='store_deferred'||command.kind==='unequip'){
  if(countIn(state,all,'pouch',holder))target='pouch';
  else if(countIn(state,all,'inventory',holder))target='inventory';
  else throw new V2DraftCraftError('v2_virtual_destination_full');
 }else throw new V2DraftCraftError('invalid_v2_virtual_move_command');
 if(!v2VirtualAllowedTransition(command.kind,current.location,target))fail('invalid_v2_virtual_transition');
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
    location:row.location as V2CustodyLocation,equippedSlot:row.equippedSlot,
    item:record.exactItem,locked:true,favorite:true};
  })};
  const policy=v2ServerCustodyPreflight(preflight,{
   kind:'equip',actorCharacterId:onlineCharacterId,instanceId:item.id,
  });
  if(!policy.allowed)fail('v2_virtual_equip_denied:'+policy.reason);
 }
 const receipt:V2VirtualMoveReceipt={
  requestId:command.requestId,
  fingerprint:v2VirtualFingerprint(command.kind,command.instanceId),
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
