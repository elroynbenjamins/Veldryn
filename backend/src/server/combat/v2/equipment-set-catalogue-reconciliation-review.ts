/**
 * REVIEW ONLY. Compare source-pinned EQ2 Forge set-piece membership with the
 * *different* Combat 2.0 12-family / T1–T5 structural catalogue.
 *
 * Historical Forge snapshot:
 *   equipment-crafting-v2-manifest.ts
 *   blob d9da079bf924f94ac66ad5d8c33ae7221c8edf5d
 *   on feature/eq2-t1-t4-expansion-loot-policy-20261119
 * Expanded 51 Forge armor/accessory pieces have NO setId; neither do the
 * 52 class armaments. 15 Forge sets currently account for 42 set pieces.
 *
 * Structural Combat source is the same revision of set-catalog.ts imported
 * below. No 1:1 ID mapping or actual item ownership is implied. NEVER use
 * this read-only catalogue for enabling set bonuses or minting equipment.
 */
import {SET_FAMILIES_V2,TIERED_SETS_V2} from './set-catalog';
import type {GearSlotV2} from './build-contract';

export const FORGE_SET_RECONCILIATION_SOURCE_V2={
 forgeManifestBlob:'d9da079bf924f94ac66ad5d8c33ae7221c8edf5d',
 forgeExpansionBlob:'e338736eb9592ebe8ff64a26d8f79f035a21a60f',
 forgeArmamentBlob:'800cd8cf98f6641892650b10419f8d0f784c88c6',
 combatSetCatalogueBlob:'b5b0e12e43649a05723c8471cb17de4ac8a0df0b',
} as const;

export interface ExistingForgeSetV2{
 readonly id:string;
 readonly tier:1|2|3|4;
 readonly slots:readonly GearSlotV2[];
}
/** A pinned summary of observed *original* sets. This module is not the
 * source of items or bonuses; refresh hashes + re-audit on any branch merge.
 */
export const PINNED_FORGE_SETS_V2:readonly ExistingForgeSetV2[]=[
 {id:'EQ2_SET_FIELDBORN_GUARD',tier:1,slots:['helmet','chest']},
 {id:'EQ2_SET_FIELDBORN_TRAIL',tier:1,slots:['gloves','boots']},
 {id:'EQ2_SET_FIELDBORN_ACOLYTE',tier:1,slots:['cape','amulet']},
 {id:'EQ2_SET_IRONWOOD_SENTINEL',tier:2,slots:['chest','legs','boots']},
 {id:'EQ2_SET_IRONWOOD_STALKER',tier:2,slots:['helmet','gloves','cape']},
 {id:'EQ2_SET_IRONWOOD_MENDER',tier:2,slots:['helmet','gloves','amulet']},
 {id:'EQ2_SET_SUNSCAR_THORNHIDE',tier:3,slots:['chest','gloves','cape']},
 {id:'EQ2_SET_SUNSCAR_BREAKSTEEL',tier:3,slots:['chest','legs','gloves']},
 {id:'EQ2_SET_SUNSCAR_WILDROOT',tier:3,slots:['helmet','boots','cape']},
 {id:'EQ2_SET_GLASSBOUND_BULWARK',tier:4,slots:['helmet','chest','legs','boots']},
 {id:'EQ2_SET_GLASSBOUND_RETALIATOR',tier:4,slots:['gloves','cape']},
 {id:'EQ2_SET_GLASSBOUND_SHADOWSTEP',tier:4,slots:['helmet','chest','gloves','boots']},
 {id:'EQ2_SET_GLASSBOUND_SPELLWEAVE',tier:4,slots:['cape','amulet']},
 {id:'EQ2_SET_GLASSBOUND_LIFEWOVEN',tier:4,slots:['helmet','chest','legs','boots']},
 {id:'EQ2_SET_GLASSBOUND_DAWNSHIELD',tier:4,slots:['gloves','cape']},
] as const;

