/** Hidden candidate arithmetic for Swift and Potent. No engine authority.
 * Catalogue IDs and magnitudes remain unchanged. Unit conversion and
 * authored-output scope need explicit migration/runtime approval. */
import type {reviewFrozenForgeSocketsV2} from './frozen-forge-socket-review';
import {FORGE_SOCKET_MECHANICS_REVIEW_V2} from './frozen-forge-socket-review';
import {SOCKET_CAP_GENTLE_V2,diminishingSocketContributionV2,inspectSocketStackingCapReviewV2} from './socket-stacking-cap-review';

export const UTILITY_GEM_REVIEW_V2='swift-additive-potent-authored-output-20261126' as const;
const round=(n:number)=>Math.round(n*1e9)/1e9;
export function reviewUtilityGemSemanticsV2(projection:ReturnType<typeof reviewFrozenForgeSocketsV2>){
 if(projection.mechanicsReview!==FORGE_SOCKET_MECHANICS_REVIEW_V2||
   projection.canExecuteCombat!==false||projection.cpApproved!==false||projection.releaseEnabled!==false)
  throw Error('utility_gem_review_scope');
 // Reuse the complete same-unit source validation before reinterpreting
 // the two legacy units in a separate candidate, never in the ledger.
 const report=inspectSocketStackingCapReviewV2(projection,SOCKET_CAP_GENTLE_V2);
 const swift=report.channels.find(c=>c.key==='haste:percent')!.gem;
 const potent=report.channels.find(c=>c.key==='potency:percent')!.gem;
 const raw=(id:string)=>round(projection.forgeEvidence.affixSources.filter(a=>a.id===id).reduce((n,a)=>n+a.value,0));
 const base=projection.forgeEvidence.stages.afterFrozenBase;
 if(!Number.isFinite(base.haste)||base.haste<0)throw Error('utility_gem_review_base_haste');
 // Candidate reinterprets Swift as additive points, and combines it
 // with existing additive gear Haste before applying the approved curve.
 const hasteAffix=raw('haste_pp');
 const hasteBase=round(diminishingSocketContributionV2('haste:percent',hasteAffix,SOCKET_CAP_GENTLE_V2));
 const hasteCombined=round(diminishingSocketContributionV2('haste:percent',round(hasteAffix+swift),SOCKET_CAP_GENTLE_V2));
 const haste={base:base.haste,affix:hasteAffix,gem:swift,raw:round(hasteAffix+swift),
  effective:hasteCombined,incrementalGem:round(hasteCombined-hasteBase),
  projectedHaste:round(base.haste+hasteCombined),
  baselineHaste:round(base.haste+hasteBase),
  historicalRelativeGem:round(base.haste*swift)};
 // Potent applies once to each qualifying authored output. The existing
 // direct, heal-only, barrier and eligible hex affixes remain distinct
 // lanes. Use the same candidate knee for generic authored output; this
 // is a comparison decision, not a finalized shield/DoT cap contract.
 const channel=(scope:string,affix:number)=>{
  const prior=round(diminishingSocketContributionV2('potency:percent',affix,SOCKET_CAP_GENTLE_V2));
  const effective=round(diminishingSocketContributionV2('potency:percent',round(affix+potent),SOCKET_CAP_GENTLE_V2));
  return {scope,affix,gem:potent,raw:round(affix+potent),effective,
   baseline:prior,incrementalGem:round(effective-prior)};
 };
 const potency=[
  channel('authored_direct_damage',raw('ability_damage_pct')),
  channel('authored_nonhex_periodic_damage',0),
  channel('authored_hex_periodic_damage',raw('hex_potency_pct')),
  channel('authored_direct_or_periodic_healing',raw('forge_healing_power_pct')),
  channel('authored_barrier',raw('shield_strength_pct')),
 ];
 // Class-healing affix changes the underlying healing stat, not the
 // output modifier. Do not silently add it to or price it as Potent.
 return {scope:'UTILITY_GEM_SEMANTICS_REVIEW_ONLY' as const,version:UTILITY_GEM_REVIEW_V2,
  sourceDigest:projection.digest,haste,potency,
  excluded:['basic_attacks','companion_actions','trait_or_gem_procs','lifesteal','status_duration','buff_magnitude','crowd_control'],
  requiresMigrationApproval:true as const,canExecuteCombat:false as const,
  cpApproved:false as const,releaseEnabled:false as const};
}
