/**
 * HIDDEN REVIEW ONLY — 2.0 universal RANDOM equipment bonus affix pool.
 *
 * Random bonus affix eligibility MUST NOT depend on a character's class,
 * equipment role (Tank/Damage/Support), specialization, or item set family.
 * A lucky build may roll defensive, offensive or utility stats regardless of
 * its class; valid equipment SLOT rules and real stat semantics still apply.
 *
 * This is NOT the original Forge RNG, a roll engine, an executable new-mint
 * policy, a class-stat or CP calculator, nor a retrofit for existing copies.
 * Separately-authored INNATE % bonuses may remain item/class-specific, but
 * those are not random affixes and are not implemented by this module.
 */
import {
 V2_SERVER_PIECES,V2_SERVER_MANIFEST_VERSION,v2ServerPiece,
} from '../../equipment/equipment-crafting-v2-manifest';
import {
 EQUIPMENT_V2_SERVER_RULES_VERSION,V2_SERVER_RARITY_BANDS,V2_SERVER_AFFIX_RANGES,
 type V2Affix,type V2Rarity,type V2Role,type V2Slot,type V2Tier,
} from '../../equipment/equipment-crafting-v2-rolls';
import {EQUIPMENT_AFFIXES_V2,type EquipmentAffixIdV2} from './equipment-affixes';
import {EQ2_COMBAT_FROZEN_AFFIX_MAP_V2} from './equipment-frozen-forge-bridge';

export const PROPOSED_FORGE_NEXT_MINT_ROLL_POLICY_V2=
 'eq2-hidden-class-neutral-random-bonus-affixes-candidate-v2' as const;

/** These eleven ORIGINAL Forge channels already have a mechanically distinct
 * Combat 2.0 source mapping and an ORIGINAL per-tier percentage range.
 * Excludes ambiguous generic Potency. Other proposed Combat affixes without
 * pinned Forge tier ranges remain OUT OF POOL pending source authoring.
 * This is independent of the old role-specific Forge RNG table. */
const forgeStatKeys=Object.keys(V2_SERVER_AFFIX_RANGES) as V2Affix[];
const mappedUniversalStats=forgeStatKeys.filter(x=>x!=='potency');
const universalSourceRows=Object.freeze(mappedUniversalStats.map(stat=>{
 const combatAffixId=EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[stat];
 if(!combatAffixId||EQUIPMENT_AFFIXES_V2[combatAffixId]?.runtime!=='supported')
  throw Error('eq2_universal_affix_missing_executable_source:'+stat);
 return Object.freeze({forgeStat:stat as Exclude<V2Affix,'potency'>,combatAffixId});
}));
if(forgeStatKeys.length!==12||mappedUniversalStats.length!==11||
   new Set(universalSourceRows.map(x=>x.combatAffixId)).size!==11)
 throw Error('eq2_universal_affix_original_source_drift');

