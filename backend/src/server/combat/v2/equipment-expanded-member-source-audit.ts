/**
 * HIDDEN EQUIPMENT 2.0 REVIEW ONLY — never a catalog, a migration or a grant.
 *
 * Finds the conservative upper bound on how many 48-set launch member slots
 * can be *considered* against the already pinned, unassigned T1–T4 Forge
 * templates. Compatibility is exact tier + role + slot, one source per slot.
 * Old-set items, weapons and class-locked candidates stay protected.
 *
 * These pairings do NOT authorize a set-ID rewrite, crafted route, inventory
 * instance, loot grant, combat effect or an automatic migration.
 */
import {V2_SERVER_PIECES,V2_SERVER_RECIPES} from '../../equipment/equipment-crafting-v2-manifest';
import {PLANNED_T1_T4_MEMBERS_V2} from './equipment-expanded-launch-registry';
import type {PlannedSetMemberV2} from './equipment-expanded-launch-registry';
import type {V2ServerPiece} from '../../equipment/equipment-crafting-v2-manifest';

export const SOURCE_GAP_REVIEW_VERSION_V2='eq2-48-launch-source-gap-review-v1' as const;

export type ReviewMemberV2=Pick<PlannedSetMemberV2,'id'|'setId'|'tier'|'role'|'slot'>;
export type ReviewPieceV2=Pick<V2ServerPiece,
 'id'|'tier'|'role'|'slot'|'setId'|'classRestriction'>;
export interface ProposedSourceLinkV2 {
 readonly plannedMemberId:string;
 readonly targetSetId:string;
 readonly existingForgeItemId:string;
 readonly basis:'exact_tier_role_slot_unassigned';
 readonly approved:false;
 readonly mayIssue:false;
 readonly mayReassignExistingSet:false;
}
export interface SourceGapV2 {
 readonly plannedMemberId:string;
 readonly targetSetId:string;
 readonly tier:ReviewMemberV2['tier'];
 readonly role:ReviewMemberV2['role'];
 readonly slot:ReviewMemberV2['slot'];
 readonly reason:'NO_UNASSIGNED_EXACT_SLOT_SOURCE';
 readonly mustAuthorOrExplicitlyReconcile:true;
}
export interface SourceCoverageReviewV2 {
 readonly mode:'REVIEW_ONLY_NO_ENTITLEMENT';
 readonly proposedLinks:readonly ProposedSourceLinkV2[];
 readonly missing:readonly SourceGapV2[];
 readonly protectedOldSetPieces:number;
 readonly excludedClassLockedOrWeaponPieces:number;
 readonly availableUnassignedNonWeaponPieces:number;
 readonly unusedEligiblePieces:readonly string[];
 readonly mayMutateSetIds:false;
 readonly mayMintItems:false;
 readonly mayEnableCrafting:false;
 readonly mayEnableCombatBonuses:false;
}

const tierNumber:Readonly<Record<ReviewMemberV2['tier'],number>>={
 T1:1,T2:2,T3:3,T4:4,
};
const key=(tier:number,role:string,slot:string)=>[tier,role,slot].join('|');
const uniqueIds=(ids:readonly string[],label:string)=>{
 if(new Set(ids).size!==ids.length)
  throw Error('eq2_source_gap_duplicate_'+label);
};
/**
 * Pure, source-derived conservative pairing preview. Returning a pairing is
 * NOT proof the item can join a new set, nor proof that its recipe is approved.
 * Frozen existing set memberships always take priority.
 */
