/** HIDDEN conditional peak interaction diagnostic, not engine authority.
 * Do not interpret simultaneous peak conditions as achievable uptime.
 * Verify all effect magnitudes from exact worn sources before comparing. */
import type {reviewFrozenForgeSocketsV2} from './frozen-forge-socket-review';
import {reviewEffectGemResonanceV2} from './effect-gem-resonance-review';
import {FORGE_SOCKET_MECHANICS_REVIEW_V2} from './frozen-forge-socket-review';
export const EFFECT_INTERACTION_REVIEW_V2='effect-interaction-peak-review-v2-20261126' as const;
export type EffectInteractionActionV2='authored_direct_damage'|'basic_damage'|'authored_periodic_damage'|
 'authored_direct_heal'|'authored_periodic_heal'|'authored_barrier'|'secondary_proc'|'companion_action';
const lanes=['damage','healing','barrier','haste','damageReduction','armorWard','overhealConversion',
 'renewal','killHeal','guardianCasterReduction','retaliationHeal'] as const;
type Lane=typeof lanes[number];
const round=(x:number)=>Math.round(x*1e9)/1e9;
const fail=(why:string):never=>{throw Error('effect_interaction_review_'+why);};
export function inspectEffectGemInteractionsV2(projection:ReturnType<typeof reviewFrozenForgeSocketsV2>,
 action:EffectInteractionActionV2){
 if(projection.mechanicsReview!==FORGE_SOCKET_MECHANICS_REVIEW_V2||
   projection.canExecuteCombat!==false||projection.cpApproved!==false||projection.releaseEnabled!==false||
   !projection.effectResonanceReview||projection.effectResonanceReview.canExecuteEffects!==false)
  fail('scope');
 if(!['authored_direct_damage','basic_damage','authored_periodic_damage','authored_direct_heal',
   'authored_periodic_heal','authored_barrier','secondary_proc','companion_action'].includes(action))fail('action');
 const report=reviewEffectGemResonanceV2(projection.deferredEffectSources,projection.equippedInstanceIds);
 if(JSON.stringify(report)!==JSON.stringify(projection.effectResonanceReview))fail('source_mismatch');
 const rows:{familyId:string;lane:Lane;fraction:number}[]=[];
 const direct=action==='authored_direct_damage',basic=action==='basic_damage',dot=action==='authored_periodic_damage';
 const heal=action==='authored_direct_heal',hot=action==='authored_periodic_heal',barrier=action==='authored_barrier';
 const excluded=action==='secondary_proc'||action==='companion_action';
 for(const g of report.families){
  const put=(lane:Lane,fraction=g.peak.candidate)=>{
   if(!Number.isFinite(fraction)||fraction<0||rows.some(r=>r.familyId===g.familyId&&r.lane===lane))fail('duplicate_or_invalid_lane');
   rows.push({familyId:g.familyId,lane,fraction:round(fraction)});
  };
  // No output amplification or fresh trigger for generated effects.
  // Passive actor-wide haste/reduction remains a separate context,
  // not a multiplier on proc damage/heal amounts.
  switch(g.familyId){
   case 'effect_momentum':if(direct||basic)put('damage');break;
   case 'effect_execution':case 'effect_opening_strike':case 'effect_predator':case 'effect_ruin':
    if(direct||basic||dot)put('damage');break;
   case 'effect_retaliation':
    if(direct){put('damage');if(g.resonance===3)put('retaliationHeal',.01);}break;
   case 'effect_opportunist':if(direct||basic)put('damage');break;
   case 'effect_critical_surge':case 'effect_flow':put('haste');break;
   case 'effect_bulwark':case 'effect_last_stand':put('damageReduction');break;
   case 'effect_guardians_gift':
    put('damageReduction');if(g.resonance===3)put('guardianCasterReduction',g.totalValue*.5);break;
   case 'effect_unyielding':put('armorWard');break;
   case 'effect_aegis':if(barrier)put('barrier');break;
   case 'effect_mercy':if(heal)put('overhealConversion');break;
   case 'effect_renewal':if(heal)put('renewal');break;
   case 'effect_benediction':
    if(heal)put('healing');if(barrier)put('barrier');if(g.resonance===3)put('haste',.02);break;
   case 'effect_shared_resolve':
    if(heal||hot)put('healing');if(barrier)put('barrier');break;
   case 'effect_battle_rhythm':
    if(direct)put('damage');if(heal)put('healing');if(barrier)put('barrier');
    if(g.resonance===3)put('haste',.02);break;
   case 'effect_sustenance':if(direct||basic||dot)put('killHeal');break;
   default:fail('unknown_family');
  }
 }
 const channels=lanes.map(lane=>{
  const sources=rows.filter(r=>r.lane===lane);
  const raw=round(sources.reduce((n,r)=>n+r.fraction,0));
  // Independent conditional DR families compose as remaining damage
  // multipliers. No artificial equipment cap or hard plateau; reductions
  // remain below 100%. Armor/Ward stays distinct from direct DR.
  if(lane==='damageReduction'&&sources.some(r=>r.fraction>=1))fail('reduction_probability');
  const combined=lane==='damageReduction'?round(1-sources.reduce((n,r)=>n*(1-r.fraction),1)):raw;
  const multiplicativeAlternative=['damage','healing','barrier'].includes(lane)?
   round(sources.reduce((n,r)=>n*(1+r.fraction),1)-1):null;
  return {lane,sources,raw,combined,multiplicativeAlternative};
 });
 return {scope:'CONDITIONAL_PEAK_INTERACTION_ONLY' as const,version:EFFECT_INTERACTION_REVIEW_V2,
  action,sourceDigest:projection.digest,copyCount:report.copyCount,channels,
  mayGenerateSecondaryEffects:!excluded,secondaryOutputMayReproc:false as const,
  canExecuteEffects:false as const,cpApproved:false as const,releaseEnabled:false as const};
}
