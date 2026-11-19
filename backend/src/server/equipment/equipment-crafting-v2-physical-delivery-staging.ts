import {createHash} from 'node:crypto';
import type {GameState,ItemStack,InventoryState,CharacterState} from '../../../../apps/mobile/src/core/types';
import {equipmentPouchForCharacter} from '../../../../apps/mobile/src/core/equipment-pouch';
import {verifyEquipmentV2HiddenLedger} from './equipment-crafting-v2-delivery';
import {verifyEquipmentV2StorageReservations} from './equipment-crafting-v2-storage-reservations';
import {verifyEquipmentV2GemSidecar} from './equipment-crafting-v2-gem-sidecar';
import {verifyEquipmentV2ReceiptNamespace} from './equipment-crafting-v2-receipt-coherence';
import {readEquipmentV2VirtualCustody} from './equipment-crafting-v2-virtual-custody';
import type {V2HiddenGameMetadata} from './equipment-crafting-v2-game-state';
import {v2ServerExactTemplateConsistent} from './equipment-crafting-v2-instances';
import {V2DraftCraftError} from './equipment-crafting-v2-transaction';
import {assertEquipmentCraftingV2Released} from './equipment-crafting-v2-gate';

/**
 * Unmounted STAGING fixture: produce the exact GameState delta that a future
 * catalog/serializer-compatible physical delivery would need. This is NOT a
 * production route, RPC, migration, live V33 item or player grant.
 *
 * In particular V33 itemDef()/pouch normalization cannot yet safely round-trip
 * EQ2_ item IDs. Never pass this candidate to the live online commit until
 * those readers, combat, loadouts and disposal paths are migrated together.
 */
export interface V2PhysicalDeliveryReceipt {
 requestId:string;instanceId:string;jobId:string;itemId:string;
 accountId:string;holderCharacterId:string;location:'equipment_pouch'|'inventory';
 expectedVersion:number;claimRequestId:string;
 physicallyDelivered:true;stagingOnly:true;
}
export interface V2StagingDeliveryInput {
 state:GameState;accountId:string;onlineVersion:number;
 onlineCharacterId:string|null;authoritativeWalletGold:number|null;
 requestId:string;expectedVersion:number;instanceId:string;
 /** Hard-coded staging fixture capability, NEVER issued by an online client. */
 stagingFixture:'eq2-isolated-catalog-fixture-v1';
}
type Metadata=V2HiddenGameMetadata&{physicalDeliveryReceipts?:V2PhysicalDeliveryReceipt[]};
const fail=(code:string):never=>{throw new V2DraftCraftError(code);};
const safe=(n:number)=>Number.isSafeInteger(n)&&n>=0;
function allPhysicalIds(state:GameState):string[]{
 const stacks:readonly ItemStack[][]=[
  state.inventory.stacks,state.bank.stacks,state.overflow.stacks,
  state.character?.equipmentPouch?.stacks??[],
  ...(state.otherCharacters??[]).flatMap(row=>[
   row.inventory.stacks,row.overflow.stacks,row.character.equipmentPouch?.stacks??[],
  ]),
 ];
 return [
  ...(state.account.craftedGearInstances??[]).map(row=>row.id),
  ...stacks.flatMap(rows=>rows.map(row=>row.instanceId)),
  ...Object.values(state.character?.equipmentInstanceIds??{}),
  ...(state.otherCharacters??[]).flatMap(row=>Object.values(row.character.equipmentInstanceIds??{})),
 ].filter((id):id is string=>typeof id==='string'&&id.length>0);
}
function accountHolder(state:GameState,id:string):
 {character:CharacterState;inventory:InventoryState;isActive:boolean}|null{
 if(state.character?.id===id)return {character:state.character,inventory:state.inventory,isActive:true};
 const row=state.otherCharacters?.find(row=>row.character.id===id);
 return row?{character:row.character,inventory:row.inventory,isActive:false}:null;
}
export function verifyEquipmentV2StagingPhysicalReceipts(
 state:GameState,accountId:string,meta:Metadata,
):void {
 const receipts=meta.physicalDeliveryReceipts??[];
 if(!Array.isArray(receipts))fail('invalid_v2_physical_receipts');
 const physical=allPhysicalIds(state);
 const usedIds=new Set<string>(),usedRequestIds=new Set<string>();
 for(const receipt of receipts){
  if(!receipt||receipt.accountId!==accountId
   ||!receipt.instanceId||!receipt.requestId
   ||usedIds.has(receipt.instanceId)||usedRequestIds.has(receipt.requestId)
   ||receipt.physicallyDelivered!==true||receipt.stagingOnly!==true
   ||!safe(receipt.expectedVersion)
   ||!['inventory','equipment_pouch'].includes(receipt.location))
   fail('invalid_v2_physical_receipt');
  usedIds.add(receipt.instanceId);usedRequestIds.add(receipt.requestId);
  const item=meta.items.find(row=>row.id===receipt.instanceId);
  const claim=meta.receipts.find(row=>row.requestId===receipt.claimRequestId
   &&row.response.kind==='claimed'&&row.response.instanceId===receipt.instanceId);
  if(!item||item.accountId!==accountId||!claim
   ||item.jobId!==receipt.jobId||item.exactItem.pieceId!==receipt.itemId)
   fail('orphan_v2_physical_receipt');
  const holder=accountHolder(state,receipt.holderCharacterId);
  if(!holder)fail('missing_v2_physical_holder');
  const stacks=receipt.location==='inventory'?holder.inventory.stacks
   :holder.character.equipmentPouch?.stacks??[];
  const matches=stacks.filter(row=>row.instanceId===receipt.instanceId
   &&row.itemId===receipt.itemId&&row.quantity===1);
  if(matches.length!==1||physical.filter(id=>id===receipt.instanceId).length!==1)
   fail('v2_physical_delivery_custody_mismatch');
 }
 const claimedIds=new Set(meta.items.map(row=>row.id));
 for(const id of physical)if(claimedIds.has(id)&&!usedIds.has(id))
  fail('unreceipted_v2_physical_copy');
}
function install(state:GameState,characterId:string,location:V2PhysicalDeliveryReceipt['location'],stack:ItemStack):GameState{
 const next=structuredClone(state);
 if(next.character?.id===characterId){
  if(location==='inventory')next.inventory.stacks.push(stack);
  else{
   const pouch=equipmentPouchForCharacter(next.character);
   next.character.equipmentPouch={...pouch,stacks:[...pouch.stacks,stack]};
  }
  return next;
 }
 const other=next.otherCharacters?.find(row=>row.character.id===characterId);
 if(!other)fail('unknown_v2_physical_owner');
 if(location==='inventory')other.inventory.stacks.push(stack);
 else{
  const pouch=equipmentPouchForCharacter(other.character);
  other.character.equipmentPouch={...pouch,stacks:[...pouch.stacks,stack]};
 }
 return next;
}
/** Single-CAS staging candidate. A lost reply replays the original receipt;
 * it never manufactures a second copy or silently switches destinations.
 */
