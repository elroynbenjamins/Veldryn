import type {GameState,ItemStack,InventoryState} from '../../../../apps/mobile/src/core/types';
import {itemDef} from '../../../../apps/mobile/src/content/items';
import {equipmentV2AuthoritativeReadiness} from '../../../../apps/mobile/src/core/equipment-crafting-v2-authoritative-readiness';
import {assertEquipmentCraftingV2Released} from './equipment-crafting-v2-gate';
import {verifyEquipmentV2HiddenLedger} from './equipment-crafting-v2-delivery';
import {verifyEquipmentV2StorageReservations,type V2HiddenStorageReservation} from './equipment-crafting-v2-storage-reservations';
import {v2ServerExactTemplateConsistent} from './equipment-crafting-v2-instances';
import {V2DraftCraftError,type V2DraftItem,type V2DraftJob,type V2DraftReceipt,type V2DraftSkillAward} from './equipment-crafting-v2-transaction';

/**
 * Unmounted, hidden GameState rehearsal of permanent EQ2 Stat Gem sockets.
 * The forged exactItem is an immutable mint-time receipt; subsequent sockets
 * are an account-owned versioned sidecar. No live V33 gear is updated.
 *
 * Effect Gems remain fail-closed until Combat 2.0 has an authoritative
 * equipped-loadout resonance/duplicate-cap check for all characters.
 */
export type V2GemSocketKind='stat'|'effect';
export interface V2GemInstalled{gemId:string;rollPercent:number}
export interface V2GemCopySockets {
 instanceId:string;
 stat?:V2GemInstalled;
 effect?:V2GemInstalled;
}
export interface V2GemReceipt {
 requestId:string;fingerprint:string;instanceId:string;
 socket:V2GemSocketKind;gemId:string;
 source:'gem_pouch'|'inventory'|'bank';
 rollPercent:number;burnedGemId:string|null;version:number;
}
export interface V2GemSidecarState{
 slots:V2GemCopySockets[];
 receipts:V2GemReceipt[];
}
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
const gemKind=(id:string):V2GemSocketKind=>{
 let gem:ReturnType<typeof itemDef>;
 try{gem=itemDef(id);}catch{return fail('unknown_v2_socket_gem');}
 if(gem.type!=='gem')fail('invalid_v2_socket_gem');
 const kind=gem.gemKind??(gem.gemEffect?'effect':'stat');
 if(kind!=='stat'&&kind!=='effect')fail('invalid_v2_socket_gem');
 return kind;
};
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
export function verifyEquipmentV2GemSidecar(
 items:readonly V2DraftItem[],sidecar:V2GemSidecarState,
):void{
 if(!sidecar||!Array.isArray(sidecar.slots)||!Array.isArray(sidecar.receipts))fail('invalid_v2_gem_sidecar');
 const itemIds=new Set(items.map(row=>row.id));
 const ids=new Set<string>(),receiptIds=new Set<string>();
 const rebuilt=new Map<string,V2GemCopySockets>();
 let lastVersion=-1;
 for(const row of sidecar.slots){
  if(!row||!itemIds.has(row.instanceId)||ids.has(row.instanceId))
   fail('invalid_v2_gem_copy_sockets');
  ids.add(row.instanceId);
  for(const kind of ['stat','effect'] as const){
   const gem=row[kind];
   if(!gem)continue;
   if(!validRoll(gem.rollPercent)||gemKind(gem.gemId)!==kind)
    fail('invalid_v2_installed_gem');
  }
 }
 for(const row of sidecar.receipts){
  if(!row||typeof row.requestId!=='string'||!row.requestId
   ||receiptIds.has(row.requestId)||!itemIds.has(row.instanceId)
   ||row.fingerprint!=='gem:'+row.instanceId+':'+row.gemId
   ||!validRoll(row.rollPercent)||gemKind(row.gemId)!==row.socket
   ||!safe(row.version)||!['gem_pouch','inventory','bank'].includes(row.source)
   ||(row.burnedGemId!==null&&gemKind(row.burnedGemId)!==row.socket))
   fail('invalid_v2_gem_receipt');
  if(row.version<=lastVersion)fail('out_of_order_v2_gem_receipt');
  lastVersion=row.version;
  const before:V2GemCopySockets=rebuilt.get(row.instanceId)??{instanceId:row.instanceId};
  const previous=before[row.socket];
  const burned=previous&&previous.gemId!==row.gemId?previous.gemId:null;
  if(burned!==row.burnedGemId
   ||(previous?.gemId===row.gemId&&
    (previous.rollPercent>=120||row.rollPercent<previous.rollPercent)))
   fail('invalid_v2_gem_receipt_history');
  rebuilt.set(row.instanceId,{...before,[row.socket]:{
   gemId:row.gemId,rollPercent:row.rollPercent,
  }});
  receiptIds.add(row.requestId);
 }
 if(rebuilt.size!==sidecar.slots.length)fail('v2_gem_sidecar_state_mismatch');
 for(const current of sidecar.slots){
  const expected=rebuilt.get(current.instanceId);
  if(!expected||JSON.stringify(expected)!==JSON.stringify(current))
   fail('v2_gem_sidecar_state_mismatch');
 }
}
/** One authenticated-account CAS *rehearsal*: one gem is consumed from the
 * existing storage exactly once, and the new socket plus immutable receipt are
 * written to the same hidden GameState result. This does not persist to DB.
 */
export function simulateEquipmentV2GemInGameState(input:V2HiddenGemInput){
 const {state,accountId,onlineVersion,onlineCharacterId,authoritativeWalletGold,command,serverRollPercent}=input;
 if(!state||!state.character||!onlineCharacterId||state.character.id!==onlineCharacterId)
  fail('unauthenticated_v2_socket_character');
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
 }|undefined;
 if(!raw||raw.schemaVersion!=='eq2-hidden-game-state-v1')fail('missing_v2_socket_ledger');
 verifyEquipmentV2HiddenLedger(accountId,raw.jobs,raw.items,raw.receipts,raw.skillAwards);
 verifyEquipmentV2StorageReservations(accountId,raw.items,raw.storageReservations??[]);
 const sidecar=requireSidecar(raw.gemSocketState);
 verifyEquipmentV2GemSidecar(raw.items,sidecar);
 if(raw.receipts.some(row=>row.requestId===command.requestId))
  fail('v2_cross_command_request_id_conflict');
 const existing=sidecar.receipts.find(row=>row.requestId===command.requestId);
 if(existing){
  if(existing.fingerprint!==fingerprint(command))fail('v2_socket_request_conflict');
  return {state,replayed:true,receipt:existing};
 }
 if(command.expectedVersion!==onlineVersion)fail('stale_v2_socket_version');
 if(!validRoll(serverRollPercent))fail('untrusted_v2_socket_roll');
 const item=raw.items.find(row=>row.id===command.instanceId);
 if(!item||!v2ServerExactTemplateConsistent(item.exactItem))fail('unknown_v2_socket_copy');
 if(item.accountId!==accountId||item.ownerCharacterId!==onlineCharacterId)
  fail('wrong_v2_socket_owner');
 // An item cannot be socketed using its Forge job ID alone. Require its
 // immutable claim to have reserved a storage slot (possibly deferred).
 if(!(raw.storageReservations??[]).some(row=>row.instanceId===item.id))
  fail('unreconciled_v2_socket_custody');
 const kind=gemKind(command.gemId);
 if(kind==='effect')fail('v2_effect_gem_loadout_cap_not_ready');
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
