/**
 * HIDDEN, NONISSUABLE: versioned new-mint-only Equipment 2.0 affix pool proposal.
 *
 * No RNG, no actual generated item, no existing-copy migration, no client
 * command, no Combat slot unlocks, no Player Market permission. This creates
 * immutable, source-derived REVIEW evidence for a future versioned generator.
 *
 * The old draft's 70% preferred / 30% role-pool RNG is not changed. The
 * candidate can reuse its authored role weights and affix magnitudes, but
 * must be explicitly approved and separately implemented with matching
 * Combat 2.0 slot rules and strong persisted mint provenance.
 */
import {
 V2_SERVER_PIECES,V2_SERVER_MANIFEST_VERSION,v2ServerPiece,
} from '../../equipment/equipment-crafting-v2-manifest';
import {
 EQUIPMENT_V2_SERVER_RULES_VERSION,V2_SERVER_RARITY_BANDS,V2_SERVER_AFFIX_RANGES,
 v2OriginalForgeAffixSourcePoolV2,
 type V2Affix,type V2Rarity,type V2Role,type V2Slot,type V2Tier,
} from '../../equipment/equipment-crafting-v2-rolls';
import {EQUIPMENT_AFFIXES_V2,type EquipmentAffixIdV2} from './equipment-affixes';
import {EQ2_COMBAT_FROZEN_AFFIX_MAP_V2} from './equipment-frozen-forge-bridge';

export const PROPOSED_FORGE_NEXT_MINT_ROLL_POLICY_V2=
 'eq2-hidden-next-mint-slot-safe-candidate-v1' as const;

export type ProposedMintAffixSlotDispositionV2=
 'CURRENT_COMBAT_SLOT_VALID'|'PENDING_COMBAT_SLOT_APPROVAL';
export interface ProposedMintAffixPoolEntryV2{
 readonly forgeStat:Exclude<V2Affix,'potency'>;
 readonly combatAffixId:EquipmentAffixIdV2;
 readonly authoredSourceWeight:number;
 readonly authoredSlotPreferred:boolean;
 readonly currentCombatSlotValid:boolean;
 readonly disposition:ProposedMintAffixSlotDispositionV2;
 readonly originalPercentRange:readonly [number,number];
 readonly authoringOnly:true;
}
export interface ProposedMintPiecePoolV2{
 readonly pieceId:string;
 readonly role:V2Role;
 readonly tier:V2Tier;
 readonly slot:V2Slot;
 readonly forgeSetId:string|null;
 readonly rarity:V2Rarity;
 readonly exactExistingRarityCount:number;
 readonly originalAvailableSourceStats:number;
 readonly potencyRejected:boolean;
 readonly distinctSupportedCandidateStats:number;
 readonly fullRollBudgetSatisfiableAfterApproval:boolean;
 readonly currentSlotPermissionsUnchanged:true;
 readonly requiredNewCombatSlotPermissions:readonly EquipmentAffixIdV2[];
 readonly candidates:readonly ProposedMintAffixPoolEntryV2[];
 readonly permittedToMint:false;
 readonly permittedToAlterLegacyOrExistingCopies:false;
}
export interface ProposedMintAffixCatalogueV2{
 readonly proposalVersion:typeof PROPOSED_FORGE_NEXT_MINT_ROLL_POLICY_V2;
 readonly sourceForgeManifest:typeof V2_SERVER_MANIFEST_VERSION;
 readonly sourceForgeRules:typeof EQUIPMENT_V2_SERVER_RULES_VERSION;
 readonly scope:'REVIEW_ONLY_NO_GENERATOR_NO_COMBAT_CHANGES';
 readonly templateCount:169;
 readonly rarityScenarios:1014;
 readonly originalSetMembers:42;
 readonly failedToFillFullRarityBudget:0;
 readonly piecesRequiringAnySlotExtension:number;
 readonly scenariosRequiringAnySlotExtension:number;
 readonly distinctPendingRoleSlotStats:readonly string[];
 readonly originalRngUntouched:true;
 readonly originalRarityCountsUntouched:true;
 readonly originalPercentRangesUntouched:true;
 readonly valueCapsApprovalPending:true;
 readonly rollWeightRedistributionApprovalPending:true;
 readonly executableCombatSlotExpansionApprovalPending:true;
 readonly marketMintProvenanceApprovalPending:true;
 readonly canIssueItems:false;
 readonly canEditExistingItems:false;
 readonly status:'BLOCKED_REQUIRES_OWNER_APPROVAL_NEW_MINT_SOURCE_VERSION_AND_ENGINE_SLOT_POLICY';
 readonly scenarios:readonly ProposedMintPiecePoolV2[];
}