export interface SetCatalogAuditV2 {
 readonly mode:'REVIEW_ONLY_NO_COMBAT_AUTHORITY';
 readonly familyDefinitions:number;
 readonly structuralTieredSets:number;
 readonly structuralT1ToT4Sets:number;
 readonly structuralT5Sets:number;
 readonly structuralSixPieceSets:number;
 readonly structuralT1ToT4RequiredSetPieceSlots:number;
 readonly forgeNamedSets:number;
 readonly forgeTotalSetPieces:number;
 readonly forgeSetsBySize:Readonly<Record<string,number>>;
 readonly forgeSetIds:readonly string[];
 readonly structuralIdsWithoutSameIdForgeMembership:readonly string[];
 readonly exactIdMatches:number;
 readonly forgeSixPieceSets:number;
 readonly hypotheticalMinAdditionalPiecesForAllT1ToT4:number;
}
/** Does not infer match by role, slot, name, rarity, prefix or tier.
 * Explicit signed item-level mapping is necessary for any future match.
 */
export function auditForgeAndCombatSetsV2():SetCatalogAuditV2{
 const uniqueFamilies=new Set<string>();
 for(const family of SET_FAMILIES_V2){
  if(uniqueFamilies.has(family.id)||family.slots.length<2||
     new Set(family.slots).size!==family.slots.length||
     family.thresholds.some(t=>!Number.isInteger(t)||t<2||t>family.slots.length)||
     new Set(family.thresholds).size!==family.thresholds.length)
   throw Error('combat_v2_invalid_structural_family');
  uniqueFamilies.add(family.id);
 }
 const forgeIds=new Set<string>();
 for(const row of PINNED_FORGE_SETS_V2){
  if(forgeIds.has(row.id)||row.slots.length<2||
     new Set(row.slots).size!==row.slots.length)
   throw Error('combat_v2_invalid_forge_set_source_snapshot');
  forgeIds.add(row.id);
 }
 const bySize:Record<string,number>={};
 for(const set of PINNED_FORGE_SETS_V2)
  bySize[String(set.slots.length)]=(bySize[String(set.slots.length)]??0)+1;
 const structuralT1ToT4=TIERED_SETS_V2.filter(row=>row.tier!=='T5');
 const exactIdMatches=TIERED_SETS_V2.filter(row=>forgeIds.has(row.id)).length;
 const structuralT1ToT4RequiredSetPieceSlots=structuralT1ToT4.reduce(
  (total,row)=>total+row.slots.length,0);
 const forgeTotalSetPieces=PINNED_FORGE_SETS_V2.reduce(
  (total,row)=>total+row.slots.length,0);
 return {
  mode:'REVIEW_ONLY_NO_COMBAT_AUTHORITY',
  familyDefinitions:SET_FAMILIES_V2.length,
  structuralTieredSets:TIERED_SETS_V2.length,
  structuralT1ToT4Sets:structuralT1ToT4.length,
  structuralT5Sets:TIERED_SETS_V2.length-structuralT1ToT4.length,
  structuralSixPieceSets:TIERED_SETS_V2.filter(row=>row.slots.length===6).length,
  structuralT1ToT4RequiredSetPieceSlots,
  forgeNamedSets:PINNED_FORGE_SETS_V2.length,
  forgeTotalSetPieces,
  forgeSetsBySize:bySize,
  forgeSetIds:[...forgeIds].sort(),
  structuralIdsWithoutSameIdForgeMembership:TIERED_SETS_V2.filter(row=>!forgeIds.has(row.id))
   .map(row=>row.id).sort(),
  exactIdMatches,
  /** Mathematical count only, not an item mint proposal: assumes every one
   * of the original 42 set items could be reused for a distinct new set.
   * Actual source IDs and roles do not match, so reuse needs explicit proof.
   */
  hypotheticalMinAdditionalPiecesForAllT1ToT4:
   Math.max(0,structuralT1ToT4RequiredSetPieceSlots-forgeTotalSetPieces),
 };
}
