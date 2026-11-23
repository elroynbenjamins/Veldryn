/**
 * HIDDEN Equipment 2.0 subtype affix budget AUDIT, not a minting implementation.
 *
 * Source rule: an eventual type-specific roll must occupy one original Forge
 * roll slot. This produces only a nonissuable proposal; no RNG, item mutation,
 * existing-item reroll, combat grants or market/provenance changes.
 */
import {
 V2_SERVER_RARITY_BANDS,V2_SERVER_AFFIX_RANGES,
 v2OriginalForgeRoleAffixEligible,
 type V2Affix,type V2Rarity,
} from '../../equipment/equipment-crafting-v2-rolls';
import {v2ServerPiece} from '../../equipment/equipment-crafting-v2-manifest';
import {reviewPhysicalAffixEligibilityV2,type ProposedPhysicalAffixV2} from './equipment-physical-affix-review';
import {PHYSICAL_DAMAGE_POLICY_V2} from './physical-damage-engine-authority';
import type {PhysicalDamageSubtypeV2} from '../types';

export const PHYSICAL_AFFIX_REPLACEMENT_REVIEW_ONLY=true as const;
export const PHYSICAL_AFFIX_REPLACEMENT_VERSION='eq2-physical-replacement-audit-v1' as const;
export type ExistingForgeRollV2=Readonly<{stat:V2Affix;percent:number}>;
export interface PhysicalReplacementDraftV2{
 readonly mintStatus:'FUTURE_NEW_EQ2_TEMPLATE_UNISSUED_REVIEW_ONLY';
 readonly pieceId:string;
 readonly rarity:V2Rarity;
 readonly sourceRolls:readonly ExistingForgeRollV2[];
 readonly replaceIndex:number;
 readonly proposedStat:ProposedPhysicalAffixV2;
 readonly subtype:PhysicalDamageSubtypeV2;
 readonly proposedPercent:number;
}
export interface PhysicalReplacementAuditV2{
 readonly status:'VALID_NONISSUABLE_SUBSTITUTION_ONLY';
 readonly pieceId:string;readonly tier:1|2|3|4;
 readonly rarity:V2Rarity;
 readonly slot:string;readonly role:string;
 readonly oldStat:V2Affix;
 readonly proposedStat:ProposedPhysicalAffixV2;
 readonly subtype:PhysicalDamageSubtypeV2;
 readonly proposedPercent:number;
 readonly existingRollCount:number;
 readonly proposedRollCount:number;
 readonly extraRollsAllowed:0;
 readonly originalForgeMintAllowed:false;
 readonly currentItemsMayBeModified:false;
}
const fail=(reason:string):never=>{throw Error('eq2_physical_affix_budget_'+reason);};
const acceptedStat=(value:unknown):value is V2Affix=>
 typeof value==='string'&&Object.prototype.hasOwnProperty.call(V2_SERVER_AFFIX_RANGES,value);
