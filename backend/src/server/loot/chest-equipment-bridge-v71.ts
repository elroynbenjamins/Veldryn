/**
 * V71 hidden cross-system Equipment 2.0 bridge.
 *
 * A chest may select equipment BEFORE the unified item issuer can mint it.
 * This module maps a frozen, canonical V69 chest drop into an immutable
 * candidate: Party Event PE_ items / World Boss gathering-only sets. It never
 * invents EQ2_ craft recipes, rolls stats, creates inventory, or bypasses
 * release gates. All candidates are blocked until an audited authoritative
 * EQ2 registry and same-SQL-transaction physical custody writer exist.
 */
import type {FrozenChestReceiptV69} from './chest-reward-settlement-v69';
import {partyEventGearPieceV51} from '../party/weekly-party-event-gear-v51';
import {partyEventTemplateV66} from '../party/weekly-party-equipment-templates-v66';
import {worldBossGatheringPiecesV64,
 type WorldBossGatheringBossV64} from '../combat/world-boss-gathering-loot-v64';
import {WORLD_BOSS_GEAR_SLOTS_V58,
 type WorldBossGearSlotV58} from '../combat/world-boss-chests-v58';

export const CHEST_EQUIPMENT_BRIDGE_V71_RELEASED=false;
export const CHEST_EQUIPMENT_BRIDGE_V71_VERSION='chest-eq2-bridge-v71' as const;
export type ChestEq2TierV71=1|2|3|4|5|6|7|8|9;
export type ChestEq2FamilyV71='party_combat'|'world_gathering';
export interface ChestEq2ServerContextV71{
 /** Tier must come from locked eligibility/level proof, never client state. */
 readonly tier:ChestEq2TierV71;
 /** World Boss ID from the verified event row; not an app-supplied field. */
 readonly bossId?:WorldBossGatheringBossV64;
}
export interface ChestEquipmentCandidateV71 {
 readonly sourceKey:string;
 readonly accountId:string;
 readonly recipientCharacterId:string|null;
 readonly deliveryMode:'character'|'account_unclaimed';
 readonly dropIndex:number;
 readonly tableId:'party_event_chest'|'world_boss_chest';
 readonly family:ChestEq2FamilyV71;
 readonly selectedDropId:string;
 readonly pieceId:string;
 readonly templateKey:string;
 readonly setId:string;
 readonly slot:string;
 readonly tier:ChestEq2TierV71;
 readonly statFamily:'combat'|'gathering_speed_only';
 readonly intendedQuantity:1;
 readonly manifestRegistration:'pending_authoritative_eq2_registration';
 readonly readyForIssuance:false;
 readonly blockers:readonly string[];
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA=/^[a-f0-9]{64}$/;
const tiers:readonly ChestEq2TierV71[]=[1,2,3,4,5,6,7,8,9];
const bosses:readonly WorldBossGatheringBossV64[]=[
 'hollowroot','sunscar','frostmarch',
];
export function planChestEquipmentV71(
 receipt:FrozenChestReceiptV69,index:number,
 context:ChestEq2ServerContextV71,
):ChestEquipmentCandidateV71{
 if(!receipt||receipt.rulesVersion!=='chest-settlement-v69'||
  receipt.committed!==true||!UUID.test(receipt.accountId)||
  typeof receipt.sourceKey!=='string'||
  !receipt.sourceKey.includes(':'+receipt.accountId+':')||
  !Number.isInteger(index)||index<0||index>=receipt.drops.length||
  !context||!tiers.includes(context.tier))
  throw Error('chest_v71_untrusted_equipment_source');
 const drop=receipt.drops[index]!;
 if(drop.type!=='equipment'||drop.groupId!=='equipment'||
  drop.quantity!==1||typeof drop.entryId!=='string')
  throw Error('chest_v71_not_single_equipment_drop');
 if(receipt.tableId==='party_event_chest'){
  const piece=partyEventGearPieceV51(drop.entryId);
  if(!piece||!receipt.sourceKey.startsWith('party-event:')||
   !receipt.tableVersion.startsWith(
    'party_event_v51_'+piece.family+'_')||
   receipt.equipmentDeliveryMode!=='character'||
   !receipt.recipientCharacterId||!UUID.test(receipt.recipientCharacterId)||
   context.bossId!==undefined)
   throw Error('chest_v71_party_template_or_owner_mismatch');
  const candidate=partyEventTemplateV66(piece.id,context.tier);
  if(candidate.setId!==piece.setId||candidate.slot!==piece.slot||
   candidate.family!==piece.family||
   candidate.classRestriction!==null)
   throw Error('chest_v71_party_manifest_parity');
  return {
   sourceKey:receipt.sourceKey,accountId:receipt.accountId,
   recipientCharacterId:receipt.recipientCharacterId,
   deliveryMode:'character',dropIndex:index,
   tableId:'party_event_chest',family:'party_combat',
   selectedDropId:drop.entryId,pieceId:piece.id,
   templateKey:candidate.templateKey,setId:piece.setId,
   slot:piece.slot,tier:context.tier,statFamily:'combat',
   intendedQuantity:1,manifestRegistration:'pending_authoritative_eq2_registration',
   readyForIssuance:false,
   blockers:[
    'event_only_PE_template_missing_from_enabled_EQ2_manifest',
    'physical_character_inventory_writer_unverified',
    'exact_server_roll_affixes_and_custody_not_audited',
    ...(context.tier>4?['eq2_t5_to_t9_numeric_budgets_unapproved']:[]),
   ],
  };
 }
 if(receipt.tableId==='world_boss_chest'){
  const boss=context.bossId;
  if(!boss||!bosses.includes(boss)||
   !receipt.tableVersion.startsWith('world_boss_v58_'+boss+'_')||
   !receipt.sourceKey.startsWith('world-boss:')||
   receipt.equipmentDeliveryMode!=='account_unclaimed'||
   receipt.recipientCharacterId!==null||
   !WORLD_BOSS_GEAR_SLOTS_V58.includes(drop.entryId as WorldBossGearSlotV58))
   throw Error('chest_v71_world_gathering_source_mismatch');
  const piece=worldBossGatheringPiecesV64(boss)
   .find(item=>item.slot===drop.entryId);
  if(!piece||piece.primaryStat!=='gathering_speed')
   throw Error('chest_v71_missing_gathering_piece');
  return {
   sourceKey:receipt.sourceKey,accountId:receipt.accountId,
   recipientCharacterId:null,deliveryMode:'account_unclaimed',
   dropIndex:index,tableId:'world_boss_chest',
   family:'world_gathering',selectedDropId:drop.entryId,
   pieceId:piece.itemId,templateKey:piece.itemId+':T'+context.tier,
   setId:piece.setId,slot:piece.slot,tier:context.tier,
   statFamily:'gathering_speed_only',intendedQuantity:1,
   manifestRegistration:'pending_authoritative_eq2_registration',
   readyForIssuance:false,
   blockers:[
    'world_gathering_EQ2_physical_account_custody_missing',
    'gathering_only_roll_exact_snapshot_not_linked_to_inventory',
   ],
  };
 }
 // New chest families need an explicit template registration, never a
 // fallback EQ2_ craft item based only on a similar slot name.
 throw Error('chest_v71_no_registered_equipment_family');
}
export interface ChestEq2PhysicalReadbackV71{
 readonly sourceKey:string;
 readonly accountId:string;
 readonly recipientCharacterId:string|null;
 readonly storage:'character_inventory'|'account_unclaimed';
 readonly itemInstanceId:string;
 readonly pieceId:string;
 readonly templateKey:string;
 readonly setId:string;
 readonly slot:string;
 readonly tier:ChestEq2TierV71;
 readonly rarity:'common'|'uncommon'|'rare'|'epic'|'legendary'|'mythic';
 readonly quality:number;
 readonly exactStatSnapshotHash:string;
 readonly exactItemReceiptVersion:string;
 readonly statFamily:'combat'|'gathering_speed_only';
 readonly grantSourceKey:string;
 readonly sameTransactionPhysicalReadback:true;
}
/**
 * Must compare a DB-fetched, exact Equipment 2.0 row (NOT an API payload)
 * with the frozen candidate on the same SQL connection as the chest receipt.
 * Passing this structural check does NOT make V71 releasable or register EQ2.
 */
export function assertChestEq2PhysicalReadbackV71(
 candidate:ChestEquipmentCandidateV71,
 item:ChestEq2PhysicalReadbackV71,
):void{
 if(!candidate||candidate.readyForIssuance!==false||
  candidate.manifestRegistration!=='pending_authoritative_eq2_registration'||
  !item||!UUID.test(item.itemInstanceId)||
  item.itemInstanceId===candidate.accountId||
  (candidate.recipientCharacterId!==null&&
   item.itemInstanceId===candidate.recipientCharacterId)||
  item.sourceKey!==candidate.sourceKey||
  item.grantSourceKey!==candidate.sourceKey||
  item.accountId!==candidate.accountId||
  item.recipientCharacterId!==candidate.recipientCharacterId||
  item.storage!==(candidate.deliveryMode==='character'?
   'character_inventory':'account_unclaimed')||
  item.pieceId!==candidate.pieceId||
  item.templateKey!==candidate.templateKey||
  item.setId!==candidate.setId||item.slot!==candidate.slot||
  item.tier!==candidate.tier||item.statFamily!==candidate.statFamily||
  !['common','uncommon','rare','epic','legendary','mythic'].includes(item.rarity)||
  !Number.isSafeInteger(item.quality)||item.quality<0||item.quality>100||
  !SHA.test(item.exactStatSnapshotHash)||
  typeof item.exactItemReceiptVersion!=='string'||
  !/^equipment-v2-event-[a-z0-9-]{6,70}$/.test(item.exactItemReceiptVersion)||
  item.sameTransactionPhysicalReadback!==true)
  throw Error('chest_v71_forged_or_uncommitted_item');
}
