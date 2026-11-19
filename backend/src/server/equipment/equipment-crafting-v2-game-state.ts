import type {GameState,ItemStack} from '../../../../apps/mobile/src/core/types';
import {levelFromXp,totalXpAtLevel} from '../../../../apps/mobile/src/core/progression';
import {equipmentV2AuthoritativeReadiness} from '../../../../apps/mobile/src/core/equipment-crafting-v2-authoritative-readiness';
import {assertEquipmentCraftingV2Released} from './equipment-crafting-v2-gate';
import {verifyEquipmentV2HiddenLedger} from './equipment-crafting-v2-delivery';
import {reserveEquipmentV2HiddenClaim,verifyEquipmentV2StorageReservations,type V2HiddenStorageReservation} from './equipment-crafting-v2-storage-reservations';
import {verifyEquipmentV2GemSidecar,type V2GemSidecarState} from './equipment-crafting-v2-gem-sidecar';
import {readEquipmentV2VirtualCustody,type V2VirtualMoveReceipt} from './equipment-crafting-v2-virtual-custody';
import {planEquipmentV2AtomicCommit,type V2AtomicCommitPlan} from './equipment-crafting-v2-commit-plan';
import {
 type V2DraftCommand,type V2DraftContext,type V2DraftItem,type V2DraftJob,
 type V2DraftReceipt,type V2DraftSkillAward,V2DraftCraftError,
} from './equipment-crafting-v2-transaction';

/** INTERNAL sandbox integration with the existing Online GameState.
 * Intentionally not imported by backend/online/gameplay.ts and has NO route.
 * Future release must verify authentication, storage capacity, per-instance
 * ownership, the game-commit CAS, and the complete V33 coexistence contract.
 *
 * Only V2 metadata is held in account; Gold/materials/skills are modified in
 * the ORIGINAL GameState. There is no second persisted wallet or Bank ledger.
 */
export interface V2HiddenGameMetadata{
 schemaVersion:'eq2-hidden-game-state-v1';
 jobs:V2DraftJob[];
 items:V2DraftItem[];
 receipts:V2DraftReceipt[];
 skillAwards:V2DraftSkillAward[];
 /** Optional for older hidden V1 snapshots; no public EQ2 storage is modified. */
 storageReservations?:V2HiddenStorageReservation[];
 /** Separate irreversible socket history; never rewrites the minted exact item. */
 gemSocketState?:V2GemSidecarState;
 /** Replayed account-wide Bank/equip custody decisions; still hidden only. */
 custodyReceipts?:V2VirtualMoveReceipt[];
}
export interface V2HiddenGameInput{
 state:GameState;accountId:string;onlineVersion:number;
 onlineCharacterId:string|null;authoritativeWalletGold:number|null;
 command:V2DraftCommand;nowMs:number;
 randomId?():string;randomInt?(exclusiveMax:number):number;
}
const fail=(reason:string):never=>{throw new V2DraftCraftError(reason);};
const safe=(x:number)=>Number.isSafeInteger(x)&&x>=0;
const hidden=(s:GameState):V2HiddenGameMetadata|undefined=>
 (s.account as typeof s.account&{equipmentV2Hidden?:V2HiddenGameMetadata}).equipmentV2Hidden;
