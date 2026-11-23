/**
 * HIDDEN SOURCE REVIEW: exact probabilities of the not-yet-approved
 * separately versioned Forge shadow stat-selection distribution.
 *
 * NO random draws, gameplay bonuses, new minting, saved weights, signed
 * production policies, item effects or inventory writes. Two sensitivity
 * fixtures below are comparisons, NOT recommendations or approvals.
 */
import {
 V2_SERVER_PIECES,V2_SERVER_RECIPES,V2_SERVER_MANIFEST_VERSION,
} from '../../equipment/equipment-crafting-v2-manifest';
import {
 V2_SERVER_RARITY_BANDS,V2_SERVER_AFFIX_RANGES,EQUIPMENT_V2_SERVER_RULES_VERSION,
 v2ServerOriginalRoleAffixWeightsForReview,
 type V2Affix,type V2Role,type V2Slot,
} from '../../equipment/equipment-crafting-v2-rolls';
import {
 FORGE_AFFIX_POOL_RECONCILIATION_REVIEW_VERSION_V2,
 reviewProposedForgeRoleSlotAffixesV2,
} from './equipment-forge-affix-pool-reconciliation-review';
import {
 FORGE_AFFIX_NEW_MINT_SHADOW_VERSION_V2,
 inspectForgeShadowPolicyRowsV2,
 type ForgeShadowPolicyV2,type ForgeShadowWeightedCandidateV2,
} from './equipment-forge-affix-newmint-shadow';

export type ForgeSensitivityScenarioV2=
 'EQUAL_WEIGHT_SENSITIVITY_ONLY'|'ORIGINAL_ROLE_CONTINUITY_SENSITIVITY_ONLY';
export interface ForgeExactSubsetV2{
 readonly stats:readonly V2Affix[];
 readonly probability:number;
}
export interface ForgeExactDrawProbabilityV2{
 readonly scope:'EQ2_EXACT_SHADOW_PROBABILITY_NO_MINT';
 readonly selectionCount:number;
 readonly candidateCount:number;
 readonly subsets:readonly ForgeExactSubsetV2[];
 readonly firstDraw:readonly {stat:V2Affix;probability:number}[];
 readonly inclusion:readonly {stat:V2Affix;probability:number}[];
 readonly probabilityTotal:number;
 readonly expectedSelectedCount:number;
 readonly weightsApproved:false;
 readonly signedPolicy:false;
}
export interface ForgeScenarioProbabilityV2{
 readonly scenario:ForgeSensitivityScenarioV2;
 readonly sourceTemplateRarityCases:number;
 /** Each Forge template is weighed equally; NOT a real loot-demand model. */
 readonly uniformTemplateRarityWeightedMeanAtLeastOneNewStat:number;
 readonly uniformTemplateRarityWeightedMeanNewStatCount:number;
 readonly maximumFirstDrawShareAmongTemplates:number;
 readonly originalForgeRarityDistributionUnchanged:true;
 readonly originalRollCountsUnchanged:true;
 readonly executableNewMintRules:false;
}
export interface ForgeProbabilityReviewV2{
 readonly scope:'EQ2_AFFIX_PROBABILITY_SENSITIVITY_NO_GAMEPLAY';
 readonly originalTemplates:169;
 readonly originalRecipes:338;
 readonly reviewedRoleSlotPolicies:30;
 readonly exactTemplateRarityScenarioCases:2028;
 readonly scenarios:readonly [ForgeScenarioProbabilityV2,ForgeScenarioProbabilityV2];
 readonly originalForgeRngUnchanged:true;
 readonly noItemMints:true;
 readonly approvedStatWeights:0;
 readonly releaseReady:false;
}
function fail(code:string):never{
 throw Error('eq2_affix_probability_review_'+code);
}
function exactRow(value:unknown,keys:readonly string[]):boolean{
 return value!==null&&typeof value==='object'&&
  !Array.isArray(value)&&Object.keys(value).length===keys.length&&
  keys.every(key=>Object.prototype.hasOwnProperty.call(value,key));
}
const safe=(x:unknown)=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=1&&x<=10000;
const round=(x:number)=>Math.round(x*1e12)/1e12;
/**
 * Enumerate all ordered, WITHOUT-REPLACEMENT paths, then add their
 * probabilities by sorted unordered subset. This differs from a naive
 * k * first-draw share approximation and handles rare multi-affix tiers.
 */
