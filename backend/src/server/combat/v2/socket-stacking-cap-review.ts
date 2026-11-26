/** Private cap comparison only. Never applies capped stats or grants authority.
 * Values mirror the pinned V4 random cap and advanced/mixed review proposals,
 * in fractional units. No cap policy is approved by this diagnostic.
 */
import type {reviewFrozenForgeSocketsV2} from './frozen-forge-socket-review';
import {FORGE_SOCKET_MECHANICS_REVIEW_V2} from './frozen-forge-socket-review';
const lanes={
 'power:percent':{channel:'attack_pct',knee:.25,hard:.45},
 'maxHp:percent':{channel:'max_hp_pct',knee:.30,hard:.55},
 'armor:percent':{channel:'defense_pct',knee:.25,hard:.45},
 'ward:percent':{channel:'ward_pp',knee:.08,hard:.18},
 'accuracy:percentage_point':{channel:'accuracy_pp',knee:.08,hard:.18},
 'critRate:percentage_point':{channel:'crit_rate_pp',knee:.08,hard:.18},
 'critDamage:percent':{channel:'crit_multiplier_add',knee:.35,hard:.65},
 'penetration:percentage_point':{channel:'penetration_pp',knee:.12,hard:.25},
 'haste:percent':{channel:'haste_pct',knee:.12,hard:.25},
 'potency:percent':{channel:'ability_damage_pct',knee:.25,hard:.45},
 'evasion:percentage_point':{channel:'evasion_pp',knee:.08,hard:.18},
} as const;
const round=(x:number)=>Math.round(x*1e9)/1e9;
const cap=(raw:number,knee:number,hard:number)=>Math.min(hard,raw<=knee?raw:knee+(raw-knee)/2);
export function inspectSocketStackingCapReviewV2(projection:ReturnType<typeof reviewFrozenForgeSocketsV2>){
 if(projection.mechanicsReview!==FORGE_SOCKET_MECHANICS_REVIEW_V2||
   projection.canExecuteCombat!==false||projection.cpApproved!==false||projection.releaseEnabled!==false)
  throw Error('socket_stacking_review_scope');
 const affixes=new Map<string,number>(),gems=new Map<string,number>();
 const worn=new Set(projection.equippedInstanceIds),seen=new Set<string>();
 for(const a of projection.forgeEvidence.affixSources){
  if(!worn.has(a.instanceId)||!Number.isFinite(a.value)||a.value<0)throw Error('socket_stacking_review_affix');
  affixes.set(a.id,round((affixes.get(a.id)??0)+a.value));
 }
 for(const g of projection.gemSources){
  const key=g.stat+':'+g.unit;
  if(!Object.prototype.hasOwnProperty.call(lanes,key)||!worn.has(g.instanceId)||seen.has(g.instanceId)||
    !Number.isFinite(g.fraction)||g.fraction<0)throw Error('socket_stacking_review_gem');
  seen.add(g.instanceId);gems.set(key,round((gems.get(key)??0)+g.fraction));
 }
 const channels=Object.entries(lanes).map(([key,lane])=>{
  // Mixed-unit channels never absorb a different unit (e.g. haste_pp
  // is not relative haste, and crit_damage_pct is not additive Savage).
  const affix=affixes.get(lane.channel)??0,gem=gems.get(key)??0;
  const raw=round(affix+gem),baseline=round(cap(affix,lane.knee,lane.hard));
  const effective=round(cap(raw,lane.knee,lane.hard));
  return {key,channel:lane.channel,affix,gem,raw,baseline,effective,
   incrementalGem:round(effective-baseline),excess:round(raw-effective),
   knee:lane.knee,hard:lane.hard};
 });
 return {scope:'CANDIDATE_SHARED_CAP_DIAGNOSTIC_ONLY' as const,channels,
  wornSlots:worn.size,socketCount:seen.size,releaseEnabled:false as const,cpApproved:false as const};
}
