/**
 * HIDDEN Equipment 2.0 V6: exact proposed material origins and processing
 * graph. REVIEW ONLY: this module cannot register drops/nodes, process inputs,
 * grant stacks or prove a client-supplied receipt.
 *
 * All canonical source authority remains in the future authenticated server
 * registry. The V5 EQ2_ storage ban must remain enabled.
 */
import {
 EQ2_REQUIRED_MATERIAL_SOURCE_DRAFTS,eq2RequiredMaterialSourceDraft,
} from './equipment-crafting-v2-material-source-review';
import {eq2ReviewMaterialIdentity} from
 './equipment-crafting-v2-stackable-material-boundary-review';

export const EQ2_V6_SOURCE_GRANTS_ENABLED=false as const;
export const EQ2_V6_PROCESSING_ENABLED=false as const;
type Tier=1|2|3|4;
type Skill='smithing'|'tailoring'|'woodcutting';
export interface Eq2DraftProcess {
 readonly output:string;readonly tier:Tier;readonly quantity:1;
 readonly inputs:Readonly<Record<string,number>>;
 readonly activity:'smelting'|'wood_processing'|'tanning'|'weaving';
 readonly xpSkill:Skill;readonly xp:number;readonly seconds:number;
 readonly canonicalRegistration:false;readonly mayProcess:false;
}
const process=(output:string,tier:Tier,
 inputs:Readonly<Record<string,number>>,
 activity:Eq2DraftProcess['activity'],xpSkill:Skill,xp:number,
 seconds:number):Eq2DraftProcess=>Object.freeze({
 output,tier,quantity:1 as const,inputs:Object.freeze({...inputs}),
 activity,xpSkill,xp,seconds,canonicalRegistration:false as const,
 mayProcess:false as const,
});
/** Exact 15 V3 new processed outputs; canonical SUNSTONE_INGOT excluded. */
export const EQ2_V6_DRAFT_PROCESSES:readonly Eq2DraftProcess[]=Object.freeze([
 process('EQ2_COPPER_BAR',1,{COPPER_ORE:3},'smelting','smithing',8,18),
 process('EQ2_GREENWOOD_PLANK',1,{GREENWOOD_LOG:3},'wood_processing','woodcutting',7,16),
 process('EQ2_BOAR_LEATHER',1,{BOAR_HIDE:3},'tanning','tailoring',8,20),
 process('EQ2_MOSS_CLOTH',1,{MOSS_FIBER:4},'weaving','tailoring',8,20),
 process('EQ2_IRON_BAR',2,{ASTER_IRON_ORE:3},'smelting','smithing',18,27),
 process('EQ2_IRONWOOD_PLANK',2,{IRONWOOD_LOG:3},'wood_processing','woodcutting',17,24),
 process('EQ2_WOLF_LEATHER',2,{WOLF_PELT:3},'tanning','tailoring',18,30),
 process('EQ2_THORN_CLOTH',2,{EQ2_THORN_FIBRE:4},'weaving','tailoring',18,30),
 process('EQ2_TREATED_DUNEWOOD',3,{DUNEWOOD:4},'wood_processing','woodcutting',31,36),
 process('EQ2_SUNSCAR_LEATHER',3,{EQ2_SUNSCAR_HIDE:3},'tanning','tailoring',33,42),
 process('EQ2_DUNE_CLOTH',3,{EQ2_DUNE_FIBRE:4},'weaving','tailoring',33,42),
 process('EQ2_GLASSBOUND_ALLOY_BAR',4,{SUNSTONE_INGOT:2,EQ2_GLASSBOUND_DUST:1},
  'smelting','smithing',55,56),
 process('EQ2_REINFORCED_DUNEWOOD',4,{DUNEWOOD:5,EQ2_GLASSBOUND_DUST:1},
  'wood_processing','woodcutting',52,52),
 process('EQ2_HARDENED_SUNSCAR_LEATHER',4,
  {EQ2_SUNSCAR_HIDE:4,EQ2_GLASSBOUND_DUST:1},'tanning','tailoring',54,57),
 process('EQ2_SOULWEAVE_CLOTH',4,{EQ2_SOUL_FIBRE:5,EQ2_GLASSBOUND_DUST:1},
  'weaving','tailoring',54,57),
]);
const processes=new Map(EQ2_V6_DRAFT_PROCESSES.map(x=>[x.output,x]));
if(processes.size!==15||EQ2_REQUIRED_MATERIAL_SOURCE_DRAFTS.length!==14)
 throw new Error('eq2_v6_draft_identity_drift');
