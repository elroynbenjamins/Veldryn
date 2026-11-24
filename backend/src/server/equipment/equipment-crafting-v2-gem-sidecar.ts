import type {V2PrivateGameState as GameState} from './equipment-crafting-v2-private-game-state-type';
import type {ItemStack,InventoryState} from '../../../../apps/mobile/src/core/types';
import type {
 V2GemSocketKind,V2GemInstalled,V2GemCopySockets,V2GemReceipt,V2GemSidecarState,
} from './equipment-crafting-v2-gem-sidecar-types';
export type {
 V2GemSocketKind,V2GemInstalled,V2GemCopySockets,V2GemReceipt,V2GemSidecarState,
} from './equipment-crafting-v2-gem-sidecar-types';
import {v2ServerSocketGemKind as gemKind} from './equipment-crafting-v2-gem-identity';
import {verifyEquipmentV2GemSidecar} from './equipment-crafting-v2-gem-verifier';
export {verifyEquipmentV2GemSidecar} from './equipment-crafting-v2-gem-verifier';
import {equipmentV2AuthoritativeReadiness} from '../../../../apps/mobile/src/core/equipment-crafting-v2-authoritative-readiness';
import {assertEquipmentCraftingV2Released} from './equipment-crafting-v2-gate';
import {verifyEquipmentV2ReceiptNamespace} from './equipment-crafting-v2-receipt-coherence';
import {verifyEquipmentV2HiddenLedger} from './equipment-crafting-v2-delivery';
import {verifyEquipmentV2StorageReservations,type V2HiddenStorageReservation} from './equipment-crafting-v2-storage-reservations';
import {v2ServerExactTemplateConsistent} from './equipment-crafting-v2-instances';
import {readEquipmentV2VirtualCustody,type V2VirtualMoveReceipt} from './equipment-crafting-v2-virtual-history';
import {validateEquipmentV2EffectGemInstall} from './equipment-crafting-v2-effect-gem-policy';
import {V2DraftCraftError,type V2DraftItem,type V2DraftJob,type V2DraftReceipt,type V2DraftSkillAward} from './equipment-crafting-v2-transaction';

/**
 * Unmounted, hidden GameState rehearsal of permanent EQ2 Stat Gem sockets.
 * The forged exactItem is an immutable mint-time receipt; subsequent sockets
 * are an account-owned versioned sidecar. No live V33 gear is updated.
 *
 * Effect Gems remain fail-closed until Combat 2.0 has an authoritative
 * equipped-loadout resonance/duplicate-cap check for all characters.
 */
