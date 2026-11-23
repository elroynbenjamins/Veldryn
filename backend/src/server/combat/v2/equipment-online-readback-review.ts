/**
 * HIDDEN server-only readback contract for public.online_game_states.
 *
 * The actual staging table has primary key account_id, character_id,
 * JSONB state, and monotonic bigint revision. A production account lock
 * and an authenticated service context MUST supply a trusted row. This is
 * only a pure inspector of a previously loaded row: it does NOT SELECT,
 * open a transaction, authenticate, write, issue gear or enable Combat V2.
 *
 * Never take this structure from a user/client payload, even if the
 * account_id fields appear to match.
 */
import type {V2HiddenGameMetadata} from '../../equipment/equipment-crafting-v2-game-metadata';
import type {V2CustodyState,V2CustodyCopy}
 from '../../equipment/equipment-crafting-v2-custody';
import {verifyEquipmentV2HiddenLedger} from '../../equipment/equipment-crafting-v2-delivery';
import {verifyEquipmentV2ReceiptNamespace}
 from '../../equipment/equipment-crafting-v2-receipt-coherence';
import {verifyEquipmentV2StorageReservations}
 from '../../equipment/equipment-crafting-v2-storage-reservations';
import {readEquipmentV2VirtualCustody}
 from '../../equipment/equipment-crafting-v2-virtual-history';
import {CLASS_NAMES_V2} from './skill-catalog';
import {CLASS_ROLES_V2,type ClassIdV2} from './build-contract';

export interface OnlineGameStateDbRowV2{
 readonly account_id:string;
 readonly character_id:string|null;
 readonly revision:number;
 readonly state:unknown;
}
export interface OnlineForgeCombatInspectionInputV2{
 /** From server auth/session, NEVER request JSON. */
 readonly authenticatedAccountId:string;
 /** From service's locked read request. */
 readonly characterId:string;
 readonly expectedRevision:number;
 /** A locked, authenticated query of the exact account_id row above. */
 readonly row:OnlineGameStateDbRowV2;
}
export interface OnlineForgeCombatReadbackV2{
 readonly scope:'ONLINE_EQ2_STAGING_READBACK_NO_DATABASE_LOCK_OR_AUTH';
 readonly accountId:string;
 readonly characterId:string;
 readonly revision:number;
 readonly currentClassId:ClassIdV2;
 readonly currentLevel:number;
 readonly custody:V2CustodyState;
 readonly jobs:V2HiddenGameMetadata['jobs'];
 readonly items:V2HiddenGameMetadata['items'];
 readonly claims:V2HiddenGameMetadata['receipts'];
 readonly awards:V2HiddenGameMetadata['skillAwards'];
 readonly reservations:NonNullable<V2HiddenGameMetadata['storageReservations']>;
 readonly custodyReceipts:NonNullable<V2HiddenGameMetadata['custodyReceipts']>;
 readonly requiresAuthenticatedLockAndRevisionRecheck:true;
 readonly combatAuthority:false;
}
type JsonObj=Record<string,unknown>;
function fail(code:string):never{throw Error('eq2_online_readback_'+code);}
const obj=(v:unknown):v is JsonObj=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
const id=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=128;
const positiveInt=(v:unknown)=>Number.isSafeInteger(v)&&typeof v==='number'&&v>=1;
const matches=(candidate:unknown,classId:ClassIdV2)=>
 candidate===classId||candidate===CLASS_NAMES_V2[classId];
function currentClass(name:unknown):ClassIdV2{
 const choices=Object.keys(CLASS_NAMES_V2) as ClassIdV2[];
 const match=choices.filter(k=>matches(name,k));
 if(match.length!==1||!Object.prototype.hasOwnProperty.call(CLASS_ROLES_V2,match[0]))
  fail('unknown_character_class');
 return match[0];
}
/**
 * Build a complete, read-only metadata projection. This returns NO
 * verifyPersisted callback and cannot become a TrustedFrozenForgeCombatSource
 * by itself. A genuine service-owned account-lock/transaction port must
 * repeat the row revision and bind the exact digest before an encounter.
 */
