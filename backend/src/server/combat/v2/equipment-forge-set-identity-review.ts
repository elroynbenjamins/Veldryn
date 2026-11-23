/**
 * HIDDEN REVIEW ONLY — canonical Equipment 2.0 Forge set identity audit.
 *
 * The actual 15 pinned Forge sets are NOT the Combat 2.0 tiered family IDs.
 * A set name or equip count is never permission to issue a Combat buff.
 * 48 planned Combat sets and 204 draft members remain unissued concepts.
 * No account item, rarity, roll, RNG or online/Edge route is touched here.
 */
import {V2_SERVER_PIECES,V2_SERVER_RECIPES,type V2ServerPiece}
 from '../../equipment/equipment-crafting-v2-manifest';
import {
 PLANNED_T1_T4_MEMBERS_V2,PLANNED_T1_T4_SETS_V2,
} from './equipment-expanded-launch-registry';
import type {V2Tier,V2Slot,V2Role} from '../../equipment/equipment-crafting-v2-rolls';

export interface ForgeSetMemberEvidenceV2 {
 readonly pieceId:string;
 readonly slot:V2Slot;
 readonly setId:string;
 readonly tier:V2Tier;
 readonly role:V2Role;
 readonly foundationRecipeId:string;
}
export interface ForgeSetIdentityEvidenceV2 {
 readonly forgeSetId:string;
 readonly tier:V2Tier;
 readonly role:V2Role;
 readonly members:readonly ForgeSetMemberEvidenceV2[];
 readonly combatSetId:null;
 readonly effectiveBonuses:readonly [];
 readonly status:'FORGE_IDENTITY_VERIFIED_EFFECTS_UNRECONCILED';
}
export interface ForgeSetSourceAuditV2{
 readonly scope:'EQ2_ACTUAL_FORGE_SET_MEMBERS_NOT_COMBAT_EFFECTS';
 readonly actualForgeTemplates:number;
 readonly actualForgeRecipes:number;
 readonly originalForgeSetFamilies:number;
 readonly originalForgeSetMembers:number;
 readonly expandedCombatSetConcepts:number;
 readonly expandedCombatMemberConcepts:number;
 readonly unresolvedCombatMappings:number;
 readonly forgeSetEvidence:readonly ForgeSetIdentityEvidenceV2[];
 readonly status:'BLOCKED_NO_APPROVED_COMBAT_SET_EFFECT_OR_AUTHORITATIVE_MEMBERSHIP';
}
function fail(reason:string):never{throw Error('eq2_forge_set_identity_'+reason);}
const validId=(s:unknown):s is string=>
 typeof s==='string'&&/^EQ2_[A-Z0-9_]+$/.test(s);
