import type {GameState,ItemStack,CharacterState} from './types';
import {ITEMS} from '../content/items';

/** Hidden, read-only pre-migration audit.
 * Existing gear, gems, enhancements, roll versions and receipt IDs are NOT
 * remapped or overwritten by Equipment/Crafting 2.0.
 * Missing legacy instance IDs are reported, not silently converted.
 */
export interface EquipmentV2LegacyAudit{
 legacyCraftedCopies:number;reservedNamespaceCopies:number;
 legacySocketedCopies:number;legacyEnhancedCopies:number;
 accountGearRecords:number;equippedInstanceReferences:number;
 unresolvedEquippedReferences:number;duplicatePhysicalLocations:number;
 missingRecordForInstanceStacks:number;legacyStacksWithoutInstanceIds:number;
 activeAndAlternateCharacters:number;
 safeToAutoMigrate:boolean;
 issues:readonly string[];
}
const isV2=(itemId:string)=>itemId.startsWith('EQ2_');
const legacyGearIds=new Set(ITEMS.filter(item=>item.type==='gear').map(item=>item.id));
export function equipmentV2LegacyPreservationAudit(state:GameState):EquipmentV2LegacyAudit{
 const records=state.account.craftedGearInstances??[];
 const idSet=new Set(records.map(row=>row.id));
 const characters:Array<{character:CharacterState;inventory:GameState['inventory'];overflow:GameState['overflow']}>=
  state.character?[{character:state.character,inventory:state.inventory,overflow:state.overflow},
   ...(state.otherCharacters??[])]:[...(state.otherCharacters??[])];
 const physicalWithBank:ItemStack[]=[
  ...state.bank.stacks,
  ...(!state.character?[...state.inventory.stacks,...state.overflow.stacks]:[]),
  ...characters.flatMap(({character,inventory,overflow})=>[
   ...inventory.stacks,...overflow.stacks,...(character.equipmentPouch?.stacks??[]),
  ]),
 ];
 const countByInstance=new Map<string,number>();
 let missingRecordForInstanceStacks=0,legacyStacksWithoutInstanceIds=0;
 for(const row of physicalWithBank){
  if(isV2(row.itemId)||!legacyGearIds.has(row.itemId))continue;
  if(row.instanceId){
   countByInstance.set(row.instanceId,(countByInstance.get(row.instanceId)??0)+1);
   if(!idSet.has(row.instanceId))missingRecordForInstanceStacks++;
  }else if(row.quantity>0)legacyStacksWithoutInstanceIds++;
 }
 let equippedInstanceReferences=0,unresolvedEquippedReferences=0;
 for(const {character} of characters){
  for(const id of Object.values(character.equipmentInstanceIds??{})){
   if(!id)continue;
   equippedInstanceReferences++;
   if(!idSet.has(id))unresolvedEquippedReferences++;
  }
 }
 const duplicatePhysicalLocations=[...countByInstance.values()].filter(q=>q>1).length;
 const legacyCopies=records.filter(row=>!isV2(row.itemId));
 const reservedNamespaceCopies=records.filter(row=>isV2(row.itemId)).length
  +physicalWithBank.filter(row=>isV2(row.itemId)).reduce((n,row)=>n+row.quantity,0);
 const issues:string[]=[];
 if(reservedNamespaceCopies)issues.push('Reserved EQ2 item IDs exist before the coordinated release');
 if(unresolvedEquippedReferences)issues.push('Some equipped instance IDs have no account record');
 if(missingRecordForInstanceStacks)issues.push('Some physical instance stacks have no account record');
 if(duplicatePhysicalLocations)issues.push('The same instance is referenced from multiple physical locations');
 const safeToAutoMigrate=false; // Never automatically convert pre-2.0 gear.
 return {
  legacyCraftedCopies:legacyCopies.length,reservedNamespaceCopies,
  legacySocketedCopies:legacyCopies.filter(row=>Boolean(row.enhancement?.statGemId||row.enhancement?.effectGemId||row.enhancement?.gemIds?.length)).length,
  legacyEnhancedCopies:legacyCopies.filter(row=>(row.enhancement?.rank??0)>0).length,
  accountGearRecords:records.length,equippedInstanceReferences,unresolvedEquippedReferences,
  duplicatePhysicalLocations,missingRecordForInstanceStacks,legacyStacksWithoutInstanceIds,
  activeAndAlternateCharacters:characters.length,safeToAutoMigrate,issues,
 };
}
