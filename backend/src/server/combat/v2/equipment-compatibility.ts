/**
 * Equipment 2.0 compatibility bridge.
 *
 * Preserves legacy T1–T9 definitions and class restrictions (NO conversions,
 * rerolls or gems changed). The new tiered T1–T5 role sets require server-
 * authored item definitions and remain independent of the old 10-piece sets.
 */
import {EQUIPMENT_PIECES_V23} from '../../equipment/equipment-catalog-v23';
import {EQUIPMENT_PIECES_V33} from '../../equipment/equipment-catalog-v33';
import {CLASS_ROLES_V2,type ClassIdV2,type GearSlotV2,type RoleV2} from './build-contract';
import {TIERED_SETS_BY_ID_V2,type EquipmentTierV2} from './set-catalog';
import type {EquipmentRegistryV2,ServerEquipmentDefinitionV2} from './build-server-service';

const legalClass=(name:string):ClassIdV2|undefined=>{
  const key=name.toUpperCase().replace(/[^A-Z0-9]+/g,'_') as ClassIdV2;
  return Object.prototype.hasOwnProperty.call(CLASS_ROLES_V2,key)?key:undefined;
};
const SLOTS:Record<string,GearSlotV2>={
 Helmet:'helmet',Chest:'chest',Gloves:'gloves',Legs:'legs',Boots:'boots',
 Weapon:'weapon','Off-hand':'offhand',Cape:'cape',Amulet:'amulet',Ring:'ring',
};
export interface AuthoredEquipmentV2 {
 readonly itemId:string;
 readonly tier:EquipmentTierV2;
 readonly setId:string;
 readonly slot:GearSlotV2;
 readonly requiredLevel:number;
 /** Optional narrower class restriction on top of the role restriction. */
 readonly eligibleClasses?:readonly ClassIdV2[];
}
/** Stable mapping for owned equipment created before the 2.0 update. */
export function legacyEquipmentRegistryV2():EquipmentRegistryV2{
 const result:Record<string,ServerEquipmentDefinitionV2>={};
 // v23 contains older item IDs. Newer v33 definitions may override matching
 // IDs, but neither pathway expands an older class restriction to a role.
 for(const p of [...EQUIPMENT_PIECES_V23,...EQUIPMENT_PIECES_V33]){
   const classId=legalClass(p.className);
   const slot=SLOTS[p.slot];
   if(!classId||!slot||!Number.isSafeInteger(p.requiredLevel)||p.requiredLevel<1)
     throw Error('combat_v2_bad_legacy_catalog:'+p.id);
   const existing=result[p.id];
   if(existing&&existing.eligibleClasses?.[0]!==classId)
     throw Error('combat_v2_legacy_class_conflict:'+p.id);
   result[p.id]={
     itemId:p.id,slot,requiredLevel:p.requiredLevel,
     eligibleClasses:[classId],tier:p.tier,
   };
 }
 return result;
}
/**
 * New gear must explicitly name one of the 60 T1–T5 server set IDs and must
 * belong to a valid piece slot for that set. Weapon/offhand are deliberately
 * excluded from the set, though separately class-specific weapons can exist.
 */
export function equipmentRegistryWithV2SetsV2(
 authored:readonly AuthoredEquipmentV2[],
 legacy:EquipmentRegistryV2=legacyEquipmentRegistryV2(),
):EquipmentRegistryV2{
 const result:Record<string,ServerEquipmentDefinitionV2>={...legacy};
 for(const row of authored){
   const set=TIERED_SETS_BY_ID_V2[row.setId];
   if(!set||set.tier!==row.tier||!set.slots.includes(row.slot)||
     !Number.isSafeInteger(row.requiredLevel)||row.requiredLevel<1||
     row.slot==='weapon'||row.slot==='offhand'||result[row.itemId])
     throw Error('combat_v2_invalid_authored_set_item:'+row.itemId);
   if(row.eligibleClasses?.length&&row.eligibleClasses.some(cls=>CLASS_ROLES_V2[cls]!==set.role))
     throw Error('combat_v2_authored_set_class_mismatch:'+row.itemId);
   result[row.itemId]={
     itemId:row.itemId,slot:row.slot,tier:row.tier,requiredLevel:row.requiredLevel,
     setFamilyId:set.id,eligibleRoles:[set.role],
     ...(row.eligibleClasses?.length?{eligibleClasses:[...row.eligibleClasses]}:{}),
   };
 }
 return result;
}
