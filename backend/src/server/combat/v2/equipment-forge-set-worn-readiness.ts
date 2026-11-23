/**
 * HIDDEN Equipment 2.0 source-backed set eligibility preview.
 *
 * Uses exact Forge minted copies and reconstructed owner/slot custody from
 * a prior server row preflight. NO set bonuses are executable here. Do not
 * call with client-provided snapshots; this is authoring-only information,
 * not a combat authorization or signed equipment effect.
 */
import {v2ServerPiece} from '../../equipment/equipment-crafting-v2-manifest';
import {v2ServerExactTemplateConsistent}
 from '../../equipment/equipment-crafting-v2-instances';
import {CLASS_ROLES_V2} from './build-contract';
import type {OnlineForgeCombatReadbackV2}
 from './equipment-online-readback-review';
import {reviewForgeSetEffectAuthoringV2,
 type ProposedForgeSetCounterplayV2} from './equipment-forge-set-effect-authoring-review';

export interface CandidateWornForgeSetV2{
 readonly forgeSetId:string;
 readonly sourceMemberIds:readonly string[];
 readonly wornInstanceIds:readonly string[];
 readonly wornPieceIds:readonly string[];
 readonly proposedDirection:ProposedForgeSetCounterplayV2;
 readonly reachedReviewMilestones:readonly (2|4)[];
 readonly bonusesApproved:false;
 readonly combatBonuses:readonly [];
}
export interface WornForgeSetReadinessV2{
 readonly scope:'EQ2_VERIFIED_WORN_SET_PROPOSALS_NO_EFFECTS';
 readonly accountId:string;
 readonly characterId:string;
 readonly accountRevision:number;
 readonly wornItemCount:number;
 readonly uniqueEquipmentSlots:number;
 readonly candidateSets:readonly CandidateWornForgeSetV2[];
 readonly totalReviewMilestonesReached:number;
 readonly authorizedToExecuteCombat:false;
 readonly activatedSetBonuses:0;
 readonly status:'PENDING_OWNER_APPROVAL_AND_SIGNED_SET_POLICY';
}
function fail(code:string):never{throw Error('eq2_worn_set_readiness_'+code);}
export function reviewWornRealForgeSetsV2(
 readback:OnlineForgeCombatReadbackV2,
):WornForgeSetReadinessV2{
 if(!readback||readback.scope!=='ONLINE_EQ2_STAGING_READBACK_NO_DATABASE_LOCK_OR_AUTH'||
    readback.combatAuthority!==false||
    readback.requiresAuthenticatedLockAndRevisionRecheck!==true)
  fail('not_review_readback');
 const char=readback.custody.characters.find(c=>c.id===readback.characterId);
 if(!char||char.classId!==readback.currentClassId||
    char.level!==readback.currentLevel)
  fail('wearer_identity_changed');
 const role=CLASS_ROLES_V2[char.classId];
 const worn=readback.custody.copies.filter(c=>c.location==='equipped'&&
  c.ownerCharacterId===readback.characterId);
 const slots=new Set<string>(),ids=new Set<string>();
 if(worn.length>10)fail('too_many_equipped_pieces');
 const sets=reviewForgeSetEffectAuthoringV2().candidates;
 const found=new Map<string,{copies:string[];pieces:string[]}>();
 for(const copy of worn){
  if(copy.accountId!==readback.accountId||ids.has(copy.instanceId)||
     !copy.equippedSlot||slots.has(copy.equippedSlot)||
     copy.equippedSlot!==copy.item.slot||
     !v2ServerExactTemplateConsistent(copy.item))
   fail('wrong_or_duplicate_equipment');
  ids.add(copy.instanceId);slots.add(copy.equippedSlot);
  const original=readback.items.find(i=>i.id===copy.instanceId);
  const piece=v2ServerPiece(copy.item.pieceId);
  if(!original||original.exactItem.pieceId!==copy.item.pieceId||
     !piece||piece.role!==role||piece.tier!==copy.item.tier||
     piece.setId!==copy.item.setId)
   fail('unverified_worn_source');
  if(!piece.setId)continue;
  const candidate=sets.find(c=>c.forgeSetId===piece.setId);
  if(!candidate||!candidate.exactMemberIds.includes(piece.id))
   fail('unsupported_forge_set');
  const row=found.get(piece.setId)??{copies:[],pieces:[]};
  if(row.pieces.includes(piece.id))fail('duplicated_set_piece');
  row.copies.push(copy.instanceId);row.pieces.push(piece.id);
  found.set(piece.setId,row);
 }
 const candidateSets=[...found.entries()].map(([forgeSetId,member])=>{
  const source=sets.find(c=>c.forgeSetId===forgeSetId);
  if(!source)fail('unverified_set');
  return {
   forgeSetId,sourceMemberIds:source.exactMemberIds,
   wornInstanceIds:member.copies,wornPieceIds:member.pieces,
   proposedDirection:source.proposedDirection,
   reachedReviewMilestones:source.thresholds.filter(n=>member.pieces.length>=n),
   bonusesApproved:false as const,combatBonuses:[] as [],
  };
 }).sort((a,b)=>a.forgeSetId.localeCompare(b.forgeSetId));
 return {
  scope:'EQ2_VERIFIED_WORN_SET_PROPOSALS_NO_EFFECTS',
  accountId:readback.accountId,characterId:readback.characterId,
  accountRevision:readback.revision,wornItemCount:worn.length,
  uniqueEquipmentSlots:slots.size,candidateSets,
  totalReviewMilestonesReached:candidateSets.reduce(
   (n,x)=>n+x.reachedReviewMilestones.length,0),
  authorizedToExecuteCombat:false,activatedSetBonuses:0,
  status:'PENDING_OWNER_APPROVAL_AND_SIGNED_SET_POLICY',
 };
}