export function reviewExactWeightedAffixDrawV2(
 rows:readonly ForgeShadowWeightedCandidateV2[],count:number,
):ForgeExactDrawProbabilityV2{
 if(!Array.isArray(rows)||rows.length<3||rows.length>4||
  !Number.isSafeInteger(count)||count<1||count>rows.length)
  fail('invalid_count_or_candidate_pool');
 const seen=new Set<V2Affix>(),total=rows.reduce((n,row)=>{
  if(!exactRow(row,['stat','weight'])||
   typeof row.stat!=='string'||row.stat==='potency'||
   !Object.prototype.hasOwnProperty.call(V2_SERVER_AFFIX_RANGES,row.stat)||
   seen.has(row.stat)||!safe(row.weight))
   fail('invalid_candidate_weight_or_identity');
  seen.add(row.stat);
  return n+row.weight;
 },0);
 if(total<1)fail('empty_pool');
 const first=rows.map(row=>({stat:row.stat,probability:row.weight/total}));
 const subsetByKey=new Map<string,{stats:V2Affix[];probability:number}>();
 function visit(remaining:readonly ForgeShadowWeightedCandidateV2[],
  selected:readonly V2Affix[],p:number):void{
  if(selected.length===count){
   const stats=[...selected].sort();
   const key=stats.join('|');
   const prior=subsetByKey.get(key);
   subsetByKey.set(key,{stats,probability:(prior?.probability??0)+p});
   return;
  }
  const available=remaining.reduce((s,r)=>s+r.weight,0);
  if(available<=0)fail('depleted_eligible_pool');
  for(let i=0;i<remaining.length;i++){
   const row=remaining[i];
   visit(remaining.filter((_,j)=>i!==j),[...selected,row.stat],
    p*row.weight/available);
  }
 }
 visit(rows,[],1);
 const subsets=[...subsetByKey.values()].sort((a,b)=>
  a.stats.join('|').localeCompare(b.stats.join('|')));
 const totalProbability=subsets.reduce((x,s)=>x+s.probability,0);
 const inclusion=rows.map(row=>({stat:row.stat,
  probability:subsets.filter(s=>s.stats.includes(row.stat))
   .reduce((n,s)=>n+s.probability,0)}));
 const expectedCount=inclusion.reduce((n,r)=>n+r.probability,0);
 if(Math.abs(totalProbability-1)>1e-10||
  Math.abs(expectedCount-count)>1e-10||
  inclusion.some(r=>r.probability<=0||r.probability>1+1e-10)||
  first.some(r=>r.probability<=0||r.probability>1))
  fail('non_normalized_exact_distribution');
 return {
  scope:'EQ2_EXACT_SHADOW_PROBABILITY_NO_MINT',
  selectionCount:count,candidateCount:rows.length,
  subsets:subsets.map(s=>({...s,probability:round(s.probability)})),
  firstDraw:first.map(s=>({...s,probability:round(s.probability)})),
  inclusion:inclusion.map(s=>({...s,probability:round(s.probability)})),
  probabilityTotal:round(totalProbability),
  expectedSelectedCount:round(expectedCount),
  weightsApproved:false,signedPolicy:false,
 };
}
/**
 * Two explicit sensitivity fixtures, not authoritative probability profiles:
 * - equal: 100 numerical units per candidate
 * - continuity: current original role weights retained on existing permitted
 *   affixes; any newly proposed role candidate inherits the MINIMUM original
 *   role weight. This is a comparison baseline, never a gameplay recommendation.
 */