const empty=():V2HiddenGameMetadata=>({
 schemaVersion:'eq2-hidden-game-state-v1',jobs:[],items:[],receipts:[],skillAwards:[],storageReservations:[],
});
function requireHidden(s:GameState){
 const stored=hidden(s);
 if(!stored)return empty();
 if(stored.schemaVersion!=='eq2-hidden-game-state-v1'||!Array.isArray(stored.jobs)
  ||!Array.isArray(stored.items)||!Array.isArray(stored.receipts)
  ||!Array.isArray(stored.skillAwards)
  ||(stored.storageReservations!==undefined&&!Array.isArray(stored.storageReservations))
  ||(stored.custodyReceipts!==undefined&&!Array.isArray(stored.custodyReceipts))
  ||(stored.gemSocketState!==undefined&&(!stored.gemSocketState
   ||!Array.isArray(stored.gemSocketState.slots)||!Array.isArray(stored.gemSocketState.receipts))))
  fail('corrupted_hidden_v2_metadata');
 const checked=structuredClone(stored);
 return checked;
}
function takeMaterial(stacks:ItemStack[],id:string,quantity:number){
 if(!safe(quantity))fail('invalid_material_debit');
 let remaining=quantity;
 const result:ItemStack[]=[];
 for(const row of stacks){
  if(row.itemId!==id||row.instanceId!==undefined||remaining===0){result.push(row);continue;}
  if(!safe(row.quantity)||row.quantity<1)fail('invalid_material_stack');
  const used=Math.min(row.quantity,remaining);
  remaining-=used;
  if(row.quantity>used)result.push({...row,quantity:row.quantity-used});
 }
 if(remaining!==0)fail('material_debit_mismatch');
 return result;
}
function mapOwner<T>(
 state:GameState,id:string,update:(row:{character:NonNullable<GameState['character']>;
  inventory:GameState['inventory'];skills:GameState['skills']})=>T,
):{isActive:boolean;row:T}{
 if(state.character?.id===id)return {isActive:true,row:update({
  character:state.character,inventory:state.inventory,skills:state.skills,
 })};
 const entry=state.otherCharacters?.find(c=>c.character.id===id);
 if(!entry)fail('unknown_gameplay_owner');
 return {isActive:false,row:update(entry)};
}
function debitOwner(state:GameState,id:string,gold:number,debited:V2AtomicCommitPlan['debitedMaterialsFromCharacter']){
 const changed=mapOwner(state,id,row=>{
  if(!safe(row.character.gold)||!safe(gold)||row.character.gold<gold)fail('invalid_wallet_debit');
  let stacks=row.inventory.stacks;
  for(const material of debited)stacks=takeMaterial(stacks,material.itemId,material.quantity);
  return {character:{...row.character,gold:row.character.gold-gold},
   inventory:{...row.inventory,stacks}};
 });
 if(changed.isActive)return {...state,character:changed.row.character,inventory:changed.row.inventory};
 return {...state,otherCharacters:state.otherCharacters!.map(entry=>entry.character.id===id?
  {...entry,character:changed.row.character,inventory:changed.row.inventory}:entry)};
}
function awardOwner(state:GameState,id:string,skill:'smithing'|'tailoring',points:number){
 if(!safe(points))fail('invalid_craft_xp');
 const changed=mapOwner(state,id,row=>{
  const current=row.skills.find(s=>s.skillId===skill);
  if(!current||!safe(current.xp))fail('missing_crafting_profession');
  const xp=Math.min(totalXpAtLevel(100),current.xp+points);
  if(!safe(xp))fail('invalid_skill_xp');
  return row.skills.map(s=>s.skillId===skill?{...s,xp,level:levelFromXp(xp)}:s);
 });
 if(changed.isActive)return {...state,skills:changed.row};
 return {...state,otherCharacters:state.otherCharacters!.map(entry=>entry.character.id===id?
  {...entry,skills:changed.row}:entry)};
}
/** This is a pure rehearsal of a future command inside EXISTING online game
 * account state, *not* the independently persisted staging shadow ledger.
 * No V2 items are placed into a public gear pouch before verified custody.
 * All effects are returned together and must be committed as ONE CAS operation.
 */
