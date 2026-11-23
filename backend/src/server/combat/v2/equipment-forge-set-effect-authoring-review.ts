/**
 * HIDDEN AUTHORING PASS, NOT A COMBAT EFFECT OR REWARD SOURCE.
 *
 * Give every one of the 15 real pinned EQ2 Forge set families a distinctive
 * proposal and source-verified 2/4-piece milestone map. This module cannot
 * calculate modifiers or grant sets. The 48 unissued Combat concepts remain
 * a separate, blocked namespace. Final coefficients and actual effect
 * mechanics require owner approval + source reconciliation.
 */
import {auditRealForgeSetIdentityV2} from './equipment-forge-set-identity-review';
import type {V2Role,V2Tier} from '../../equipment/equipment-crafting-v2-rolls';

export type ProposedForgeSetCounterplayV2=
 'guard_stability'|'precision_counter'|'steady_healing'|
 'damage_mitigation'|'marked_target_pressure'|'cleanse_support'|
 'retaliation_sustain'|'armored_target_break'|'dot_resilience'|
 'strong_shield'|'measured_reflect'|'evasive_burst'|
 'warded_spell_damage'|'healing_sustain'|'anti_burst_barrier';

type Candidate={readonly role:V2Role;readonly direction:ProposedForgeSetCounterplayV2};
const SOURCE_ONLY_CANDIDATES:Readonly<Record<string,Candidate>>={
 EQ2_SET_FIELDBORN_GUARD:{role:'tank',direction:'guard_stability'},
 EQ2_SET_FIELDBORN_TRAIL:{role:'damage',direction:'precision_counter'},
 EQ2_SET_FIELDBORN_ACOLYTE:{role:'support',direction:'steady_healing'},
 EQ2_SET_IRONWOOD_SENTINEL:{role:'tank',direction:'damage_mitigation'},
 EQ2_SET_IRONWOOD_STALKER:{role:'damage',direction:'marked_target_pressure'},
 EQ2_SET_IRONWOOD_MENDER:{role:'support',direction:'cleanse_support'},
 EQ2_SET_SUNSCAR_THORNHIDE:{role:'tank',direction:'retaliation_sustain'},
 EQ2_SET_SUNSCAR_BREAKSTEEL:{role:'damage',direction:'armored_target_break'},
 EQ2_SET_SUNSCAR_WILDROOT:{role:'support',direction:'dot_resilience'},
 EQ2_SET_GLASSBOUND_BULWARK:{role:'tank',direction:'strong_shield'},
 EQ2_SET_GLASSBOUND_RETALIATOR:{role:'tank',direction:'measured_reflect'},
 EQ2_SET_GLASSBOUND_SHADOWSTEP:{role:'damage',direction:'evasive_burst'},
 EQ2_SET_GLASSBOUND_SPELLWEAVE:{role:'damage',direction:'warded_spell_damage'},
 EQ2_SET_GLASSBOUND_LIFEWOVEN:{role:'support',direction:'healing_sustain'},
 EQ2_SET_GLASSBOUND_DAWNSHIELD:{role:'support',direction:'anti_burst_barrier'},
};
export interface ForgeSetEffectAuthoringCandidateV2{
 readonly forgeSetId:string;
 readonly tier:V2Tier;
 readonly role:V2Role;
 readonly exactMemberIds:readonly string[];
 readonly proposedDirection:ProposedForgeSetCounterplayV2;
 readonly thresholds:readonly (2|4)[];
 readonly proposedPercentCoefficients:'UNSET_PENDING_OWNER_APPROVAL';
 readonly effectImplementation:'MISSING_NOT_EXECUTABLE';
 readonly appliesToCombat:false;
 readonly provenance:'PINNED_EQ2_FORGE_MEMBERS_ONLY';
 readonly unresolvedThreePieceMilestone:boolean;
}
export interface ForgeSetEffectAuthoringReviewV2{
 readonly scope:'FORGE_SET_COUNTERPLAY_DESIGN_NOT_EXECUTABLE';
 readonly realFamilies:number;
 readonly realSourceMembers:number;
 readonly candidateMilestones:number;
 readonly authoredAndApprovedBonuses:0;
 readonly familiesRequiringThirdPieceReview:number;
 readonly candidates:readonly ForgeSetEffectAuthoringCandidateV2[];
 readonly status:'BLOCKED_EFFECT_NUMBERS_AND_ENGINE_NOT_APPROVED';
}
function fail(code:string):never{throw Error('eq2_forge_set_authoring_'+code);}
export function reviewForgeSetEffectAuthoringV2():ForgeSetEffectAuthoringReviewV2{
 const original=auditRealForgeSetIdentityV2();
 const ids=new Set(original.forgeSetEvidence.map(s=>s.forgeSetId));
 const defined=Object.keys(SOURCE_ONLY_CANDIDATES);
 if(defined.length!==15||ids.size!==15||new Set(defined).size!==15||
  defined.some(id=>!ids.has(id)))fail('missing_or_fabricated_forge_family');
 const candidates=original.forgeSetEvidence.map(set=>{
  const candidate=SOURCE_ONLY_CANDIDATES[set.forgeSetId];
  if(!candidate||candidate.role!==set.role)fail('misassigned_role');
  const thresholds=(set.members.length>=4?[2,4]:[2]) as (2|4)[];
  if(thresholds.some(t=>t>set.members.length)||set.members.length<2)
   fail('unreachable_milestone');
  return {
   forgeSetId:set.forgeSetId,tier:set.tier,role:set.role,
   exactMemberIds:set.members.map(p=>p.pieceId),
   proposedDirection:candidate.direction,thresholds,
   proposedPercentCoefficients:'UNSET_PENDING_OWNER_APPROVAL' as const,
   effectImplementation:'MISSING_NOT_EXECUTABLE' as const,
   appliesToCombat:false as const,
   provenance:'PINNED_EQ2_FORGE_MEMBERS_ONLY' as const,
   unresolvedThreePieceMilestone:set.members.length===3,
  };
 });
 const directions=new Set(candidates.map(c=>c.proposedDirection));
 if(directions.size!==candidates.length)
  fail('insufficient_counterplay_distinctiveness');
 // Two T4 choices per role; no exclusive mandatory class or one counter.
 for(const role of ['tank','damage','support'] as const){
  const choices=candidates.filter(x=>x.tier===4&&x.role===role);
  if(choices.length!==2||
    choices[0].proposedDirection===choices[1].proposedDirection)
   fail('glassbound_choices_not_distinct');
 }
 return {
  scope:'FORGE_SET_COUNTERPLAY_DESIGN_NOT_EXECUTABLE',
  realFamilies:candidates.length,
  realSourceMembers:candidates.reduce((n,c)=>n+c.exactMemberIds.length,0),
  candidateMilestones:candidates.reduce((n,c)=>n+c.thresholds.length,0),
  authoredAndApprovedBonuses:0,
  familiesRequiringThirdPieceReview:
   candidates.filter(x=>x.unresolvedThreePieceMilestone).length,
  candidates,status:'BLOCKED_EFFECT_NUMBERS_AND_ENGINE_NOT_APPROVED',
 };
}