export function reviewExpandedSetSourceCoverageV2(
 members:readonly ReviewMemberV2[], pieces:readonly ReviewPieceV2[],
):SourceCoverageReviewV2 {
 uniqueIds(members.map(x=>x.id),'planned_member');
 uniqueIds(pieces.map(x=>x.id),'forge_piece');
 const membership=new Set(members.map(x=>x.id));
 if(pieces.some(p=>membership.has(p.id)))
  throw Error('eq2_source_gap_canonical_id_collision');
 if(members.some(m=>!Number.isInteger(tierNumber[m.tier])||
  !m.id||!m.setId||!m.role||!m.slot))
  throw Error('eq2_source_gap_bad_planned_member');

 const eligible=pieces.filter(piece=>!piece.setId&&
  !piece.classRestriction&&piece.slot!=='weapon'&&piece.slot!=='offhand');
 const pools=new Map<string,ReviewPieceV2[]>();
 for(const piece of [...eligible].sort((a,b)=>a.id.localeCompare(b.id))){
  const group=key(piece.tier,piece.role,piece.slot);
  pools.set(group,[...(pools.get(group)||[]),piece]);
 }
 const used=new Set<string>();
 const proposedLinks:ProposedSourceLinkV2[]=[];
 const missing:SourceGapV2[]=[];
 for(const member of [...members].sort((a,b)=>a.id.localeCompare(b.id))){
  const group=key(tierNumber[member.tier],member.role,member.slot);
  const candidate=pools.get(group)?.shift();
  if(!candidate){
   missing.push(Object.freeze({
    plannedMemberId:member.id,targetSetId:member.setId,
    tier:member.tier,role:member.role,slot:member.slot,
    reason:'NO_UNASSIGNED_EXACT_SLOT_SOURCE' as const,
    mustAuthorOrExplicitlyReconcile:true as const,
   }));
   continue;
  }
  if(used.has(candidate.id))throw Error('eq2_source_gap_reused_candidate');
  used.add(candidate.id);
  proposedLinks.push(Object.freeze({
   plannedMemberId:member.id,targetSetId:member.setId,
   existingForgeItemId:candidate.id,
   basis:'exact_tier_role_slot_unassigned' as const,
   approved:false as const,mayIssue:false as const,
   mayReassignExistingSet:false as const,
  }));
 }
 if(proposedLinks.length+missing.length!==members.length)
  throw Error('eq2_source_gap_incomplete_coverage');
 return Object.freeze({
  mode:'REVIEW_ONLY_NO_ENTITLEMENT' as const,
  proposedLinks:Object.freeze(proposedLinks),
  missing:Object.freeze(missing),
  protectedOldSetPieces:pieces.filter(p=>Boolean(p.setId)).length,
  excludedClassLockedOrWeaponPieces:pieces.filter(p=>!p.setId&&
   (Boolean(p.classRestriction)||p.slot==='weapon'||p.slot==='offhand')).length,
  availableUnassignedNonWeaponPieces:eligible.length,
  unusedEligiblePieces:Object.freeze(eligible.filter(p=>!used.has(p.id))
   .map(p=>p.id).sort()),
  mayMutateSetIds:false as const,
  mayMintItems:false as const,
  mayEnableCrafting:false as const,
  mayEnableCombatBonuses:false as const,
 });
}

export interface RealLaunchSourceGapAuditV2 {
 readonly version:typeof SOURCE_GAP_REVIEW_VERSION_V2;
 readonly expectedLaunchMemberSlots:number;
 readonly potentialUnapprovedLinks:number;
 readonly definitivelyUnmatchedSlots:number;
 readonly matchedItemsWithExistingRecipeRoutes:number;
 readonly matchedItemsMissingRecipeRoutes:readonly string[];
 readonly byTier:Readonly<Record<'T1'|'T2'|'T3'|'T4',{
  readonly required:number;readonly potential:number;readonly gap:number;
 }>>;
 readonly reviewed:SourceCoverageReviewV2;
 readonly status:'NEEDS_ITEM_AUTHORING_SOURCE_APPROVAL_AND_COMBAT_RULES';
}
/** Uses the actual integrated server manifests, not a fictional 204-item mint. */
export function auditRealExpandedSetSourceGapsV2():RealLaunchSourceGapAuditV2{
 const reviewed=reviewExpandedSetSourceCoverageV2(
  PLANNED_T1_T4_MEMBERS_V2,V2_SERVER_PIECES);
 const routeIds=new Set(V2_SERVER_RECIPES.map(x=>x.pieceId));
 const missingRoutes=reviewed.proposedLinks.filter(link=>
  !routeIds.has(link.existingForgeItemId)).map(link=>link.existingForgeItemId);
 const byTier={} as Record<'T1'|'T2'|'T3'|'T4',{
  required:number;potential:number;gap:number;
 }>;
 for(const tier of ['T1','T2','T3','T4'] as const){
  const required=PLANNED_T1_T4_MEMBERS_V2.filter(x=>x.tier===tier).length;
  const potential=reviewed.proposedLinks.filter(link=>
   PLANNED_T1_T4_MEMBERS_V2.some(x=>x.id===link.plannedMemberId&&
    x.tier===tier)).length;
  byTier[tier]={required,potential,gap:required-potential};
 }
 return Object.freeze({
  version:SOURCE_GAP_REVIEW_VERSION_V2,
  expectedLaunchMemberSlots:PLANNED_T1_T4_MEMBERS_V2.length,
  potentialUnapprovedLinks:reviewed.proposedLinks.length,
  definitivelyUnmatchedSlots:reviewed.missing.length,
  matchedItemsWithExistingRecipeRoutes:reviewed.proposedLinks.length-
   missingRoutes.length,
  matchedItemsMissingRecipeRoutes:Object.freeze(missingRoutes),
  byTier:Object.freeze(byTier),
  reviewed,
  status:'NEEDS_ITEM_AUTHORING_SOURCE_APPROVAL_AND_COMBAT_RULES' as const,
 });
}
