/** Permanent mixed-unit reconciliation proposal. No source rolls rewritten.
 * Only the explicitly reviewed fixed/gem lanes are normalized here. Generic
 * power/potency and ambiguous mitigation/penetration channels remain unpriced.
 * Hypothetical source catalogue rows are NOT equipped-copy ownership proofs. */
import {inspectAdvancedPermanentBudgetV2} from './advanced-permanent-budget-review.mjs';
const rules=Object.freeze({
 haste_pct:Object.freeze({unit:'relative_percent',knee:1200,hard:2500,mechanic:'RELATIVE_HASTE_STAT_NOT_TEMPO'}),
 healing_power_pct:Object.freeze({unit:'relative_percent',knee:2500,hard:4500,mechanic:'HEALING_POWER_INCLUDING_SHIELD_BASE_NOT_FORGE_HEAL_ONLY'}),
 crit_multiplier_add:Object.freeze({unit:'multiplier_increment',knee:3500,hard:6500,mechanic:'ADDITIVE_AFTER_RELATIVE_CRIT_MULTIPLIER'}),
});
const fail=reason=>{throw Error('eq2_mixed_permanent_'+reason);};
export function inspectMixedPermanentBudgetV2(rows,sockets){
 const prior=inspectAdvancedPermanentBudgetV2(rows,sockets);
 const innateSources=[],gemSources=[],unresolvedInnates=[],unresolvedGemSources=[];
 const totals=new Map(Object.keys(rules).map(k=>[k,{innateCentipercent:0,gemFractionMicros:0}]));
 for(const s of prior.unresolvedInnates){
  if(s.stat!=='haste_pct'&&s.stat!=='healing_power_pct'){unresolvedInnates.push(s);continue;}
  if(s.unit!=='relative_percent'||!Number.isSafeInteger(s.centipercent)||s.centipercent<0)fail('innate_source');
  innateSources.push({...s,candidateChannel:s.stat});
  totals.get(s.stat).innateCentipercent+=s.centipercent;
 }
 for(const s of prior.unresolvedGemSources){
  const swift=/^gem:stat_swift:g[1-5]$/.test(s.gemId),savage=/^gem:stat_savage:g[1-5]$/.test(s.gemId);
  if(!swift&&!savage){unresolvedGemSources.push(s);continue;}
  if(s.unit!=='percent'||s.stat!==(swift?'haste':'critDamage')||
    !Number.isSafeInteger(s.fractionMicros)||s.fractionMicros<0)fail('gem_source');
  const channel=swift?'haste_pct':'crit_multiplier_add';
  gemSources.push({...s,channel});
  totals.get(channel).gemFractionMicros+=s.fractionMicros;
 }
 const mixedChannels=Object.entries(rules).map(([channel,p])=>{
  const {innateCentipercent,gemFractionMicros}=totals.get(channel);
  const gemCentipercent=Math.round(gemFractionMicros/100),rawCentipercent=innateCentipercent+gemCentipercent;
  const effectiveCentipercent=Math.min(p.hard,rawCentipercent<=p.knee?rawCentipercent:p.knee+Math.floor((rawCentipercent-p.knee)/2));
  return {channel,unit:p.unit,mechanic:p.mechanic,innateCentipercent,gemFractionMicros,gemCentipercent,
   rawCentipercent,effectiveCentipercent,capPolicy:'PROPOSED_NOT_APPROVED'};
 });
 return {scope:'MIXED_PERMANENT_SOURCE_REVIEW_ONLY',prior,mixedChannels,innateSources,gemSources,
  unresolvedInnates,unresolvedGemSources,randomPoolChanged:false,cpApproved:false,mayApplyEffects:false,releaseApproved:false};
}
/** Explicit hypothetical arithmetic, not a combat stat compiler. Relative
 * haste affects the haste stat before additive points; additive Savage
 * follows relative crit multiplier. Heal-power lane never multiplies Forge
 * direct-heal-only bonus into the underlying healing stat. */
export function projectMixedStatExamplesV2(base,report){
 for(const key of ['haste','critMultiplier','healingPower']){
  if(!Number.isFinite(base[key])||base[key]<0)fail('base_stat');
 }
 if(base.critMultiplier<1||report.scope!=='MIXED_PERMANENT_SOURCE_REVIEW_ONLY')fail('scope');
 const fraction=(rows,id)=>(rows.find(x=>x.channel===id)?.effectiveCentipercent??0)/10000;
 const mixed=id=>fraction(report.mixedChannels,id);
 const gear=id=>fraction(report.prior.original.channels,id);
 return {haste:base.haste*(1+mixed('haste_pct'))+gear('haste_pp'),
  critMultiplier:base.critMultiplier*(1+gear('crit_damage_pct'))+mixed('crit_multiplier_add'),
  healingPower:base.healingPower*(1+mixed('healing_power_pct')),
  forgeHealOnlyFraction:gear('forge_healing_power_pct'),
  mayApplyEffects:false,cpApproved:false,releaseApproved:false};
}
