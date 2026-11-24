/** Final five Stat Gem migration proposals. NOT a silent reinterpretation
 * of existing gems: old definitions, strengths and ownership remain intact.
 * New semantics need balance approval and migration/runtime tests.
 * All reports are hypothetical catalogue QA, never player custody proofs. */
import {inspectMixedPermanentBudgetV2} from './mixed-permanent-budget-review.mjs';
import {ADVANCED_CAPS} from './advanced-permanent-budget-review.mjs';
import {capChannel} from './universal-affix-overlap-review-v4.mjs';
export const GEM_MIGRATION_CANDIDATES=Object.freeze({
 stat_might:Object.freeze({stat:'power',unit:'percent',channel:'attack_pct',mechanic:'RELATIVE_ATTACK_POWER_INSTEAD_OF_DISPLAY_POWER'}),
 stat_ward:Object.freeze({stat:'ward',unit:'percent',channel:'ward_pp',mechanic:'NONPHYSICAL_NONTRUE_REDUCTION_POINTS'}),
 stat_piercing:Object.freeze({stat:'penetration',unit:'percentage_point',channel:'penetration_pp',mechanic:'ELIGIBLE_NONTRUE_ARMOR_BYPASS_POINTS'}),
 stat_potent:Object.freeze({stat:'potency',unit:'percent',channel:'ability_damage_pct',mechanic:'AUTHORED_DIRECT_CLASS_DAMAGE_ONLY_EXCLUDE_COMPANION'}),
 stat_resolute:Object.freeze({stat:'tenacity',unit:'percent',channel:'tenacity_pp',mechanic:'ORDINARY_HOSTILE_NONBOSS_STATUS_DURATION_POINTS'}),
});
const fail=x=>{throw Error('eq2_final_gem_candidate_'+x);};
export function inspectFinalPermanentBudgetV2(rows,sockets){
 const mixed=inspectMixedPermanentBudgetV2(rows,sockets);
 const totals=new Map(),sources=[];
 for(const s of mixed.unresolvedGemSources){
  const family=/^gem:([a-z0-9_]+):g[1-5]$/.exec(s.gemId)?.[1];
  const rule=Object.hasOwn(GEM_MIGRATION_CANDIDATES,family)?GEM_MIGRATION_CANDIDATES[family]:null;
  if(!rule||s.stat!==rule.stat||s.unit!==rule.unit||
    !Number.isSafeInteger(s.fractionMicros)||s.fractionMicros<0)fail('source_contract');
  totals.set(rule.channel,(totals.get(rule.channel)??0)+s.fractionMicros);
  sources.push({...s,candidateChannel:rule.channel,mechanic:rule.mechanic,migrationApprovalRequired:true});
 }
 // Recompute from RAW contributions, never cap a previously capped total.
 // Preserve fractional gem precision until the last channel aggregation.
 const channels=[...mixed.prior.original.channels,...mixed.prior.advancedChannels,...mixed.mixedChannels].map(c=>{
  const extraMicros=totals.get(c.channel)??0;
  if(!extraMicros)return {...c,migrationGemFractionMicros:0};
  const gemFractionMicros=c.gemFractionMicros+extraMicros;
  const gemCentipercent=Math.round(gemFractionMicros/100);
  const rawCentipercent=(c.randomCentipercent??0)+c.innateCentipercent+gemCentipercent;
  const p=ADVANCED_CAPS[c.channel];
  const effectiveCentipercent=p?Math.min(p.hard,rawCentipercent<=p.knee?rawCentipercent:p.knee+Math.floor((rawCentipercent-p.knee)/2)):capChannel(c.channel,rawCentipercent);
  return {...c,migrationGemFractionMicros:extraMicros,gemFractionMicros,gemCentipercent,rawCentipercent,
   effectiveCentipercent,excessCentipercent:rawCentipercent-effectiveCentipercent,capPolicy:'PROPOSED_NOT_APPROVED'};
 });
 if([...totals.keys()].some(k=>!channels.some(c=>c.channel===k)))fail('missing_channel');
 return {scope:'FULL_PERMANENT_CATALOGUE_CANDIDATE_ONLY',channels,mixed,migrationSources:sources,
  unresolvedInnates:mixed.unresolvedInnates,unresolvedGemSources:[],requiresMigrationApproval:true,
  unresolvedRuntime:['piercing_direct_vs_periodic_scope','exclude_companion_from_authored_class_damage',
   'mixed_unit_runtime_compiler','actual_socket_custody','conditional_set_and_gem_effects'],
  randomPoolChanged:false,cpApproved:false,mayApplyEffects:false,releaseApproved:false};
}
/** QA projection from explicitly pre-affix class+skills+base+set stats.
 * Do not pass a post-affix snapshot. Rating and chance fields stay separate.
 * Advanced effects retained as fractions; they are not silently priced. */
export function projectPermanentStatCandidateV2(preAffix,rows,sockets){
 const report=inspectFinalPermanentBudgetV2(rows,sockets);
 const keys=['maxHp','attackPower','healingPower','defense','accuracy','evasion','critChance','critMultiplier','haste'];
 if(!preAffix||Object.keys(preAffix).length!==keys.length||keys.some(k=>!Number.isFinite(preAffix[k])||preAffix[k]<0)||
   preAffix.maxHp<=0||preAffix.critMultiplier<1)fail('invalid_pre_affix_stats');
 const v=k=>(report.channels.find(c=>c.channel===k)?.effectiveCentipercent??0)/10000;
 const stats={...preAffix,
  maxHp:preAffix.maxHp*(1+v('max_hp_pct')),attackPower:preAffix.attackPower*(1+v('attack_pct')),
  defense:preAffix.defense*(1+v('defense_pct')),healingPower:preAffix.healingPower*(1+v('healing_power_pct')),
  haste:preAffix.haste*(1+v('haste_pct'))+v('haste_pp'),
  critChance:Math.min(.75,preAffix.critChance+v('crit_rate_pp')),
  critMultiplier:preAffix.critMultiplier*(1+v('crit_damage_pct'))+v('crit_multiplier_add')};
 if(Object.values(stats).some(x=>!Number.isFinite(x)))fail('invalid_projection');
 const advanced={accuracyPp:v('accuracy_pp'),evasionPp:v('evasion_pp'),penetrationPp:v('penetration_pp'),
  wardPp:v('ward_pp'),tenacityPp:v('tenacity_pp'),abilityDamagePct:v('ability_damage_pct'),
  forgeHealingPowerPct:v('forge_healing_power_pct')};
 return {stats,advanced,report,sourceStage:'PRE_AFFIX_ONLY',mayApplyEffects:false,cpApproved:false,releaseApproved:false};
}