export function simulateEquipmentV2PhysicalDeliveryStaging(input:V2StagingDeliveryInput){
 const {state,accountId,onlineVersion,onlineCharacterId,authoritativeWalletGold,
  requestId,expectedVersion,instanceId,stagingFixture}=input;
 if(stagingFixture!=='eq2-isolated-catalog-fixture-v1')fail('v2_staging_fixture_required');
 if(!state?.character||state.character.id!==onlineCharacterId
  ||!safe(onlineVersion)||!safe(authoritativeWalletGold??NaN)
  ||state.character.gold!==authoritativeWalletGold||!accountId)
  fail('unauthenticated_v2_physical_snapshot');
 if(!/^[A-Za-z0-9_-]{8,128}$/.test(requestId)||!safe(expectedVersion)
  ||typeof instanceId!=='string'||!instanceId)
  fail('invalid_v2_physical_command');
 const meta=state.account.equipmentV2Hidden as Metadata|undefined;
 if(!meta||meta.schemaVersion!=='eq2-hidden-game-state-v1')
  fail('missing_v2_physical_ledger');
 verifyEquipmentV2HiddenLedger(accountId,meta.jobs,meta.items,meta.receipts,meta.skillAwards);
 verifyEquipmentV2StorageReservations(accountId,meta.items,meta.storageReservations??[]);
 if(meta.gemSocketState)verifyEquipmentV2GemSidecar(meta.items,meta.gemSocketState);
 verifyEquipmentV2ReceiptNamespace({
  forge:meta.receipts,gems:meta.gemSocketState?.receipts,custody:meta.custodyReceipts,
 });
 verifyEquipmentV2StagingPhysicalReceipts(state,accountId,meta);
 const existing=meta.physicalDeliveryReceipts?.find(row=>row.requestId===requestId);
 if(existing){
  if(existing.instanceId!==instanceId)fail('v2_physical_request_conflict');
  return {state,replayed:true,deferred:false,receipt:existing,commit:null};
 }
 if(meta.receipts.some(row=>row.requestId===requestId)
  ||meta.gemSocketState?.receipts.some(row=>row.requestId===requestId)
  ||meta.custodyReceipts?.some(row=>row.requestId===requestId))
  fail('v2_cross_command_request_id_conflict');
 if(expectedVersion!==onlineVersion)fail('stale_v2_physical_version');
 if(meta.physicalDeliveryReceipts?.some(row=>row.instanceId===instanceId))
  fail('v2_physical_copy_already_delivered');
 const item=meta.items.find(row=>row.id===instanceId);
 if(!item||item.accountId!==accountId||!v2ServerExactTemplateConsistent(item.exactItem))
  fail('invalid_v2_physical_exact_copy');
 const claim=meta.receipts.find(row=>row.response.kind==='claimed'
  &&row.response.instanceId===instanceId);
 if(!claim)fail('missing_v2_physical_claim');
 const custody=readEquipmentV2VirtualCustody(meta.items,
  meta.storageReservations??[],meta.custodyReceipts??[]);
 const location=custody.find(row=>row.instanceId===instanceId);
 if(!location||location.location==='equipped'||location.location==='bank')
  fail('v2_physical_requires_character_storage');
 const holderId=location.holderCharacterId;
 if(!holderId)fail('unowned_v2_physical_copy');
 const holder=accountHolder(state,holderId);
 if(!holder)fail('unknown_v2_physical_owner');
 const reserved=meta.physicalDeliveryReceipts??[];
 const physicallyDeliveredIds=new Set(reserved.map(row=>row.instanceId));
 const eligible=(
  dest:'pouch'|'inventory',
 ):boolean=>{
  const storage=dest==='pouch'?equipmentPouchForCharacter(holder.character):holder.inventory;
  if(!safe(storage.capacity)||!Array.isArray(storage.stacks)
   ||storage.stacks.some(row=>!row||!safe(row.quantity)||row.quantity<1))
   fail('invalid_v2_physical_storage');
  const pending=custody.filter(row=>row.holderCharacterId===holderId
   &&row.location===dest&&!physicallyDeliveredIds.has(row.instanceId)).length;
  return storage.stacks.length+pending<=storage.capacity;
 };
 // A deferred claim must be safely rehomed; no Overflow auto-expiry.
 const dest=location.location==='deferred'?
  eligible('pouch')?'pouch':eligible('inventory')?'inventory':null
  :location.location==='pouch'?'pouch':'inventory';
 if(!dest||!eligible(dest))return {
  state,replayed:false,deferred:true,receipt:null,commit:null,
 };
 if(allPhysicalIds(state).includes(instanceId))fail('v2_physical_duplicate_instance');
 const physical:V2PhysicalDeliveryReceipt={
  requestId,instanceId,jobId:item.jobId,itemId:item.exactItem.pieceId,
  accountId,holderCharacterId:holderId,
  location:dest==='pouch'?'equipment_pouch':'inventory',
  expectedVersion,claimRequestId:claim.requestId,
  physicallyDelivered:true,stagingOnly:true,
 };
 let next=install(state,holderId,physical.location,
  {itemId:physical.itemId,instanceId,quantity:1});
 next.account={...next.account,equipmentV2Hidden:{
  ...meta,physicalDeliveryReceipts:[...reserved,physical],
 }};
 verifyEquipmentV2StagingPhysicalReceipts(next,accountId,
  next.account.equipmentV2Hidden as Metadata);
 if(next.version!==state.version||next.character?.gold!==state.character.gold)
  fail('unexpected_v2_physical_wallet_or_schema_change');
 return {
  state:next,replayed:false,deferred:false,receipt:physical,
  commit:buildEquipmentV2StagingOnlineCommitCandidate({
   state:next,accountId,onlineVersion,authoritativeWalletGold,
   requestId,instanceId,
  }),
 };
}
/** ONLY an offline contract snapshot of the real online handler's RPC shape.
 * NOT a DB write, commit or client-submittable request. Concurrency and
 * rollback must be validated against the real SQL function before release.
 */
