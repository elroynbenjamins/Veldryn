/**
 * HIDDEN REVIEW ONLY. Authored percentage preview for REAL original Forge
 * 2.0 set families; no approved effect, no mutable combat stats, no loot/market.
 * Original Forge has 15 families / 42 pieces, NOT 48 released families.
 * These coefficients are proposed low-power review numbers, NOT approval.
 */
import {reviewForgeSetEffectAuthoringV2,
 type ProposedForgeSetCounterplayV2} from './equipment-forge-set-effect-authoring-review';
import {reviewWornForgeSetSourcesV2} from './equipment-forge-set-identity-review';
import type {V2Role,V2Tier} from '../../equipment/equipment-crafting-v2-rolls';

export type OriginalForgeSetReviewChannelV2=
 'guard_recovery'|'precision_window'|'healing_stability'|
 'damage_taken_window'|'marked_enemy_pressure'|'cleanse_timing'|
 'retaliation_sustain'|'armored_enemy_pressure'|'dot_damage_tolerance'|
 'shield_preservation'|'reflect_timing'|'evasive_opening'|
 'ward_spell_counter'|'healing_continuity'|'anti_burst_window';

const channels:Readonly<Record<ProposedForgeSetCounterplayV2,
 OriginalForgeSetReviewChannelV2>>={
 guard_stability:'guard_recovery',
 precision_counter:'precision_window',
 steady_healing:'healing_stability',
 damage_mitigation:'damage_taken_window',
 marked_target_pressure:'marked_enemy_pressure',
 cleanse_support:'cleanse_timing',
 retaliation_sustain:'retaliation_sustain',
 armored_target_break:'armored_enemy_pressure',
 dot_resilience:'dot_damage_tolerance',
 strong_shield:'shield_preservation',
 measured_reflect:'reflect_timing',
 evasive_burst:'evasive_opening',
 warded_spell_damage:'ward_spell_counter',
 healing_sustain:'healing_continuity',
 anti_burst_barrier:'anti_burst_window',
};
export interface OriginalForgeSetMilestoneDraftV2{
 readonly requiredPieces:2|3|4;
 readonly proposedPercent:number;
 readonly channel:OriginalForgeSetReviewChannelV2;
 readonly status:'PROPOSAL_NOT_COMBAT_APPLIED';
}
export interface OriginalForgeSetFamilyDraftV2{
 readonly setId:string;
 readonly tier:V2Tier;
 readonly role:V2Role;
 readonly exactMemberIds:readonly string[];
 readonly milestones:readonly OriginalForgeSetMilestoneDraftV2[];
 readonly affectsBaseStats:false;
 readonly executable:false;
 readonly source:'ORIGINAL_FROZEN_FORGE_15_SET_FAMILIES';
}
export interface OriginalForgeSetBalanceReviewV2{
 readonly scope:'SOURCE_VERIFIED_PREVIEW_ONLY';
 readonly originalFamilies:15;
 readonly originalMembers:42;
 readonly families:readonly OriginalForgeSetFamilyDraftV2[];
 readonly releaseApproved:false;
 readonly canGrantBonuses:false;
 readonly canUseInCombat:false;
 readonly requiresOwnerBalanceApproval:true;
}
export interface OriginalForgeWornSetBalancePreviewV2{
 readonly scope:'AUTHORING_REVIEW_NOT_EQUIPMENT_OR_COMBAT_PROOF';
 readonly reached:readonly {setId:string;members:number;
  readonly proposedMilestones:readonly OriginalForgeSetMilestoneDraftV2[]}[];
 readonly appliedBonusCount:0;
 readonly approved:false;
}
const fail=(s:string):never=>{throw Error('eq2_set_balance_review_'+s);};
/** Deliberately modest draft ladder, NOT approved Combat coefficients.
 * Higher tier proposal is not permission to equip it early. */
function coefficient(tier:V2Tier,pieces:2|3|4):number{
 const value=1+tier*.5+(pieces-2)*.75;
 if(!Number.isFinite(value)||value<1.5||value>5)fail('invalid_proposal');
 return Math.round(value*100)/100;
}
export function reviewOriginalForgeSetBalanceDraftV2():OriginalForgeSetBalanceReviewV2{
 const actual=reviewForgeSetEffectAuthoringV2();
 if(actual.realFamilies!==15||actual.realSourceMembers!==42||
  actual.authoredAndApprovedBonuses!==0)fail('forge_source_count_changed');
 const families=actual.candidates.map(set=>{
  const channel=channels[set.proposedDirection];
  if(!channel||set.exactMemberIds.length<2||set.exactMemberIds.length>4)
   fail('unsupported_real_forge_set');
  const thresholds=(set.exactMemberIds.length>=4?[2,3,4]:
   set.exactMemberIds.length===3?[2,3]:[2]) as (2|3|4)[];
  return {
   setId:set.forgeSetId,tier:set.tier,role:set.role,
   exactMemberIds:[...set.exactMemberIds],
   milestones:thresholds.map(requiredPieces=>({
    requiredPieces,channel,
    proposedPercent:coefficient(set.tier,requiredPieces),
    status:'PROPOSAL_NOT_COMBAT_APPLIED' as const,
   })),
   affectsBaseStats:false as const,executable:false as const,
   source:'ORIGINAL_FROZEN_FORGE_15_SET_FAMILIES' as const,
  };
 }).sort((a,b)=>a.setId.localeCompare(b.setId));
 if(families.length!==15||families.reduce((n,f)=>n+f.exactMemberIds.length,0)!==42||
  new Set(families.map(f=>f.setId)).size!==15)
  fail('source_membership_not_verified');
 return {scope:'SOURCE_VERIFIED_PREVIEW_ONLY',originalFamilies:15,
  originalMembers:42,families,releaseApproved:false,
  canGrantBonuses:false,canUseInCombat:false,
  requiresOwnerBalanceApproval:true};
}
/** Membership *preview only*; the caller still needs the independent
 * authoritative Forge custody + online revision inspector. A bare piece ID
 * is NOT proof of a minted item or a player owning anything. */
export function reviewOriginalForgeWornSetDraftV2(
 pieceIds:readonly string[],
):OriginalForgeWornSetBalancePreviewV2{
 const source=reviewWornForgeSetSourcesV2(pieceIds);
 const draft=reviewOriginalForgeSetBalanceDraftV2();
 const reached=source.activeSetCounts.map(row=>{
  const set=draft.families.find(f=>f.setId===row.forgeSetId);
  if(!set)throw Error('eq2_set_balance_review_unknown_original_set');
  return {setId:set.setId,members:row.pieces,
   proposedMilestones:set.milestones.filter(m=>m.requiredPieces<=row.pieces)};
 });
 return {
  scope:'AUTHORING_REVIEW_NOT_EQUIPMENT_OR_COMBAT_PROOF',reached,
  appliedBonusCount:0,approved:false,
 };
}