function reject(why:string):never{throw Error('eq2_next_mint_affix_review_'+why);}
const rarityCount=(tier:V2Tier,rarity:V2Rarity):number=>{
 const band=V2_SERVER_RARITY_BANDS.find(x=>x.rarity===rarity);
 if(!band)reject('unknown_source_rarity');
 return tier>=3?band!.affixesHighTier:band!.affixesLowTier;
};
/**
 * Candidate pool for ONE source-verified original Forge piece + rarity.
 * Retain all currently executable role/slot original stats, then propose
 * only the minimum extra role-authored slot permissions to reach the exact
 * original affix count. Ambiguous Potency is never silently reinterpreted.
 *
 * This is NOT a roll engine. The entries' original weight and preferred flag
 * are provenance metadata; actual reweighted RNG requires later approval.
 */
export function reviewNextMintAffixPieceV2(
 pieceId:string,rarity:V2Rarity,
):ProposedMintPiecePoolV2{
 if(typeof pieceId!=='string'||pieceId.length>128)
  reject('unrecognized_pinned_forge_piece');
 const piece=v2ServerPiece(pieceId);
 if(!piece||!V2_SERVER_PIECES.some(x=>x===piece))
  reject('unrecognized_pinned_forge_piece');
 const desired=rarityCount(piece.tier,rarity);
 if(!Number.isSafeInteger(desired)||desired<1||desired>3)
  reject('unapproved_source_roll_count');
 const original=v2OriginalForgeAffixSourcePoolV2(piece.role,piece.slot);
 if(!original.length||original.some(x=>!Number.isSafeInteger(x.weight)||x.weight<=0)||
    new Set(original.map(x=>x.stat)).size!==original.length||
    original.reduce((n,x)=>n+x.weight,0)!==100)
  reject('original_role_source_changed');
 // IMPORTANT: no generated physical subtype affix is added here. Physical
 // candidate channels can only replace an original roll by a later policy.
 const mapped=original.flatMap(source=>{
  if(source.stat==='potency')return [];
  const id=EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[source.stat];
  if(!id||EQUIPMENT_AFFIXES_V2[id].runtime!=='supported')
   reject('original_nonpotency_engine_mapping_missing');
  const range=V2_SERVER_AFFIX_RANGES[source.stat][piece.tier-1];
  if(!range||!Number.isFinite(range[0])||!Number.isFinite(range[1])||
     range[0]<0||range[1]<range[0])reject('original_stat_range_invalid');
  const current=EQUIPMENT_AFFIXES_V2[id].slots.includes(piece.slot);
  return [{
   forgeStat:source.stat as Exclude<V2Affix,'potency'>,combatAffixId:id,
   authoredSourceWeight:source.weight,authoredSlotPreferred:source.slotPreferred,
   currentCombatSlotValid:current,
   disposition:current?'CURRENT_COMBAT_SLOT_VALID' as const:
    'PENDING_COMBAT_SLOT_APPROVAL' as const,
   originalPercentRange:[...range] as [number,number],
   authoringOnly:true as const,
  }];
 });
 const current=mapped.filter(row=>row.currentCombatSlotValid);
 const needs=desired-current.length;
 // Prefer original authored role+slot associations first. Use the existing
 // ORIGINAL role weights to break ties; no new stat identities are invented.
 const proposedExtensions=mapped.filter(row=>!row.currentCombatSlotValid)
  .sort((a,b)=>
   Number(b.authoredSlotPreferred)-Number(a.authoredSlotPreferred)||
   b.authoredSourceWeight-a.authoredSourceWeight||
   a.forgeStat.localeCompare(b.forgeStat));
 const chosen=needs>0?[...current,...proposedExtensions.slice(0,needs)]:current;
 if(chosen.length<desired||new Set(chosen.map(x=>x.forgeStat)).size!==chosen.length||
    new Set(chosen.map(x=>x.combatAffixId)).size!==chosen.length)
  reject('full_original_roll_budget_not_satisfiable');
 // Source-only origin/slot/rarity/progression restrictions are carried into
 // the review. Nothing below is accepted by existing mint or Combat handlers.
 return Object.freeze({
  pieceId:piece.id,role:piece.role,tier:piece.tier,slot:piece.slot,
  forgeSetId:piece.setId??null,rarity,
  exactExistingRarityCount:desired,
  originalAvailableSourceStats:original.length,
  potencyRejected:original.some(x=>x.stat==='potency'),
  distinctSupportedCandidateStats:chosen.length,
  fullRollBudgetSatisfiableAfterApproval:true as const,
  currentSlotPermissionsUnchanged:true as const,
  requiredNewCombatSlotPermissions:Object.freeze(chosen.filter(x=>!x.currentCombatSlotValid)
   .map(x=>x.combatAffixId)),
  candidates:Object.freeze(chosen.map(x=>Object.freeze({...x,
   originalPercentRange:Object.freeze([...x.originalPercentRange]) as unknown as
    readonly [number,number],
  }))),
  permittedToMint:false as const,
  permittedToAlterLegacyOrExistingCopies:false as const,
 });
}
/** Exhaustively enumerate pinned original Forge source × all six original
 * rarities. One missing source/roll budget makes this review fail closed. */
