/**
 * HIDDEN ORIGINAL FORGE → PROPOSED UNIVERSAL AFFIX migration gate.
 *
 * The 2026 original Forge copies are real (draft) minted source identities.
 * A universal-bonus PREVIEW is not an original Forge roll, not a new ruleset
 * claim, and not a valid update, resale identity or loot entitlement.
 *
 * This function is a source-consistency REVIEW, not an authenticated
 * transaction nor approval to trade original or legacy items.
 */
import {v2ServerRecipeAndPiece}
 from './equipment-crafting-v2-manifest';
import {v2ServerCreateExactTemplate,v2ServerExactTemplateConsistent}
 from './equipment-crafting-v2-instances';
import {EQUIPMENT_V2_SERVER_RULES_VERSION,V2_SERVER_AFFIX_RANGES,
 V2_SERVER_RARITY_BANDS,V2_SERVER_RARITY_BASE_MULTIPLIER}
 from './equipment-crafting-v2-rolls';
import type {V2DraftItem} from './equipment-crafting-v2-transaction';
import {
 UNIVERSAL_FORGE_AFFIX_REVIEW_VERSION,
 UNIVERSAL_FORGE_BONUS_STAT_POOL_V2,
 type ClassIndependentBonusPreviewV2,
} from './equipment-crafting-v2-universal-affix-preview';

export interface OriginalUniversalMintGateReviewV2{
 readonly scope:'ORIGINAL_FORGE_ITEM_VS_UNISSUABLE_UNIVERSAL_DRAFT';
 readonly originalItemId:string;
 readonly originalPieceId:string;
 readonly originalRulesVersion:typeof EQUIPMENT_V2_SERVER_RULES_VERSION;
 readonly universalProposalVersion:typeof UNIVERSAL_FORGE_AFFIX_REVIEW_VERSION;
 readonly sourceItemIsOriginalForge:true;
 readonly immutableOriginalRarityAndQuality:true;
 readonly originalAffixesNotRewritten:true;
 readonly requiresNewClaimAndCustodyVersion:true;
 readonly originalCopyCanBeRebrandedUniversal:false;
 readonly canForgeMigrateExistingCopy:false;
 readonly canMintUniversalFromPreview:false;
 readonly canListUniversalPreviewOnMarket:false;
 readonly canSellOrResellLegacy:false;
 readonly canGrantRewards:false;
 readonly canAuthorizeCombat:false;
 readonly releaseApproved:false;
}
const fail=(reason:string):never=>{
 throw Error('eq2_universal_source_gate_'+reason);
};
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const originalDrawBand=(rarity:string)=>
 V2_SERVER_RARITY_BANDS.find(x=>x.rarity===rarity);
/**
 * QA-only assessment, no privilege elevation. Invalid original-mint
 * evidence never "falls back" to a preview item or a market-compatible ID.
 */
export function reviewOriginalForgeToUniversalBonusGateV2(
 original:V2DraftItem,preview:ClassIndependentBonusPreviewV2,
):OriginalUniversalMintGateReviewV2{
 if(!original||!original.id||!original.accountId||
  !original.ownerCharacterId||!original.jobId||!original.outcome||
  !original.exactItem||!preview)
  fail('missing_original_mint_or_draft');
 const {outcome,exactItem}=original;
 if(outcome.rulesVersion!==EQUIPMENT_V2_SERVER_RULES_VERSION||
  exactItem.rulesVersion!==EQUIPMENT_V2_SERVER_RULES_VERSION||
  !v2ServerExactTemplateConsistent(exactItem))
  fail('original_mint_not_source_verified');
 const linked=v2ServerRecipeAndPiece(outcome.recipeId);
 if(!linked||linked.piece.id!==outcome.pieceId||
  linked.piece.id!==exactItem.pieceId||
  !same(v2ServerCreateExactTemplate(linked.piece,outcome),exactItem))
  throw Error('eq2_universal_source_gate_frozen_original_recipe_or_roll_changed');
 if(preview.scope!=='NON_MINTABLE_CLASS_INDEPENDENT_AFFIX_PREVIEW'||
  preview.proposalVersion!==UNIVERSAL_FORGE_AFFIX_REVIEW_VERSION||
  preview.originalManifestPieceId!==linked.piece.id||
  preview.originalRecipeId!==linked.recipe.id||
  preview.tier!==linked.piece.tier||
  preview.originalSlot!==linked.piece.slot||
  preview.originalRole!==linked.piece.role||
  preview.originalClassRestriction!==linked.piece.classRestriction||
  preview.independentOfClassAndRole!==true||
  preview.originalInnateStatsUnchanged!==true||
  preview.canMint!==false||preview.canEquip!==false||
  preview.canAuthorizeCombat!==false||
  preview.canListOnMarket!==false||preview.grantsRewards!==false||
  preview.releaseApproved!==false)
  fail('unissued_proposal_attests_false_mint_authority');
 const rarity=originalDrawBand(preview.rarity);
 if(!rarity||!Number.isInteger(preview.quality)||
  preview.quality<0||preview.quality>100||
  Math.abs(preview.baseStatMultiplier-
   V2_SERVER_RARITY_BASE_MULTIPLIER[preview.rarity]*
    (.75+preview.quality*.005))>1e-9)
  throw Error('eq2_universal_source_gate_proposal_rarity_or_quality_tampered');
 if(!Array.isArray(preview.bonusStats)||
  preview.bonusStats.length!==
   (preview.tier>=3?rarity.affixesHighTier:rarity.affixesLowTier))
  fail('proposal_roll_count_invalid');
 const already=new Set<string>();
 for(const roll of preview.bonusStats){
  if(!roll||!UNIVERSAL_FORGE_BONUS_STAT_POOL_V2.includes(roll.stat)||
   already.has(roll.stat)||!Number.isFinite(roll.percent)||
   !Number.isInteger(roll.grade)||roll.grade<0||roll.grade>100)
   fail('proposal_roll_identity_unapproved');
  already.add(roll.stat);
  const [min,max]=V2_SERVER_AFFIX_RANGES[roll.stat][preview.tier-1];
  if(roll.percent<min-1e-8||roll.percent>max+1e-8)
   fail('proposal_roll_magnitude_forged');
 }
 return {
  scope:'ORIGINAL_FORGE_ITEM_VS_UNISSUABLE_UNIVERSAL_DRAFT',
  originalItemId:original.id,originalPieceId:linked.piece.id,
  originalRulesVersion:EQUIPMENT_V2_SERVER_RULES_VERSION,
  universalProposalVersion:UNIVERSAL_FORGE_AFFIX_REVIEW_VERSION,
  sourceItemIsOriginalForge:true,
  immutableOriginalRarityAndQuality:true,
  originalAffixesNotRewritten:true,
  requiresNewClaimAndCustodyVersion:true,
  originalCopyCanBeRebrandedUniversal:false,
  canForgeMigrateExistingCopy:false,
  canMintUniversalFromPreview:false,
  canListUniversalPreviewOnMarket:false,
  canSellOrResellLegacy:false,
  canGrantRewards:false,canAuthorizeCombat:false,releaseApproved:false,
 };
}