export interface V2HiddenGemCommand{
 requestId:string;expectedVersion:number;instanceId:string;gemId:string;
}
export interface V2HiddenGemInput{
 state:GameState;accountId:string;onlineVersion:number;
 onlineCharacterId:string|null;authoritativeWalletGold:number|null;
 command:V2HiddenGemCommand;
 /** Secure server-drawn 80–120% step-5 roll. Never accept this from a client. */
 serverRollPercent:number;
}
const fail=(reason:string):never=>{throw new V2DraftCraftError(reason);};
const safe=(x:number)=>Number.isSafeInteger(x)&&x>=0;
const validRoll=(value:number)=>safe(value)&&value>=80&&value<=120&&(value-80)%5===0;
const fingerprint=(command:V2HiddenGemCommand)=>'gem:'+command.instanceId+':'+command.gemId;
const cleanStacks=(storage:InventoryState|undefined)=>{
 if(!storage)return;
 if(!safe(storage.capacity)||!Array.isArray(storage.stacks))fail('invalid_v2_gem_storage');
 for(const row of storage.stacks){
  if(!row||typeof row.itemId!=='string'||!row.itemId
   ||!safe(row.quantity)||row.quantity<1
   ||(row.instanceId!==undefined&&(typeof row.instanceId!=='string'||!row.instanceId)))
   fail('invalid_v2_gem_storage');
 }
};
function chooseSource(state:GameState,gemId:string):V2GemReceipt['source']{
 const pouch=state.account.gemPouch;
 cleanStacks(pouch);cleanStacks(state.inventory);cleanStacks(state.bank);
 const holds=(stacks:readonly ItemStack[]|undefined)=>
  (stacks??[]).some(row=>row.itemId===gemId&&row.instanceId===undefined&&row.quantity>0);
 if(holds(pouch?.stacks))return 'gem_pouch';
 if(holds(state.inventory.stacks))return 'inventory';
 if(holds(state.bank.stacks))return 'bank';
 return fail('v2_socket_gem_not_owned');
}
function debitOne(stacks:readonly ItemStack[],gemId:string):ItemStack[]{
 let remaining=1;
 const next:ItemStack[]=[];
 for(const row of stacks){
  if(!remaining||row.itemId!==gemId||row.instanceId!==undefined){next.push(row);continue;}
  remaining=0;
  if(row.quantity>1)next.push({...row,quantity:row.quantity-1});
 }
 if(remaining)fail('v2_socket_gem_debit_mismatch');
 return next;
}
function requireSidecar(state:unknown):V2GemSidecarState{
 if(state===undefined)return {slots:[],receipts:[]};
 if(!state||typeof state!=='object'||!Array.isArray((state as V2GemSidecarState).slots)
  ||!Array.isArray((state as V2GemSidecarState).receipts))fail('invalid_v2_gem_sidecar');
 return structuredClone(state as V2GemSidecarState);
}
/** One authenticated-account CAS *rehearsal*: one gem is consumed from the
 * existing storage exactly once, and the new socket plus immutable receipt are
 * written to the same hidden GameState result. This does not persist to DB.
 */