export interface ProposedMintAffixPoolEntryV2{
 readonly forgeStat:Exclude<V2Affix,'potency'>;
 readonly combatAffixId:EquipmentAffixIdV2;
 readonly originalPercentRange:readonly [number,number];
 readonly availableToEveryClass:true;
 readonly availableToEveryEquipmentRole:true;
 readonly currentCombatSlotValid:true;
 readonly randomBonusOnly:true;
 readonly authoringOnly:true;
}
export interface ProposedMintPiecePoolV2{
 readonly pieceId:string;
 /** The item may remain class-restricted, but the BONUS POOL is not. */
 readonly role:V2Role;
 readonly tier:V2Tier;
 readonly slot:V2Slot;
 readonly forgeSetId:string|null;
 readonly classRestriction:string|null;
 readonly hands:'one'|'two'|'dual'|null;
 readonly rarity:V2Rarity;
 readonly exactExistingRarityCount:number;
 readonly universalSourcedStatsBeforeSlotFilter:11;
 readonly distinctSupportedCandidateStats:number;
 readonly fullRollBudgetSatisfiableUnderCurrentSlotRules:true;
 readonly slotRulesChanged:false;
 readonly classOrRoleBiasedPool:false;
 readonly innatePercentBonuses:'SEPARATE_AUTHORED_ITEM_OR_CLASS_EFFECTS_NOT_RANDOM';
 readonly candidates:readonly ProposedMintAffixPoolEntryV2[];
 readonly permittedToMint:false;
 readonly permittedToAlterLegacyOrExistingCopies:false;
}
export interface ProposedMintAffixCatalogueV2{
 readonly proposalVersion:typeof PROPOSED_FORGE_NEXT_MINT_ROLL_POLICY_V2;
 readonly sourceForgeManifest:typeof V2_SERVER_MANIFEST_VERSION;
 readonly sourceForgeRules:typeof EQUIPMENT_V2_SERVER_RULES_VERSION;
 readonly scope:'REVIEW_ONLY_UNIVERSAL_RANDOM_POOL_NO_GENERATOR_NO_COMBAT_CHANGES';
 readonly templateCount:169;
 readonly rarityScenarios:1014;
 readonly originalSetMembers:42;
 readonly universalSourceAffixes:11;
 readonly failedToFillFullRarityBudget:0;
 readonly piecesRequiringAnySlotExtension:0;
 readonly scenariosRequiringAnySlotExtension:0;
 readonly distinctPendingRoleSlotStats:readonly [];
 readonly sharedAcrossAllClasses:true;
 readonly sharedAcrossAllRoles:true;
 readonly randomAffixesNotInnate:true;
 readonly existingItemClassRequirementsUnchanged:true;
 readonly originalRngUntouched:true;
 readonly originalRarityCountsUntouched:true;
 readonly originalPercentRangesUntouched:true;
 readonly classNeutralRollWeightsApprovalPending:true;
 readonly valueCapsApprovalPending:true;
 readonly allUnmappedStatsRequireSeparateSourceDesign:true;
 readonly marketMintProvenanceApprovalPending:true;
 readonly canIssueItems:false;
 readonly canEditExistingItems:false;
 readonly status:'BLOCKED_APPROVE_SHARED_RNG_WEIGHTS_AND_NEW_MINT_SOURCE_VERSION';
 readonly scenarios:readonly ProposedMintPiecePoolV2[];
}
function reject(code:string):never{throw Error('eq2_next_mint_affix_review_'+code);}
const rarityCount=(tier:V2Tier,rarity:V2Rarity):number=>{
 const band=V2_SERVER_RARITY_BANDS.find(x=>x.rarity===rarity);
 if(!band)reject('unknown_source_rarity');
 return tier>=3?band!.affixesHighTier:band!.affixesLowTier;
};
/** One pure universal bonus pool. Role and class are intentionally NOT read
 * when determining eligible affixes. Only the source-authored equipment slot
 * and per-tier magnitude can affect the candidate stats. */
