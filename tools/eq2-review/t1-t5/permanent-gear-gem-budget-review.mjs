/** Node 24 review tool. Candidate sockets are hypothetical, NOT ownership
 * proofs; the separate server gem-source adapter checks actual custody.
 * Reuse V4 cap as a candidate, never change the stored gem/affix values. */
import {findStatGem,findEffectGem,gemItemId} from '../../../backend/src/server/equipment/gems/gem-catalog-v1.ts';
import {inspectInnateAndRandomLoadoutV2} from './innate-set-budget-review-v7.mjs';
import {capChannel} from './universal-affix-overlap-review-v4.mjs';
const mapping=Object.freeze({
 stat_vitality:['maxHp','percent','max_hp_pct','relative_percent'],
 stat_iron:['armor','percent','defense_pct','relative_percent'],
 stat_keen:['critRate','percentage_point','crit_rate_pp','percentage_points'],
 stat_precision:['accuracy','percentage_point','accuracy_pp','percentage_points'],
});
const fail=x=>{throw Error('eq2_gear_gem_budget_'+x);};
// Source audit: effectiveStats() applies canonical Accuracy as points, but
// critMultiplier = 1.5 + setStats.critDamage; Savage must NOT be interpreted
// as the V4 relative critical multiplier. Keep exact magnitude unpriced.
const unresolvedReasons=Object.freeze({
 stat_savage:'ADDITIVE_CRIT_MULTIPLIER_VS_RELATIVE_MULTIPLIER',
 stat_might:'GENERIC_POWER_VS_ATTACK_OR_SKILL_CHANNEL',
 stat_ward:'RELATIVE_WARD_VS_DAMAGE_REDUCTION_POINTS',
 stat_piercing:'LEGACY_PENETRATION_SCOPE_VS_AUTHORED_HIT_SCOPE',
 stat_swift:'RELATIVE_HASTE_VS_HASTE_POINTS',
 stat_potent:'GENERIC_POTENCY_VS_CLASS_EFFECT',
 stat_elusive:'NO_APPROVED_V4_EVASION_CHANNEL',
 stat_resolute:'RELATIVE_TENACITY_VS_STATUS_DURATION_POINTS',
});
/** Source-owned units only. Candidate compatible channels do not grant
 * gameplay conversion or approval of cap scope. */
export function inspectPermanentGearGemBudgetV2(rows,sockets){
 const gear=inspectInnateAndRandomLoadoutV2(rows);
 if(!Array.isArray(sockets)||sockets.length>2*rows.length)fail('socket_count');
 const selected=new Set(rows.map(r=>r.itemId)),seen=new Set();
 const sources=[],unresolved=[],conditional=[];
 const totals=new Map(gear.channels.map(c=>[c.channel,0]));
 for(const s of sockets){
  if(!s||Object.keys(s).sort().join(',')!=='gemId,itemId,rollPercent'||!selected.has(s.itemId)||
   !Number.isSafeInteger(s.rollPercent)||s.rollPercent<80||s.rollPercent>120||s.rollPercent%5!==0)
   fail('invalid_socket');
  const match=/^gem:([a-z0-9_]+):g([1-5])$/.exec(s.gemId);
  if(!match)fail('invalid_gem_id');
  const family=match[1],grade=Number(match[2]);
  const stat=findStatGem(family),effect=findEffectGem(family);
  if((!stat&&!effect)||gemItemId(family,grade)!==s.gemId)fail('invalid_gem_id');
  const kind=stat?'stat':'effect',key=s.itemId+':'+kind;
  if(seen.has(key))fail('duplicate_socket');
  seen.add(key);
  if(effect){conditional.push({...s,familyId:family});continue;}
  // Integer microfraction: retain sub-centipercent rolled gem precision
  // until the shared cap is evaluated, not one rounding per socket.
  const fractionMicros=Math.round(stat.values[grade]*s.rollPercent/100*1e6);
  const m=mapping[family];
  const row={...s,stat:stat.stat,unit:stat.unit,fractionMicros,channel:m?.[2]??null};
  sources.push(row);
  if(!m){unresolved.push({...row,reason:unresolvedReasons[family]??'UNRECONCILED_SOURCE'});continue;}
  const target=gear.channels.find(c=>c.channel===m[2]);
  if(stat.stat!==m[0]||stat.unit!==m[1]||target?.unit!==m[3])fail('source_contract_changed');
  totals.set(m[2],totals.get(m[2])+fractionMicros);
 }
 const channels=gear.channels.map(c=>{
  const gemFractionMicros=totals.get(c.channel);
  const gemCentipercent=Math.round(gemFractionMicros/100);
  const rawCentipercent=c.rawCentipercent+gemCentipercent;
  const effectiveCentipercent=capChannel(c.channel,rawCentipercent);
  return {...c,gemFractionMicros,gemCentipercent,rawCentipercent,effectiveCentipercent,
   excessCentipercent:rawCentipercent-effectiveCentipercent};
 });
 return {scope:'HYPOTHETICAL_PERMANENT_GEAR_GEM_CAP_REVIEW',channels,gemSources:sources,
  unresolvedGemSources:unresolved,conditionalGemSources:conditional,
  unresolvedInnates:gear.unresolved,conditionalInnates:gear.conditional,
  unpricedDomains:['set_effects','skills','companions','temporary_effects'],
  cpApproved:false,mayApplyEffects:false,releaseApproved:false};
}
