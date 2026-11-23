/**
 * HIDDEN / REVIEW ONLY — a separately versioned candidate-affix shadow
 * selection over genuine original Forge piece/recipe identities.
 *
 * This is deliberately NOT a mint generator: no account/character/copy,
 * receipt, complete roll outcome, authorized stat balance, or production
 * signature can be returned. The original Forge generator is unchanged.
 *
 * The full 30-row policy MUST be supplied by a QA fixture. No default
 * probability distribution, approved policy or random callback is provided.
 * This reviewer MUST NEVER be imported by an online handler or live Edge.
 */
import {
 V2_SERVER_MANIFEST_VERSION,v2ServerRecipeAndPiece,
} from '../../equipment/equipment-crafting-v2-manifest';
import {
 EQUIPMENT_V2_SERVER_RULES_VERSION,V2_SERVER_AFFIX_RANGES,V2_SERVER_RARITY_BANDS,
 type V2Affix,type V2Rarity,type V2Role,type V2Slot,
} from '../../equipment/equipment-crafting-v2-rolls';
import {
 FORGE_AFFIX_POOL_RECONCILIATION_REVIEW_VERSION_V2,
 reviewProposedForgeRoleSlotAffixesV2,
} from './equipment-forge-affix-pool-reconciliation-review';
import {EQ2_COMBAT_FROZEN_AFFIX_MAP_V2,
} from './equipment-frozen-forge-bridge';
import {EQUIPMENT_AFFIXES_V2,type EquipmentAffixIdV2,
} from './equipment-affixes';

export const FORGE_AFFIX_NEW_MINT_SHADOW_VERSION_V2=
 'eq2-affix-selection-shadow-v1-20261123-UNRELEASED' as const;
export interface ForgeShadowWeightedCandidateV2{
 readonly stat:V2Affix;
 readonly weight:number;
}
export interface ForgeShadowRoleSlotPolicyV2{
 readonly role:V2Role;
 readonly slot:V2Slot;
 readonly candidates:readonly ForgeShadowWeightedCandidateV2[];
}
export interface ForgeShadowPolicyV2{
 readonly scope:'REVIEW_FIXTURE_NOT_SIGNED_POLICY';
 readonly shadowVersion:typeof FORGE_AFFIX_NEW_MINT_SHADOW_VERSION_V2;
 readonly manifestVersion:typeof V2_SERVER_MANIFEST_VERSION;
 readonly originalForgeRulesVersion:typeof EQUIPMENT_V2_SERVER_RULES_VERSION;
 readonly proposedCandidatesVersion:
  typeof FORGE_AFFIX_POOL_RECONCILIATION_REVIEW_VERSION_V2;
 /** Every one of 30 roles/slots is required, no defaults. */
 readonly roleSlots:readonly ForgeShadowRoleSlotPolicyV2[];
}
export interface ForgeShadowSelectionRequestV2{
 readonly pieceId:string;
 readonly recipeId:string;
 readonly rarity:V2Rarity;
}
export interface ForgeShadowSelectionV2{
 readonly scope:'EQ2_AFFIX_SELECTION_SHADOW_NOT_AN_ITEM';
 readonly shadowVersion:typeof FORGE_AFFIX_NEW_MINT_SHADOW_VERSION_V2;
 readonly sourcePieceId:string;
 readonly sourceRecipeId:string;
 readonly role:V2Role;
 readonly slot:V2Slot;
 readonly tier:1|2|3|4;
 readonly inspectedRarity:V2Rarity;
 readonly affixes:readonly {
  stat:V2Affix;
  combatAffixId:EquipmentAffixIdV2;
  percent:number;
  grade:number;
 }[];
 readonly originalForgeRulesUnchanged:true;
 readonly simulatedProbabilityWeightsUnapproved:true;
 readonly noAuthoritativeMintIdentity:true;
 readonly noReceiptOrCustody:true;
 readonly releaseReady:false;
}
const roles=['tank','damage','support'] as const;
const slots=['helmet','chest','gloves','legs','boots','weapon','offhand',
 'cape','amulet','ring'] as const;