export function simulateEquipmentV2GemInGameState(input:V2HiddenGemInput){
 const {state,accountId,onlineVersion,onlineCharacterId,authoritativeWalletGold,command,serverRollPercent}=input;
 if(!state||!state.character||!onlineCharacterId||state.character.id!==onlineCharacterId)
  throw new V2DraftCraftError('unauthenticated_v2_socket_character');
 if(!safe(onlineVersion)||!safe(authoritativeWalletGold??NaN)
  ||state.character.gold!==authoritativeWalletGold)fail('untrusted_v2_socket_wallet');
 const readiness=equipmentV2AuthoritativeReadiness({
  state,accountId,onlineVersion,onlineCharacterId,authoritativeWalletGold,
 });
 if(readiness.blocked)fail('v2_socket_not_ready:'+readiness.blockers.join(','));
 if(!command||!safe(command.expectedVersion)
  ||!/^[a-zA-Z0-9_-]{8,128}$/.test(command.requestId)
  ||!command.instanceId||!command.gemId||Object.keys(command).length!==4)
  fail('invalid_v2_socket_command');
 const raw=state.account.equipmentV2Hidden as {
  schemaVersion:string;jobs:V2DraftJob[];items:V2DraftItem[];
  receipts:V2DraftReceipt[];skillAwards:V2DraftSkillAward[];
  storageReservations?:V2HiddenStorageReservation[];
  gemSocketState?:V2GemSidecarState;
  custodyReceipts?:V2VirtualMoveReceipt[];
 }|undefined;
 if(!raw||raw.schemaVersion!=='eq2-hidden-game-state-v1')throw new V2DraftCraftError('missing_v2_socket_ledger');
 verifyEquipmentV2HiddenLedger(accountId,raw.jobs,raw.items,raw.receipts,raw.skillAwards);
 verifyEquipmentV2StorageReservations(accountId,raw.items,raw.storageReservations??[]);
 const sidecar=requireSidecar(raw.gemSocketState);
 verifyEquipmentV2GemSidecar(raw.items,sidecar);
 verifyEquipmentV2ReceiptNamespace({forge:raw.receipts,gems:sidecar.receipts,custody:raw.custodyReceipts});
 if(raw.receipts.some(row=>row.requestId===command.requestId)
  ||raw.custodyReceipts?.some(row=>row.requestId===command.requestId))
  fail('v2_cross_command_request_id_conflict');
 const existing=sidecar.receipts.find(row=>row.requestId===command.requestId);
 if(existing){
  if(existing.fingerprint!==fingerprint(command))fail('v2_socket_request_conflict');
  return {state,replayed:true,receipt:existing};
 }
 if(command.expectedVersion!==onlineVersion)fail('stale_v2_socket_version');
 if(!validRoll(serverRollPercent))fail('untrusted_v2_socket_roll');
 const item=raw.items.find(row=>row.id===command.instanceId);
 if(!item||!v2ServerExactTemplateConsistent(item.exactItem))throw new V2DraftCraftError('unknown_v2_socket_copy');
 if(item.accountId!==accountId)
  fail('wrong_v2_socket_account');
 // The original crafter is immutable, but custody can legally change via
 // account Bank transfer; actual holder is checked against replayed custody.
 // A socket is restricted to the actual shadow holder. Once a copy enters
 // the shared Bank, its original crafter cannot continue socketing it; the
 // withdrawing character becomes its authenticated holder instead.
 const custody=readEquipmentV2VirtualCustody(raw.items,
  raw.storageReservations??[],raw.custodyReceipts??[]);
 const location=custody.find(row=>row.instanceId===item.id);
 if(!location)throw new V2DraftCraftError('unreconciled_v2_socket_custody');
 if(location.holderCharacterId!==onlineCharacterId
  ||!['pouch','inventory','equipped'].includes(location.location))
  fail('v2_socket_copy_not_in_character_custody');
 const kind=gemKind(command.gemId);
 if(kind==='effect')validateEquipmentV2EffectGemInstall({
  state,accountId,actorCharacterId:onlineCharacterId,items:raw.items,
  reservations:raw.storageReservations??[],
  custodyReceipts:raw.custodyReceipts??[],installed:sidecar,
  targetInstanceId:item.id,incomingGemId:command.gemId,
 });
 if(state.settings.lockedItemIds?.includes(command.gemId)
  ||state.settings.favoriteItemIds?.includes(command.gemId))
  fail('protected_v2_socket_gem');
 const index=sidecar.slots.findIndex(row=>row.instanceId===item.id);
 const old:V2GemCopySockets=sidecar.slots[index]??{instanceId:item.id};
 const previous=old[kind];
 if(previous?.gemId===command.gemId&&previous.rollPercent>=120)
  fail('v2_socket_already_perfected');
 const source=chooseSource(state,command.gemId);
 const rollPercent=previous?.gemId===command.gemId
  ?Math.max(previous.rollPercent,serverRollPercent):serverRollPercent;
 const receipt:V2GemReceipt={
  requestId:command.requestId,fingerprint:fingerprint(command),instanceId:item.id,
  socket:kind,gemId:command.gemId,source,rollPercent,
  burnedGemId:previous&&previous.gemId!==command.gemId?previous.gemId:null,
  version:onlineVersion+1,
 };
 const next:GameState=structuredClone(state);
 if(source==='gem_pouch'){
  const pouch=next.account.gemPouch!;
  next.account.gemPouch={...pouch,stacks:debitOne(pouch.stacks,command.gemId)};
 }else if(source==='inventory'){
  next.inventory.stacks=debitOne(next.inventory.stacks,command.gemId);
 }else next.bank.stacks=debitOne(next.bank.stacks,command.gemId);
 const changed:V2GemCopySockets={...old,[kind]:{gemId:command.gemId,rollPercent}};
 if(index>=0)sidecar.slots[index]=changed;
 else sidecar.slots.push(changed);
 sidecar.receipts.push(receipt);
 verifyEquipmentV2GemSidecar(raw.items,sidecar);
 next.account={...next.account,equipmentV2Hidden:{...raw,gemSocketState:sidecar}};
 return {state:next,replayed:false,receipt};
}
/** Existing gameplay has no access to this function; fail closed even if
 * accidentally invoked before coordinated Equipment/Combat 2.0 activation. */
export function runEquipmentV2GemInGameState(input:V2HiddenGemInput){
 assertEquipmentCraftingV2Released();
 return simulateEquipmentV2GemInGameState(input);
}