export function simulateEquipmentV2InGameState(input:V2HiddenGameInput){
 const {state,accountId,onlineVersion,onlineCharacterId,authoritativeWalletGold,command,nowMs}=input;
 if(!state||!state.character||state.character.id!==onlineCharacterId)fail('unauthenticated_character');
 if(authoritativeWalletGold===null||!safe(authoritativeWalletGold))fail('missing_online_wallet');
 if(state.character.gold!==authoritativeWalletGold)fail('untrusted_wallet_override_required');
 const readiness=equipmentV2AuthoritativeReadiness({
  state,accountId,onlineVersion,onlineCharacterId,authoritativeWalletGold,
 });
 if(readiness.blocked||!readiness.projection)
  fail('v2_gameplay_not_ready:'+readiness.blockers.join(','));
 const metadata=requireHidden(state);
 verifyEquipmentV2HiddenLedger(accountId,metadata.jobs,metadata.items,metadata.receipts,metadata.skillAwards);
 verifyEquipmentV2StorageReservations(accountId,metadata.items,metadata.storageReservations??[]);
 if(metadata.gemSocketState)verifyEquipmentV2GemSidecar(metadata.items,metadata.gemSocketState);
 if(metadata.custodyReceipts)readEquipmentV2VirtualCustody(metadata.items,metadata.storageReservations??[],metadata.custodyReceipts);
 if(metadata.gemSocketState?.receipts.some(receipt=>receipt.requestId===command.requestId)
  ||metadata.custodyReceipts?.some(receipt=>receipt.requestId===command.requestId))
  fail('v2_cross_command_request_id_conflict');
 const previous={...readiness.projection,
  jobs:metadata.jobs,equipment:metadata.items,
  receipts:metadata.receipts,skillAwards:metadata.skillAwards,
 };
 const ctx:V2DraftContext={accountId,characterId:onlineCharacterId,nowMs,
  randomId:input.randomId,randomInt:input.randomInt};
 const {plan,resolution}=planEquipmentV2AtomicCommit(previous,command,ctx);
 if(plan.replayed)return {state,plan,response:plan.response,replayed:true,delivery:null};
 if(plan.needsLegacyCoexistenceAdapter!==true)fail('missing_legacy_coexistence_guard');
 let next:GameState=structuredClone(state);
 if(command.kind==='start'){
  next=debitOwner(next,onlineCharacterId,
   plan.expectedWalletGold-plan.nextWalletGold,plan.debitedMaterialsFromCharacter);
  for(const mat of plan.debitedMaterialsFromBank)
   next.bank.stacks=takeMaterial(next.bank.stacks,mat.itemId,mat.quantity);
 }else{
  if(!plan.awardedXp||!plan.createdItem||plan.awardedXp.jobId!==plan.createdItem.jobId)
   fail('incomplete_craft_claim');
  next=awardOwner(next,plan.awardedXp.characterId,
   plan.awardedXp.profession,plan.awardedXp.xp);
 }
 // Reserve *virtual* space for each separate claimed copy so that two
 // successful claims cannot each promise the same last pouch/Inventory slot.
 // These receipts are metadata only; nothing is physically delivered.
 const storageReservations=[...(metadata.storageReservations??[])];
 const planned=command.kind==='claim'&&plan.createdItem
  ?reserveEquipmentV2HiddenClaim(next,accountId,plan.createdItem,storageReservations):null;
 if(planned)storageReservations.push(planned.reservation);
 const updated:V2HiddenGameMetadata={
  schemaVersion:'eq2-hidden-game-state-v1',
  jobs:resolution.next.jobs,items:resolution.next.equipment,
  receipts:resolution.next.receipts,skillAwards:resolution.next.skillAwards,
  storageReservations,
  ...(metadata.gemSocketState?{gemSocketState:metadata.gemSocketState}:{}),
  ...(metadata.custodyReceipts?{custodyReceipts:metadata.custodyReceipts}:{}),
 };
 verifyEquipmentV2HiddenLedger(accountId,updated.jobs,updated.items,updated.receipts,updated.skillAwards);
 verifyEquipmentV2StorageReservations(accountId,updated.items,storageReservations);
 next.account={...next.account,equipmentV2Hidden:updated};
 const delivery=planned?.delivery??null;
 // CAS is still owned by the existing online gameplay service. Never change
 // GameState.version (schema 6/11) to the server's online sequence number.
 if(next.version!==state.version)fail('game_schema_version_corrupted');
 return {state:next,plan,response:plan.response,replayed:false,delivery};
}
/** No real gameplay command uses this. Exposing it later requires explicit
 * coordinated Equipment/Skills/Enemies 2.0 authorization and staging QA.
 */
export function runEquipmentV2InGameState(input:V2HiddenGameInput){
 assertEquipmentCraftingV2Released();
 return simulateEquipmentV2InGameState(input);
}