const own=(o:object,k:string)=>Object.prototype.hasOwnProperty.call(o,k);
function fail(reason:string):never{
 throw Error('eq2_affix_shadow_'+reason);
}
function exactFields(o:unknown,fields:readonly string[]):boolean{
 return Boolean(o)&&typeof o==='object'&&!Array.isArray(o)&&
  Object.keys(o).length===fields.length&&
  fields.every(field=>own(o as object,field));
}
function checkedPolicies(policy:ForgeShadowPolicyV2):
 ReadonlyMap<string,ForgeShadowRoleSlotPolicyV2>{
 if(!exactFields(policy,['scope','shadowVersion','manifestVersion',
  'originalForgeRulesVersion','proposedCandidatesVersion','roleSlots'])||
  policy.scope!=='REVIEW_FIXTURE_NOT_SIGNED_POLICY'||
  policy.shadowVersion!==FORGE_AFFIX_NEW_MINT_SHADOW_VERSION_V2||
  policy.manifestVersion!==V2_SERVER_MANIFEST_VERSION||
  policy.originalForgeRulesVersion!==EQUIPMENT_V2_SERVER_RULES_VERSION||
  policy.proposedCandidatesVersion!==
   FORGE_AFFIX_POOL_RECONCILIATION_REVIEW_VERSION_V2||
  !Array.isArray(policy.roleSlots)||policy.roleSlots.length!==30)
  fail('missing_full_versioned_review_fixture');
 const byKey=new Map<string,ForgeShadowRoleSlotPolicyV2>();
 for(const row of policy.roleSlots){
  if(!exactFields(row,['role','slot','candidates'])||
     !roles.includes(row.role)||!slots.includes(row.slot)||
     !Array.isArray(row.candidates))
   fail('unapproved_role_slot_row');
  const key=row.role+'|'+row.slot;
  if(byKey.has(key))fail('duplicate_role_slot_row');
  byKey.set(key,row);
  const authored=reviewProposedForgeRoleSlotAffixesV2(
   row.role,row.slot).proposedCombatCompatible;
  // Candidate set and order must be exactly the unissued source proposal,
  // not an arbitrary stat insertion or silent exclusion.
  if(row.candidates.length!==authored.length)fail('candidate_count_changed');
  let weightTotal=0;
  for(let i=0;i<authored.length;i++){
   const entry=row.candidates[i];
   if(!exactFields(entry,['stat','weight'])||
      entry.stat!==authored[i]||entry.stat==='potency'||
      !Number.isSafeInteger(entry.weight)||entry.weight<1||
      entry.weight>10000)
    fail('unauthorized_stat_or_unapproved_weight_shape');
   weightTotal+=entry.weight;
  }
  if(weightTotal>100000)fail('oversized_weight_total');
 }
 if(byKey.size!==roles.length*slots.length)fail('incomplete_review_fixture');
 for(const role of roles)for(const slot of slots)
  if(!byKey.has(role+'|'+slot))fail('missing_role_slot_policy');
 return byKey;
}
function draw(
 secureReviewDraw:(exclusiveMax:number)=>number,
 exclusiveMax:number,
):number{
 const value=secureReviewDraw(exclusiveMax);
 if(!Number.isSafeInteger(value)||value<0||value>=exclusiveMax)
  fail('invalid_qa_rng');
 return value;
}
/**
 * Picks only new-mint candidate stat IDs and previews their existing original
 * Forge magnitude ranges, with explicit test-supplied weights and RNG.
 * The output cannot be passed as an actual V2DraftRollOutcome or craft claim.
 */
export function previewForgeAffixNewMintSelectionV2(
 policy:ForgeShadowPolicyV2,
 request:ForgeShadowSelectionRequestV2,
 secureReviewDraw:(exclusiveMax:number)=>number,
):ForgeShadowSelectionV2{
 if(typeof secureReviewDraw!=='function'||!exactFields(request,
  ['pieceId','recipeId','rarity'])||
   typeof request.pieceId!=='string'||!request.pieceId||
   typeof request.recipeId!=='string'||!request.recipeId)
  fail('invalid_review_request');
 const policies=checkedPolicies(policy);
 const matched=v2ServerRecipeAndPiece(request.recipeId);
 if(!matched||matched.piece.id!==request.pieceId)
  fail('unknown_or_forged_source_recipe');
 const {piece}=matched;
 const band=V2_SERVER_RARITY_BANDS.find(b=>b.rarity===request.rarity);
 if(!band)fail('unknown_source_rarity');
 if(piece.tier<1||piece.tier>4)fail('unrecognized_original_forge_tier');
 const configured=policies.get(piece.role+'|'+piece.slot);
 if(!configured)fail('source_role_slot_not_configured');
 const count=piece.tier<=2?band.affixesLowTier:band.affixesHighTier;
 if(!Number.isInteger(count)||count<1||count>configured.candidates.length)
  fail('insufficient_qa_roll_candidates');
 const available=[...configured.candidates];
 const chosen:ForgeShadowSelectionV2['affixes'][number][]=[];
 for(let i=0;i<count;i++){
  const total=available.reduce((sum,row)=>sum+row.weight,0);
  if(!Number.isSafeInteger(total)||total<1)fail('empty_qa_weight_pool');
  let sample=draw(secureReviewDraw,total);
  let index=-1;
  for(let j=0;j<available.length;j++){
   sample-=available[j].weight;
   if(sample<0){index=j;break;}
  }
  if(index<0)fail('unreachable_qa_stat');
  const [selected]=available.splice(index,1);
  const mapped=EQ2_COMBAT_FROZEN_AFFIX_MAP_V2[selected.stat];
  if(!mapped||!EQUIPMENT_AFFIXES_V2[mapped].slots.includes(piece.slot)||
     EQUIPMENT_AFFIXES_V2[mapped].runtime!=='supported')
   fail('incompatible_qa_combat_stat');
  const range=V2_SERVER_AFFIX_RANGES[selected.stat]?.[piece.tier-1];
  if(!range||!Number.isFinite(range[0])||!Number.isFinite(range[1])||
     range[0]>=range[1])fail('unsupported_original_source_range');
  const sampleStrength=draw(secureReviewDraw,10001)/10000;
  const scaled=band.low+(band.high-band.low)*sampleStrength;
  const percent=Math.round((range[0]+(range[1]-range[0])*scaled)*100)/100;
  const grade=Math.max(0,Math.min(100,
   Math.round((percent-range[0])/(range[1]-range[0])*100)));
  chosen.push({stat:selected.stat,combatAffixId:mapped,percent,grade});
 }
 return {
  scope:'EQ2_AFFIX_SELECTION_SHADOW_NOT_AN_ITEM',
  shadowVersion:FORGE_AFFIX_NEW_MINT_SHADOW_VERSION_V2,
  sourcePieceId:piece.id,sourceRecipeId:matched.recipe.id,
  role:piece.role,slot:piece.slot,tier:piece.tier,
  inspectedRarity:band.rarity,affixes:chosen,
  originalForgeRulesUnchanged:true,
  simulatedProbabilityWeightsUnapproved:true,
  noAuthoritativeMintIdentity:true,noReceiptOrCustody:true,releaseReady:false,
 };
}