const byPiece=new Map(V2_SERVER_PIECES.map(x=>[x.id,x]));
function actual():ForgeSetIdentityEvidenceV2[]{
 const grouped=new Map<string,V2ServerPiece[]>();
 for(const piece of V2_SERVER_PIECES){
  if(!validId(piece.id)||byPiece.get(piece.id)!==piece)
   fail('duplicate_or_invalid_item_identity');
  if(!piece.setId)continue;
  if(!validId(piece.setId)||!piece.setId.startsWith('EQ2_SET_'))
   fail('unknown_forge_set_identity');
  const list=grouped.get(piece.setId)??[];
  list.push(piece);
  grouped.set(piece.setId,list);
 }
 const evidence:ForgeSetIdentityEvidenceV2[]=[];
 for(const [setId,pieces] of grouped){
  const first=pieces[0];
  if(!first||pieces.length<2||pieces.length>6||new Set(pieces.map(x=>x.slot)).size!==pieces.length)
   fail('set_slots_or_members_invalid');
  if(pieces.some(x=>x.setId!==setId||x.role!==first.role||x.tier!==first.tier))
   fail('set_mixed_role_or_tier');
  evidence.push({
   forgeSetId:setId,tier:first.tier,role:first.role,combatSetId:null,
   effectiveBonuses:[],status:'FORGE_IDENTITY_VERIFIED_EFFECTS_UNRECONCILED',
   members:pieces.map(piece=>{
    const recipes=V2_SERVER_RECIPES.filter(r=>r.pieceId===piece.id&&r.route==='foundation');
    if(recipes.length!==1||recipes[0].tier!==piece.tier)fail('member_recipe_unverifiable');
    return {pieceId:piece.id,slot:piece.slot,setId,tier:piece.tier,
     role:piece.role,foundationRecipeId:recipes[0].id};
   }).sort((a,b)=>a.pieceId.localeCompare(b.pieceId)),
  });
 }
 return evidence.sort((a,b)=>a.forgeSetId.localeCompare(b.forgeSetId));
}
/** Detect pinned source drift without making draft set IDs combat-ready. */
export function auditRealForgeSetIdentityV2():ForgeSetSourceAuditV2{
 const evidence=actual();
 const seen=new Set(V2_SERVER_PIECES.map(p=>p.id));
 if(seen.size!==V2_SERVER_PIECES.length||V2_SERVER_PIECES.length!==169||
    V2_SERVER_RECIPES.length!==338||evidence.length!==15)
  fail('forged_or_changed_forge_catalogue');
 const members=evidence.flatMap(set=>set.members);
 if(members.length!==42||new Set(members.map(x=>x.pieceId)).size!==42)
  fail('forge_member_source_drift');
 if(PLANNED_T1_T4_SETS_V2.length!==48||PLANNED_T1_T4_MEMBERS_V2.length!==204||
    new Set(PLANNED_T1_T4_MEMBERS_V2.map(x=>x.id)).size!==204)
  fail('proposed_member_source_drift');
 for(const candidate of PLANNED_T1_T4_MEMBERS_V2)
  if(seen.has(candidate.id)||candidate.equippable||candidate.combatReady||
     candidate.craftable||candidate.lootEligible)
   fail('unissuable_concept_promoted_to_equipment');
 for(const candidate of PLANNED_T1_T4_SETS_V2)
  if(candidate.combatReady||candidate.bonusConcepts.some(x=>
    x.runtime!=='unimplemented'||x.coefficients!=='unset_pending_benchmark'))
   fail('unapproved_concept_promoted_to_combat');
 return {
  scope:'EQ2_ACTUAL_FORGE_SET_MEMBERS_NOT_COMBAT_EFFECTS',
  actualForgeTemplates:V2_SERVER_PIECES.length,actualForgeRecipes:V2_SERVER_RECIPES.length,
  originalForgeSetFamilies:evidence.length,originalForgeSetMembers:members.length,
  expandedCombatSetConcepts:PLANNED_T1_T4_SETS_V2.length,
  expandedCombatMemberConcepts:PLANNED_T1_T4_MEMBERS_V2.length,
  unresolvedCombatMappings:evidence.length+PLANNED_T1_T4_SETS_V2.length,
  forgeSetEvidence:evidence,
  status:'BLOCKED_NO_APPROVED_COMBAT_SET_EFFECT_OR_AUTHORITATIVE_MEMBERSHIP',
 };
}
export interface ForgeSetWornReviewV2{
 readonly selectedPieceIds:readonly string[];
 readonly actualForgePieceCount:number;
 readonly activeSetCounts:readonly {forgeSetId:string;pieces:number;
  readonly bonusUnlocks:readonly [];readonly combatSetId:null}[];
 readonly combatEffectsApplied:false;
 readonly requiresFullSetAndEffectSource:true;
}
/** Review-only: these counts are NOT active Combat 2.0 set thresholds. */
export function reviewWornForgeSetSourcesV2(
 pieceIds:readonly string[],
):ForgeSetWornReviewV2{
 if(!Array.isArray(pieceIds)||pieceIds.length>10||new Set(pieceIds).size!==pieceIds.length)
  fail('invalid_worn_snapshot');
 const slots=new Set<string>(),counts=new Map<string,number>();
 for(const id of pieceIds){
  const piece=byPiece.get(id);
  if(!piece||!validId(id)||slots.has(piece.slot))fail('unknown_or_conflicting_worn_piece');
  slots.add(piece.slot);
  if(piece.setId)counts.set(piece.setId,(counts.get(piece.setId)??0)+1);
 }
 const registry=auditRealForgeSetIdentityV2();
 const sourceIds=new Set(registry.forgeSetEvidence.map(s=>s.forgeSetId));
 const activeSetCounts=[...counts.entries()].map(([forgeSetId,pieces])=>{
  if(!sourceIds.has(forgeSetId))fail('set_membership_forged');
  return {forgeSetId,pieces,bonusUnlocks:[] as [],combatSetId:null};
 }).sort((a,b)=>a.forgeSetId.localeCompare(b.forgeSetId));
 return {
  selectedPieceIds:[...pieceIds],actualForgePieceCount:pieceIds.length,
  activeSetCounts,combatEffectsApplied:false,requiresFullSetAndEffectSource:true,
 };
}