export function reviewNextMintAffixCatalogueV2():ProposedMintAffixCatalogueV2{
 if(V2_SERVER_PIECES.length!==169||V2_SERVER_RARITY_BANDS.length!==6)
  reject('original_source_count_drift');
 const scenarios=V2_SERVER_PIECES.flatMap(piece=>
  V2_SERVER_RARITY_BANDS.map(b=>reviewNextMintAffixPieceV2(piece.id,b.rarity)));
 if(scenarios.length!==1014||
    scenarios.some(x=>!x.fullRollBudgetSatisfiableAfterApproval||
     x.candidates.length<x.exactExistingRarityCount))
  reject('not_all_original_rarity_budgets_supported');
 const extra=new Set<string>();
 for(const scenario of scenarios){
  const src=V2_SERVER_PIECES.find(x=>x.id===scenario.pieceId)!;
  for(const row of scenario.candidates){
   if(!row.currentCombatSlotValid)
    extra.add(src.role+'|'+src.slot+'|'+row.combatAffixId);
  }
 }
 return Object.freeze({
  proposalVersion:PROPOSED_FORGE_NEXT_MINT_ROLL_POLICY_V2,
  sourceForgeManifest:V2_SERVER_MANIFEST_VERSION,
  sourceForgeRules:EQUIPMENT_V2_SERVER_RULES_VERSION,
  scope:'REVIEW_ONLY_NO_GENERATOR_NO_COMBAT_CHANGES',
  templateCount:169 as const,rarityScenarios:1014 as const,
  originalSetMembers:42 as const,failedToFillFullRarityBudget:0 as const,
  piecesRequiringAnySlotExtension:new Set(scenarios.filter(x=>
   x.requiredNewCombatSlotPermissions.length).map(x=>x.pieceId)).size,
  scenariosRequiringAnySlotExtension:scenarios.filter(x=>
   x.requiredNewCombatSlotPermissions.length>0).length,
  distinctPendingRoleSlotStats:Object.freeze([...extra].sort()),
  originalRngUntouched:true as const,originalRarityCountsUntouched:true as const,
  originalPercentRangesUntouched:true as const,
  valueCapsApprovalPending:true as const,
  rollWeightRedistributionApprovalPending:true as const,
  executableCombatSlotExpansionApprovalPending:true as const,
  marketMintProvenanceApprovalPending:true as const,
  canIssueItems:false as const,canEditExistingItems:false as const,
  status:'BLOCKED_REQUIRES_OWNER_APPROVAL_NEW_MINT_SOURCE_VERSION_AND_ENGINE_SLOT_POLICY',
  scenarios:Object.freeze(scenarios),
 });
}