export function reviewNextMintAffixPieceV2(
 pieceId:string,rarity:V2Rarity,
):ProposedMintPiecePoolV2{
 if(typeof pieceId!=='string'||pieceId.length>128)
  reject('unrecognized_pinned_forge_piece');
 const piece=v2ServerPiece(pieceId);
 if(!piece||!V2_SERVER_PIECES.includes(piece))
  reject('unrecognized_pinned_forge_piece');
 const desired=rarityCount(piece.tier,rarity);
 if(!Number.isSafeInteger(desired)||desired<1||desired>3)
  reject('unapproved_source_roll_count');
 const candidates=universalSourceRows.filter(row=>
  EQUIPMENT_AFFIXES_V2[row.combatAffixId].slots.includes(piece.slot))
  .map(row=>{
   const range=V2_SERVER_AFFIX_RANGES[row.forgeStat][piece.tier-1];
   if(!range||!Number.isFinite(range[0])||!Number.isFinite(range[1])||
      range[0]<0||range[1]<range[0])reject('original_stat_range_invalid');
   return Object.freeze({
    forgeStat:row.forgeStat,combatAffixId:row.combatAffixId,
    originalPercentRange:Object.freeze([...range]) as unknown as readonly [number,number],
    availableToEveryClass:true as const,
    availableToEveryEquipmentRole:true as const,
    currentCombatSlotValid:true as const,
    randomBonusOnly:true as const,authoringOnly:true as const,
   });
  });
 if(candidates.length<desired||
    new Set(candidates.map(x=>x.forgeStat)).size!==candidates.length||
    new Set(candidates.map(x=>x.combatAffixId)).size!==candidates.length)
  reject('universal_pool_cannot_fill_original_rarity_budget');
 // Piece identity/hand restriction affects who can EQUIP a weapon, not
 // what a valid random BONUS can roll on that weapon or same-slot gear.
 return Object.freeze({
  pieceId:piece.id,role:piece.role,tier:piece.tier,slot:piece.slot,
  forgeSetId:piece.setId??null,classRestriction:piece.classRestriction??null,
  hands:piece.hands??null,rarity,exactExistingRarityCount:desired,
  universalSourcedStatsBeforeSlotFilter:11 as const,
  distinctSupportedCandidateStats:candidates.length,
  fullRollBudgetSatisfiableUnderCurrentSlotRules:true as const,
  slotRulesChanged:false as const,classOrRoleBiasedPool:false as const,
  innatePercentBonuses:'SEPARATE_AUTHORED_ITEM_OR_CLASS_EFFECTS_NOT_RANDOM' as const,
  candidates:Object.freeze(candidates),
  permittedToMint:false as const,
  permittedToAlterLegacyOrExistingCopies:false as const,
 });
}
/** 169 actual pinned templates × six original rarities. Exhaustively proves
 * no class/role filtering, no extra affix rolls, no invalid slot additions,
 * and no reliance on generic Potency or future unapproved roll ranges. */
export function reviewNextMintAffixCatalogueV2():ProposedMintAffixCatalogueV2{
 if(V2_SERVER_PIECES.length!==169||V2_SERVER_RARITY_BANDS.length!==6||
    V2_SERVER_PIECES.filter(x=>x.setId).length!==42)
  reject('source_catalogue_drift');
 const scenarios=V2_SERVER_PIECES.flatMap(piece=>
  V2_SERVER_RARITY_BANDS.map(b=>reviewNextMintAffixPieceV2(piece.id,b.rarity)));
 if(scenarios.length!==1014||scenarios.some(x=>
    x.candidates.length<x.exactExistingRarityCount))
  reject('universal_pool_does_not_cover_all_items_and_rarities');
 return Object.freeze({
  proposalVersion:PROPOSED_FORGE_NEXT_MINT_ROLL_POLICY_V2,
  sourceForgeManifest:V2_SERVER_MANIFEST_VERSION,
  sourceForgeRules:EQUIPMENT_V2_SERVER_RULES_VERSION,
  scope:'REVIEW_ONLY_UNIVERSAL_RANDOM_POOL_NO_GENERATOR_NO_COMBAT_CHANGES',
  templateCount:169 as const,rarityScenarios:1014 as const,
  originalSetMembers:42 as const,universalSourceAffixes:11 as const,
  failedToFillFullRarityBudget:0 as const,
  piecesRequiringAnySlotExtension:0 as const,
  scenariosRequiringAnySlotExtension:0 as const,
  distinctPendingRoleSlotStats:Object.freeze([]) as readonly [],
  sharedAcrossAllClasses:true as const,
  sharedAcrossAllRoles:true as const,
  randomAffixesNotInnate:true as const,
  existingItemClassRequirementsUnchanged:true as const,
  originalRngUntouched:true as const,originalRarityCountsUntouched:true as const,
  originalPercentRangesUntouched:true as const,
  classNeutralRollWeightsApprovalPending:true as const,
  valueCapsApprovalPending:true as const,
  allUnmappedStatsRequireSeparateSourceDesign:true as const,
  marketMintProvenanceApprovalPending:true as const,
  canIssueItems:false as const,canEditExistingItems:false as const,
  status:'BLOCKED_APPROVE_SHARED_RNG_WEIGHTS_AND_NEW_MINT_SOURCE_VERSION',
  scenarios:Object.freeze(scenarios),
 });
}
