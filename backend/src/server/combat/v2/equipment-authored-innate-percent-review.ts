/**
 * HIDDEN / NONEXECUTABLE: class-specific authored INNATE percentage concept.
 * Distinct from the universal RANDOM affix slots and probability distribution.
 *
 * Original Forge has no signed innate-percent mint/receipt/effect channel.
 * These rows are selected review candidates from actual T3–T4 class weapons,
 * not item grants, set effects, approved percentages, or balance coefficients.
 */
import {V2_SERVER_PIECES,v2ServerPiece} from '../../equipment/equipment-crafting-v2-manifest';
import {CLASS_NAMES_V2} from './skill-catalog';
import type {ClassIdV2} from './build-contract';
import {PROPOSED_FORGE_NEXT_MINT_ROLL_POLICY_V2}
 from './equipment-forge-next-mint-roll-policy-review';

export const AUTHORED_EQ2_INNATE_PERCENT_REVIEW_V2=
 'eq2-hidden-authored-class-innate-percent-boundary-v1' as const;

export interface InnatePercentCandidateV2{
 readonly sourcePieceId:string;
 readonly classRestriction:ClassIdV2;
 readonly tier:3|4;
 readonly sourceSlot:'weapon';
 readonly rarityEligibility:'PENDING_OWNER_AUTHORED_ITEM_RARITY';
 readonly targetSkillId:null;
 readonly percentCoefficient:null;
 readonly proposedEffectFamily:'CLASS_SPECIFIC_ABILITY_PERCENT_SYNERGY';
 readonly scope:'CANONICAL_ITEM_INNATE_NOT_RANDOM_BONUS';
 readonly randomBonusPoolPolicy:typeof PROPOSED_FORGE_NEXT_MINT_ROLL_POLICY_V2;
 readonly randomRollSlotsConsumed:0;
 readonly affectsBonusRollWeights:false;
 readonly grantedByExistingFrozenItem:false;
 readonly executableInCombat:false;
 readonly mintPolicyEnabled:false;
}
export interface InnatePercentBoundaryReportV2{
 readonly version:typeof AUTHORED_EQ2_INNATE_PERCENT_REVIEW_V2;
 readonly classWeaponCandidates:number;
 readonly classesRepresented:number;
 readonly approvedPercentCoefficients:0;
 readonly approvedSkillBindings:0;
 readonly classRestrictedInnateAndUniversalRandomAffixesIndependent:true;
 readonly canGrantInnates:false;
 readonly canModifyExistingCopies:false;
 readonly canModifyBonusRolls:false;
 readonly candidates:readonly InnatePercentCandidateV2[];
 readonly status:'AWAITING_AUTHORED_INNATE_ITEM_SKILL_AND_COEFFICIENT_APPROVAL';
}
function fail(x:string):never{throw Error('eq2_authored_innate_percent_review_'+x);}
export function reviewAuthoredClassInnatesV2():InnatePercentBoundaryReportV2{
 const validClasses=Object.keys(CLASS_NAMES_V2);
 const pieces=V2_SERVER_PIECES.filter(piece=>
  piece.slot==='weapon'&&(piece.tier===3||piece.tier===4)&&
  piece.classRestriction);
 if(!pieces.length||new Set(pieces.map(x=>x.id)).size!==pieces.length||
   pieces.some(x=>!validClasses.includes(x.classRestriction??'')))
  fail('missing_source_class_weapon');
 const rows=pieces.map(piece=>Object.freeze({
  sourcePieceId:piece.id,classRestriction:piece.classRestriction as ClassIdV2,
  tier:piece.tier as 3|4,sourceSlot:'weapon' as const,
  rarityEligibility:'PENDING_OWNER_AUTHORED_ITEM_RARITY' as const,
  targetSkillId:null,percentCoefficient:null,
  proposedEffectFamily:'CLASS_SPECIFIC_ABILITY_PERCENT_SYNERGY' as const,
  scope:'CANONICAL_ITEM_INNATE_NOT_RANDOM_BONUS' as const,
  randomBonusPoolPolicy:PROPOSED_FORGE_NEXT_MINT_ROLL_POLICY_V2,
  randomRollSlotsConsumed:0 as const,
  affectsBonusRollWeights:false as const,
  grantedByExistingFrozenItem:false as const,
  executableInCombat:false as const,
  mintPolicyEnabled:false as const,
 }));
 // Future owner selection may choose only a subset, and values MUST be
 // balanced against existing class and companion skills, boss encounters,
 // signature traits, set bonuses, skill modifiers and build-wide caps.
 return Object.freeze({
  version:AUTHORED_EQ2_INNATE_PERCENT_REVIEW_V2,
  classWeaponCandidates:rows.length,
  classesRepresented:new Set(rows.map(x=>x.classRestriction)).size,
  approvedPercentCoefficients:0 as const,approvedSkillBindings:0 as const,
  classRestrictedInnateAndUniversalRandomAffixesIndependent:true as const,
  canGrantInnates:false as const,canModifyExistingCopies:false as const,
  canModifyBonusRolls:false as const,
  candidates:Object.freeze(rows),
  status:'AWAITING_AUTHORED_INNATE_ITEM_SKILL_AND_COEFFICIENT_APPROVAL' as const,
 });
}
export function reviewClassInnateForPinnedPieceV2(pieceId:string):
 InnatePercentCandidateV2|null{
 if(typeof pieceId!=='string'||pieceId.length>128||!v2ServerPiece(pieceId))
  return null;
 return reviewAuthoredClassInnatesV2().candidates.find(c=>c.sourcePieceId===pieceId)??null;
}
