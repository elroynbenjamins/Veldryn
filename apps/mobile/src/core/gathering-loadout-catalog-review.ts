/** Hidden preflight for raw saved presets, before legacy normalization drops
 * unknown item definitions. The independent physical mint/custody readback
 * must come from the server. No equip, inventory write or authorization. */
import type {GearSlot} from './types';
import {gatheringEquipmentDefinitionReview,WORLD_BOSS_GATHERING_SLOTS} from '../content/world-boss-gathering-catalog-review';
export type GatheringLoadoutCopyReview={readonly instanceId:string;readonly itemId:string;readonly accountId:string;
 readonly holderCharacterId:string|null;readonly location:'unclaimed'|'bank'|'inventory'|'equipped'};
type SlotMap=Partial<Record<GearSlot,string>>;
const id=(s:unknown):s is string=>typeof s==='string'&&s.length>0&&s.length<=180;
const slots:readonly GearSlot[]=WORLD_BOSS_GATHERING_SLOTS;
export function reviewGatheringLoadoutCatalogV2(input:{
 readonly accountId:string;readonly characterId:string;
 readonly category:'combat'|'mining'|'woodcutting'|'fishing'|'manual';
 readonly equipment:SlotMap;readonly equipmentInstanceIds:SlotMap;
 readonly copies:readonly GatheringLoadoutCopyReview[];
}){
 const {accountId,characterId,category,equipment,equipmentInstanceIds,copies}=input;
 if(!id(accountId)||!id(characterId)||!['combat','mining','woodcutting','fishing','manual'].includes(category)||
 !equipment||typeof equipment!=='object'||Array.isArray(equipment)||!equipmentInstanceIds||typeof equipmentInstanceIds!=='object'||Array.isArray(equipmentInstanceIds)||
 !Array.isArray(copies)||copies.length>10000)throw Error('gathering_loadout_catalog_invalid_scope');
 for(const [slot,value] of [...Object.entries(equipment),...Object.entries(equipmentInstanceIds)])
  if(!slots.includes(slot as GearSlot)||!id(value))throw Error('gathering_loadout_catalog_invalid_slot');
 const owned=new Map<string,GatheringLoadoutCopyReview>();
 for(const copy of copies){
  if(!copy||!id(copy.instanceId)||copy.accountId!==accountId||owned.has(copy.instanceId)||
   !gatheringEquipmentDefinitionReview(copy.itemId)||
   !['unclaimed','bank','inventory','equipped'].includes(copy.location)||
   (['unclaimed','bank'].includes(copy.location)?copy.holderCharacterId!==null:!id(copy.holderCharacterId)))
    throw Error('gathering_loadout_catalog_invalid_readback');
  owned.set(copy.instanceId,copy);
 }
 const gathering: {slot:GearSlot;itemId:string;instanceId:string;location:GatheringLoadoutCopyReview['location'];matchesActivity:boolean}[]=[];
 const otherEquipment:SlotMap={},otherInstanceIds:SlotMap={};
 const seen=new Set<string>();
 for(const slot of slots){
  const itemId=equipment[slot],instanceId=equipmentInstanceIds[slot];
  if(instanceId){if(!itemId||seen.has(instanceId))throw Error('gathering_loadout_catalog_duplicate_or_orphan_copy');seen.add(instanceId);}
  if(!itemId)continue;
  const def=gatheringEquipmentDefinitionReview(itemId);
  if(!def){
   if(itemId.startsWith('WB64_')||instanceId&&owned.has(instanceId))throw Error('gathering_loadout_catalog_unknown_or_mismatched_definition');
   otherEquipment[slot]=itemId;if(instanceId)otherInstanceIds[slot]=instanceId;
   continue;
  }
  if(def.slot!==slot||!instanceId)throw Error('gathering_loadout_catalog_exact_copy_required');
  const copy=owned.get(instanceId);
  if(!copy||copy.itemId!==itemId||copy.location==='unclaimed'||
   (copy.location!=='bank'&&copy.holderCharacterId!==characterId))throw Error('gathering_loadout_catalog_copy_unavailable');
  if(category==='combat')throw Error('gathering_loadout_catalog_combat_confirmation_required');
  gathering.push({slot,itemId,instanceId,location:copy.location,matchesActivity:def.skill===category});
 }
 return {gathering,otherEquipment,otherInstanceIds,matchingPieces:gathering.filter(x=>x.matchesActivity).length,
  offSkillPieces:category==='manual'?0:gathering.filter(x=>!x.matchesActivity).length,
  requiresMixedEquipmentValidation:Object.keys(otherEquipment).length>0,
  mayEquip:false as const,releaseReady:false as const};
}