export function makeForgeAffixSensitivityFixtureV2(
 scenario:ForgeSensitivityScenarioV2,
):ForgeShadowPolicyV2{
 if(scenario!=='EQUAL_WEIGHT_SENSITIVITY_ONLY'&&
  scenario!=='ORIGINAL_ROLE_CONTINUITY_SENSITIVITY_ONLY')
  fail('unknown_sensitivity_scenario');
 const roles=['tank','damage','support'] as const;
 const slots=['helmet','chest','gloves','legs','boots','weapon',
  'offhand','cape','amulet','ring'] as const;
 const roleSlots=roles.flatMap(role=>slots.map(slot=>{
  const candidate=reviewProposedForgeRoleSlotAffixesV2(role,slot);
  const original=v2ServerOriginalRoleAffixWeightsForReview(role);
  if(!original.length||original.some(w=>!safe(w.weight)))
   fail('invalid_original_role_source_weights');
  const sourceWeights=new Map(original.map(w=>[w.stat,w.weight]));
  const floor=Math.min(...original.map(w=>w.weight));
  const candidates=candidate.proposedCombatCompatible.map(stat=>({
   stat,weight:scenario==='EQUAL_WEIGHT_SENSITIVITY_ONLY'?100:
    sourceWeights.get(stat)??floor,
  }));
  return {role,slot,candidates};
 }));
 return {
  scope:'REVIEW_FIXTURE_NOT_SIGNED_POLICY',
  shadowVersion:FORGE_AFFIX_NEW_MINT_SHADOW_VERSION_V2,
  manifestVersion:V2_SERVER_MANIFEST_VERSION,
  originalForgeRulesVersion:EQUIPMENT_V2_SERVER_RULES_VERSION,
  proposedCandidatesVersion:FORGE_AFFIX_POOL_RECONCILIATION_REVIEW_VERSION_V2,
  roleSlots,
 };
}
/** Unweighted across 169 piece identities, rarity-weighted within a piece. */
export function reviewForgeAffixSensitivityV2():ForgeProbabilityReviewV2{
 if(V2_SERVER_PIECES.length!==169||V2_SERVER_RECIPES.length!==338||
  new Set(V2_SERVER_PIECES.map(p=>p.id)).size!==169)
  fail('changed_original_forge_manifest');
 const scenarios=[
  'EQUAL_WEIGHT_SENSITIVITY_ONLY',
  'ORIGINAL_ROLE_CONTINUITY_SENSITIVITY_ONLY',
 ] as const;
 const summaries=scenarios.map(scenario=>{
  const policy=makeForgeAffixSensitivityFixtureV2(scenario);
  const rows=inspectForgeShadowPolicyRowsV2(policy);
  if(rows.length!==30)fail('incomplete_review_sensitivity_matrix');
  const matrix=new Map(rows.map(row=>[row.role+'|'+row.slot,row]));
  let cases=0,atLeastNew=0,meanNewCount=0,maxFirstShare=0;
  for(const piece of V2_SERVER_PIECES){
   const row=matrix.get(piece.role+'|'+piece.slot);
   if(!row)fail('source_piece_without_policy');
   const proposal=reviewProposedForgeRoleSlotAffixesV2(piece.role,piece.slot);
   const newer=new Set(proposal.proposedNewRoleCandidates);
   for(const rarity of V2_SERVER_RARITY_BANDS){
    const count=piece.tier<=2?rarity.affixesLowTier:rarity.affixesHighTier;
    const distribution=reviewExactWeightedAffixDrawV2(row.candidates,count);
    const chanceNew=distribution.subsets.filter(subset=>
     subset.stats.some(stat=>newer.has(stat))).reduce((n,x)=>n+x.probability,0);
    const expectedNew=distribution.inclusion.filter(x=>
     newer.has(x.stat)).reduce((n,x)=>n+x.probability,0);
    const weight=rarity.buckets/1000000/V2_SERVER_PIECES.length;
    atLeastNew+=weight*chanceNew;
    meanNewCount+=weight*expectedNew;
    maxFirstShare=Math.max(maxFirstShare,
     ...distribution.firstDraw.map(row=>row.probability));
    cases++;
   }
  }
  if(cases!==169*6||atLeastNew<0||atLeastNew>1||
   meanNewCount<0||meanNewCount>3||maxFirstShare<=0||maxFirstShare>1)
   fail('invalid_analytic_source_summary');
  return {
   scenario,sourceTemplateRarityCases:cases,
   uniformTemplateRarityWeightedMeanAtLeastOneNewStat:round(atLeastNew),
   uniformTemplateRarityWeightedMeanNewStatCount:round(meanNewCount),
   maximumFirstDrawShareAmongTemplates:round(maxFirstShare),
   originalForgeRarityDistributionUnchanged:true as const,
   originalRollCountsUnchanged:true as const,
   executableNewMintRules:false as const,
  };
 });
 return {
  scope:'EQ2_AFFIX_PROBABILITY_SENSITIVITY_NO_GAMEPLAY',
  originalTemplates:169,originalRecipes:338,
  reviewedRoleSlotPolicies:30,exactTemplateRarityScenarioCases:2028,
  scenarios:summaries as unknown as
   readonly [ForgeScenarioProbabilityV2,ForgeScenarioProbabilityV2],
  originalForgeRngUnchanged:true,noItemMints:true,
  approvedStatWeights:0,releaseReady:false,
 };
}