export function inspectOnlineGameStateForgeCombatV2(
 input:OnlineForgeCombatInspectionInputV2,
):OnlineForgeCombatReadbackV2{
 if(!input||!id(input.authenticatedAccountId)||!id(input.characterId)||
    !positiveInt(input.expectedRevision)||!input.row||
    !id(input.row.account_id)||input.row.account_id!==input.authenticatedAccountId||
    input.row.revision!==input.expectedRevision)
  fail('account_or_revision_mismatch');
 const state=input.row.state;
 if(!obj(state)||!obj(state.account)||!obj(state.character)||
    (state.version!==6&&state.version!==11))
  fail('missing_online_game_state');
 if(input.row.character_id!==state.character.id||
    !id(state.character.id))
  fail('database_active_character_mismatch');
 const all=[state.character];
 if(state.otherCharacters!==undefined){
  if(!Array.isArray(state.otherCharacters))fail('invalid_other_characters');
  for(const entry of state.otherCharacters){
   if(!obj(entry)||!obj(entry.character))fail('invalid_other_character_entry');
   all.push(entry.character);
  }
 }
 const seen=new Set<string>();
 const characters=all.map(row=>{
  if(!obj(row)||!id(row.id)||seen.has(row.id)||!positiveInt(row.level))
   fail('invalid_account_character');
  seen.add(row.id);
  return {id:row.id,classId:currentClass(row.classId),level:row.level as number};
 });
 const selected=characters.find(c=>c.id===input.characterId);
 if(!selected)fail('unowned_combat_character');
 const meta=state.account.equipmentV2Hidden;
 if(!obj(meta)||meta.schemaVersion!=='eq2-hidden-game-state-v1'||
    !Array.isArray(meta.jobs)||!Array.isArray(meta.items)||
    !Array.isArray(meta.receipts)||!Array.isArray(meta.skillAwards)||
    !Array.isArray(meta.storageReservations)||!Array.isArray(meta.custodyReceipts))
  fail('no_valid_hidden_forge_ledger');
 // Metadata is still untrusted until all independent server validators run.
 const ledger=meta as unknown as V2HiddenGameMetadata;
 verifyEquipmentV2HiddenLedger(input.authenticatedAccountId,
  ledger.jobs,ledger.items,ledger.receipts,ledger.skillAwards);
 verifyEquipmentV2ReceiptNamespace({
  forge:ledger.receipts,custody:ledger.custodyReceipts,
  gems:ledger.gemSocketState?.receipts,
 });
 verifyEquipmentV2StorageReservations(input.authenticatedAccountId,
  ledger.items,ledger.storageReservations!);
 const virtual=readEquipmentV2VirtualCustody(
  ledger.items,ledger.storageReservations!,ledger.custodyReceipts!);
 if(virtual.length!==ledger.items.length)fail('incomplete_virtual_custody');
 if(virtual.some(copy=>copy.location==='deferred'))
  fail('deferred_claim_requires_physical_reconciliation');
 if(ledger.custodyReceipts!.some(r=>
  !seen.has(r.actorCharacterId)||
  (r.oldHolder!==null&&!seen.has(r.oldHolder))||
  (r.newHolder!==null&&!seen.has(r.newHolder))))
  fail('foreign_custody_movement');
 const original=new Map(ledger.items.map(item=>[item.id,item]));
 const custody:V2CustodyCopy[]=virtual.map(copy=>{
  const item=original.get(copy.instanceId);
  if(!item||copy.itemId!==item.exactItem.pieceId||
     (copy.holderCharacterId!==null&&!seen.has(copy.holderCharacterId)))
   fail('unowned_or_unverified_copy');
  if(copy.location==='deferred')
   fail('deferred_claim_requires_physical_reconciliation');
  return {instanceId:item.id,accountId:item.accountId,
   ownerCharacterId:copy.holderCharacterId,location:copy.location,
   equippedSlot:copy.equippedSlot,item:item.exactItem,
   locked:false,favorite:false};
 });
 if(ledger.custodyReceipts!.some(r=>r.version>input.expectedRevision)||
    ledger.receipts.some(r=>r.response.version>input.expectedRevision))
  fail('ledger_revision_outpaces_online_state');
 return {
  scope:'ONLINE_EQ2_STAGING_READBACK_NO_DATABASE_LOCK_OR_AUTH',
  accountId:input.authenticatedAccountId,characterId:selected.id,
  revision:input.row.revision,currentClassId:selected.classId,
  currentLevel:selected.level,
  custody:{accountId:input.authenticatedAccountId,characters,copies:custody},
  jobs:ledger.jobs,items:ledger.items,claims:ledger.receipts,
  awards:ledger.skillAwards,reservations:ledger.storageReservations!,
  custodyReceipts:ledger.custodyReceipts!,
  requiresAuthenticatedLockAndRevisionRecheck:true,combatAuthority:false,
 };
}