for(const entry of EQ2_V6_DRAFT_PROCESSES){
 const id=eq2ReviewMaterialIdentity(entry.output);
 if(!id||id.origin!=='processing'||id.tier!==entry.tier)
  throw new Error('eq2_v6_processing_identity_mismatch');
 for(const [input,amount] of Object.entries(entry.inputs)){
  if(!Number.isSafeInteger(amount)||amount<1||
   input.startsWith('EQ2_')&&!eq2RequiredMaterialSourceDraft(input))
   throw new Error('eq2_v6_unregistered_process_input');
 }
}
export function eq2V6ProcessDraft(id:unknown):Eq2DraftProcess|undefined{
 return typeof id==='string'?processes.get(id):undefined;
}
export interface Eq2OriginWitnessReview {
 readonly itemId:unknown;readonly sourceKind:unknown;readonly sourceId:unknown;
 readonly quantity:unknown;readonly originReceiptId:unknown;
 /** Caller claims never constitute server verification. */
 readonly clientClaimsVerified?:unknown;
}
export type Eq2V6OriginDenial=
 'invalid_proof'|'unknown_material'|'missing_registered_source'|
 'wrong_source_kind'|'unregistered_source_candidate'|'candidate_source_unverified'|
 'unregistered_processing';
export interface Eq2V6OriginReview {
 readonly canGrant:false;readonly canProcess:false;readonly mayRegister:false;
 readonly sourceVerified:false;readonly reason:Eq2V6OriginDenial;
 readonly proposalKnown:boolean;
}
const deny=(reason:Eq2V6OriginDenial,proposalKnown=false):Eq2V6OriginReview=>({
 canGrant:false,canProcess:false,mayRegister:false,sourceVerified:false,
 reason,proposalKnown,
});
const id=(v:unknown):v is string=>typeof v==='string'&&
 /^[A-Za-z0-9_:-]{1,160}$/.test(v)&&
 !['__proto__','constructor','prototype'].includes(v);
/** Structural candidate diagnostics only. Even exact-looking witnesses DENY. */
export function reviewEq2V6MaterialOrigin(
 claim:Eq2OriginWitnessReview,
):Eq2V6OriginReview{
 if(!claim||!id(claim.itemId)||!id(claim.sourceId)||
  !id(claim.originReceiptId)||typeof claim.quantity!=='number'||
  !Number.isSafeInteger(claim.quantity)||claim.quantity<1||
  !['monster','gathering','processing'].includes(String(claim.sourceKind)))
  return deny('invalid_proof');
 const identity=eq2ReviewMaterialIdentity(claim.itemId);
 if(!identity)return deny('unknown_material');
 if(identity.origin==='processing'){
  if(claim.sourceKind!=='processing'||!processes.has(claim.itemId))
   return deny('wrong_source_kind',true);
  if(claim.sourceId!=='PROCESS:'+claim.itemId)
   return deny('unregistered_source_candidate',true);
  return deny('unregistered_processing',true);
 }
 const source=eq2RequiredMaterialSourceDraft(claim.itemId);
 if(!source)return deny('missing_registered_source',true);
 if(claim.sourceKind==='monster'){
  if(source.kind==='gathering')return deny('wrong_source_kind',true);
  if(!claim.sourceId.startsWith('MONSTER:')||
   !source.candidateMonsterIds.includes(claim.sourceId.slice(8)))
   return deny('unregistered_source_candidate',true);
 }else if(claim.sourceKind==='gathering'){
  if(source.kind==='monster')return deny('wrong_source_kind',true);
  if(!claim.sourceId.startsWith('NODE:'))
   return deny('unregistered_source_candidate',true);
  // No canonical resource node exists in the V3 proposal yet.
  return deny('missing_registered_source',true);
 }else return deny('wrong_source_kind',true);
 return deny(source.decision==='missing_source'?
  'missing_registered_source':'candidate_source_unverified',true);
}
/** Concrete release blockers: never mark empty candidate lists as sourced. */
export function auditEq2V6SourceCoverage(){
 const withoutRegisteredSource=EQ2_REQUIRED_MATERIAL_SOURCE_DRAFTS.map(x=>x.itemId);
 const missingSource=EQ2_REQUIRED_MATERIAL_SOURCE_DRAFTS
  .filter(x=>x.decision==='missing_source').map(x=>x.itemId);
 return Object.freeze({
  rawCandidates:14,processingCandidates:15,
  withoutRegisteredSource:Object.freeze(withoutRegisteredSource),
  missingSource:Object.freeze(missingSource),
  sourceAndProcessReady:false as const,
  releaseEnabled:false as const,
 });
}