export function buildEquipmentV2StagingOnlineCommitCandidate(input:{
 state:GameState;accountId:string;onlineVersion:number;
 authoritativeWalletGold:number;requestId:string;instanceId:string;
}){
 const command={type:'equipment_v2_physical_delivery',instanceId:input.instanceId};
 const canonical=JSON.stringify(command);
 const requestHash=createHash('sha256').update(canonical).digest('hex');
 const response={
  state:input.state,version:input.onlineVersion+1,
  accountId:input.accountId,
  // A future first-party router must provide serverNow and the rest of the
  // normal game-command response before creating a real production commit.
 };
 return {
  rpcName:'commit_online_game_guild_pve_v1' as const,
  args:{
   p_account_id:input.accountId,p_expected_version:input.onlineVersion,
   p_expected_gold:input.authoritativeWalletGold,
   p_request_id:input.requestId,p_request_hash:requestHash,
   p_response:response,p_contributions:[] as never[],
  },
  previewOnly:true as const,productionReady:false as const,
 };
}
/** Do not mistake the isolated test candidate for a runtime command. */
export function runEquipmentV2PhysicalDelivery(input:V2StagingDeliveryInput){
 assertEquipmentCraftingV2Released();
 return simulateEquipmentV2PhysicalDeliveryStaging(input);
}
