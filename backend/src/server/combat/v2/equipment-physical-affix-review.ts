/**
 * HIDDEN Equipment 2.0 physical subtype affix ELIGIBILITY & SCARCITY review.
 * No RNG, minting, modification of original Forge tables, stat execution or
 * item snapshots. These candidates MUST replace, not stack on top of, an
 * eventual approved existing random-affix budget slot.
 */
import {v2ServerPiece} from '../../equipment/equipment-crafting-v2-manifest';
import {v2PinnedPhysicalSubtypeReview} from '../../equipment/equipment-crafting-v2-physical-types-review';
import type {PhysicalDamageSubtypeV2} from '../types';

export const EQUIPMENT_PHYSICAL_AFFIX_REVIEW_VERSION_V2='physical-affix-budget-review-v1' as const;
export const PHYSICAL_AFFIX_ACTIVATED_V2=false as const;
export type ProposedPhysicalAffixV2='physical_type_damage_pct'|'physical_type_resistance_pct';
export interface PhysicalAffixEligibilityReviewV2{
 readonly status:'CANDIDATE_ONLY_NO_MINT_OR_COMBAT_AUTHORITY';
 readonly pieceId:string;
 readonly stat:ProposedPhysicalAffixV2;
 readonly type:PhysicalDamageSubtypeV2;
 readonly tier:1|2|3|4;
 readonly minPercent:number;
 readonly maxPercent:number;
 readonly competingExistingAffixRequired:true;
 readonly eligibleSlot:string;
 readonly noAutomaticUpgradeOfExistingItems:true;
}
const SOURCED_TIER_RANGES:Readonly<Record<1|2|3|4,Readonly<{attack:readonly [number,number];resistance:readonly [number,number]}>>>={
 1:{attack:[1,2],resistance:[.5,1.5]},
 2:{attack:[1.5,3],resistance:[.75,2]},
 3:{attack:[2,4],resistance:[1,2.5]},
 4:{attack:[2.5,5],resistance:[1.25,3]},
};
const TYPES:readonly PhysicalDamageSubtypeV2[]=['blunt','slashing','piercing'];
const DEFENSE_SLOTS=new Set(['helmet','chest','legs','boots','cape','offhand']);
/** Call only for the current pinned 169 Forge identities. Others remain blocked. */
export function reviewPhysicalAffixEligibilityV2(
 pieceId:string,stat:ProposedPhysicalAffixV2,type:PhysicalDamageSubtypeV2,
):PhysicalAffixEligibilityReviewV2|null{
 if(!TYPES.includes(type)||!['physical_type_damage_pct','physical_type_resistance_pct'].includes(stat))
  return null;
 const piece=v2ServerPiece(pieceId);
 if(!piece||piece.tier<1||piece.tier>4)return null;
 const tier=piece.tier as 1|2|3|4;
 const offensive=stat==='physical_type_damage_pct';
 if(offensive){
  // First pass allows subtype damage only on a weapon whose authored basic
  // attack actually uses that type. Do NOT sell dead rolls for spell wands.
  if(piece.slot!=='weapon')return null;
  const profile=v2PinnedPhysicalSubtypeReview(pieceId)?.profile;
  if(!profile?.weights.some(w=>w.type===type))return null;
 }else if(!DEFENSE_SLOTS.has(piece.slot))return null;
 const range=offensive?SOURCED_TIER_RANGES[tier].attack:SOURCED_TIER_RANGES[tier].resistance;
 return Object.freeze({
  status:'CANDIDATE_ONLY_NO_MINT_OR_COMBAT_AUTHORITY' as const,
  pieceId,stat,type,tier,minPercent:range[0],maxPercent:range[1],
  competingExistingAffixRequired:true as const,eligibleSlot:piece.slot,
  noAutomaticUpgradeOfExistingItems:true as const,
 });
}