export function reviewPhysicalAffixReplacementV2(
 input:PhysicalReplacementDraftV2,
):PhysicalReplacementAuditV2{
 if(!input||input.mintStatus!=='FUTURE_NEW_EQ2_TEMPLATE_UNISSUED_REVIEW_ONLY')
   fail('cannot_retrofit_original_items');
 const piece=v2ServerPiece(input.pieceId);
 if(!piece)throw Error('eq2_physical_affix_budget_unregistered_piece');
 const band=V2_SERVER_RARITY_BANDS.find(r=>r.rarity===input.rarity);
 if(!band)throw Error('eq2_physical_affix_budget_unknown_original_forge_rarity');
 const expectedCount=piece.tier>=3?band.affixesHighTier:band.affixesLowTier;
 if(!Array.isArray(input.sourceRolls)||input.sourceRolls.length!==expectedCount||
    !Number.isSafeInteger(input.replaceIndex)||input.replaceIndex<0||
    input.replaceIndex>=expectedCount)
   fail('forge_original_roll_budget_mismatch');
 const used=new Set<string>();
 for(const row of input.sourceRolls){
  if(!row||!acceptedStat(row.stat)||used.has(row.stat)||
     !v2OriginalForgeRoleAffixEligible(piece.role,row.stat))
    fail('invalid_original_forge_roll_source');
  used.add(row.stat);
  const range=V2_SERVER_AFFIX_RANGES[row.stat][piece.tier-1];
  if(!Number.isFinite(row.percent)||row.percent<range[0]-1e-7||
     row.percent>range[1]+1e-7)
    fail('original_roll_outside_source_tier_range');
 }
 const eligibility=reviewPhysicalAffixEligibilityV2(
  input.pieceId,input.proposedStat,input.subtype);
 if(!eligibility||eligibility.tier!==piece.tier)
   throw Error('eq2_physical_affix_budget_proposed_subtype_not_eligible');
 if(!Number.isFinite(input.proposedPercent)||
    input.proposedPercent<eligibility.minPercent-1e-7||
    input.proposedPercent>eligibility.maxPercent+1e-7)
   fail('proposed_roll_outside_eligible_tier_range');
 // This review does NOT transform or return a forged item roll array.
 return Object.freeze({
  status:'VALID_NONISSUABLE_SUBSTITUTION_ONLY' as const,
  pieceId:piece.id,tier:eligibility.tier,rarity:band.rarity,
  slot:piece.slot,role:piece.role,
  oldStat:input.sourceRolls[input.replaceIndex].stat,
  proposedStat:eligibility.stat,subtype:eligibility.type,
  proposedPercent:input.proposedPercent,
  existingRollCount:expectedCount,proposedRollCount:expectedCount,
  extraRollsAllowed:0 as const,
  originalForgeMintAllowed:false as const,
  currentItemsMayBeModified:false as const,
 });
}
export interface PhysicalReplacementBuildReviewV2{
 readonly status:'SIMULATED_ONLY_NOT_A_COMBAT_MODIFIER';
 readonly pieceCount:number;
 readonly netOutgoingPct:Readonly<Record<PhysicalDamageSubtypeV2,number>>;
 readonly netResistancePct:Readonly<Record<PhysicalDamageSubtypeV2,number>>;
 readonly noExtraRolls:true;
}
/** Review a fully equipped source-eligible build without applying the rolls. */
export function reviewPhysicalAffixBuildV2(
 proposals:readonly PhysicalReplacementAuditV2[],
):PhysicalReplacementBuildReviewV2{
 if(!Array.isArray(proposals)||proposals.length>10)
   fail('overfull_equipment_build');
 const slots=new Set<string>();
 const damage:Record<PhysicalDamageSubtypeV2,number>={slashing:0,piercing:0,blunt:0};
 const resistance:Record<PhysicalDamageSubtypeV2,number>={slashing:0,piercing:0,blunt:0};
 for(const result of proposals){
  // Audit outputs are not issuance proofs. Re-evaluate their identity, tier,
  // ranges and protected roll counts to catch tampered summaries.
  const piece=v2ServerPiece(result?.pieceId);
  const eligible=piece?reviewPhysicalAffixEligibilityV2(
   result.pieceId,result.proposedStat,result.subtype):null;
  const band=V2_SERVER_RARITY_BANDS.find(x=>x.rarity===result?.rarity);
  const count=band&&piece?(piece.tier>=3?band.affixesHighTier:band.affixesLowTier):0;
  if(!piece||!eligible||!band||result.status!=='VALID_NONISSUABLE_SUBSTITUTION_ONLY'||
    slots.has(piece.slot)||result.slot!==piece.slot||result.role!==piece.role||
    result.tier!==piece.tier||result.existingRollCount!==count||
    result.proposedRollCount!==count||result.extraRollsAllowed!==0||
    result.originalForgeMintAllowed!==false||result.currentItemsMayBeModified!==false||
    !Number.isFinite(result.proposedPercent)||
    result.proposedPercent<eligible.minPercent-1e-7||
    result.proposedPercent>eligible.maxPercent+1e-7)
   throw Error('eq2_physical_affix_budget_tampered_or_duplicate_equipment_budget');
  slots.add(piece.slot);
  const dest=result.proposedStat==='physical_type_damage_pct'?damage:resistance;
  dest[result.subtype]+=result.proposedPercent/100;
 }
 for(const type of ['slashing','piercing','blunt'] as const)
  if(damage[type]>PHYSICAL_DAMAGE_POLICY_V2.maxOutgoingBonus+1e-9||
     resistance[type]>PHYSICAL_DAMAGE_POLICY_V2.maxResistance+1e-9)
   fail('excessive_subtype_build_stack');
 return Object.freeze({
  status:'SIMULATED_ONLY_NOT_A_COMBAT_MODIFIER' as const,
  pieceCount:proposals.length,
  netOutgoingPct:Object.freeze({...damage}),
  netResistancePct:Object.freeze({...resistance}),
  noExtraRolls:true as const,
 });
}
