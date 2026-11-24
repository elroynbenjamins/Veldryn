/** Candidate permanent lanes outside the V4 random affix pool.
 * Attack and Evasion already have distinct existing Combat V2 mechanics.
 * Borrow comparable V4 cap shapes for review only, not live balance. */
import {inspectPermanentGearGemBudgetV2} from './permanent-gear-gem-budget-review.mjs';
export const ADVANCED_CAPS=Object.freeze({
 attack_pct:Object.freeze({unit:'relative_percent',knee:2500,hard:4500}),
 evasion_pp:Object.freeze({unit:'percentage_points',knee:800,hard:1800}),
});
export function inspectAdvancedPermanentBudgetV2(rows,sockets){
 const original=inspectPermanentGearGemBudgetV2(rows,sockets);
 const advancedInnates=[],advancedGems=[],unresolvedInnates=[],unresolvedGemSources=[];
 const totals=new Map(Object.keys(ADVANCED_CAPS).map(k=>[k,{innateCentipercent:0,gemFractionMicros:0}]));
 for(const s of original.unresolvedInnates){
  const p=Object.hasOwn(ADVANCED_CAPS,s.stat)?ADVANCED_CAPS[s.stat]:null;
  if(!p){unresolvedInnates.push(s);continue;}
  if(s.unit!==p.unit||!Number.isSafeInteger(s.centipercent)||s.centipercent<0)throw Error('advanced_innate_source_contract');
  advancedInnates.push({...s,candidateChannel:s.stat});
  totals.get(s.stat).innateCentipercent+=s.centipercent;
 }
 for(const s of original.unresolvedGemSources){
  if(!/^gem:stat_elusive:g[1-5]$/.test(s.gemId)){unresolvedGemSources.push(s);continue;}
  if(s.stat!=='evasion'||s.unit!=='percentage_point'||!Number.isSafeInteger(s.fractionMicros)||s.fractionMicros<0)throw Error('advanced_gem_source_contract');
  advancedGems.push({...s,channel:'evasion_pp'});
  totals.get('evasion_pp').gemFractionMicros+=s.fractionMicros;
 }
 const advancedChannels=Object.entries(ADVANCED_CAPS).map(([channel,p])=>{
  const {innateCentipercent,gemFractionMicros}=totals.get(channel);
  const gemCentipercent=Math.round(gemFractionMicros/100),rawCentipercent=innateCentipercent+gemCentipercent;
  const effectiveCentipercent=Math.min(p.hard,rawCentipercent<=p.knee?rawCentipercent:p.knee+Math.floor((rawCentipercent-p.knee)/2));
  return {channel,unit:p.unit,innateCentipercent,gemFractionMicros,gemCentipercent,rawCentipercent,
   effectiveCentipercent,excessCentipercent:rawCentipercent-effectiveCentipercent,capPolicy:'PROPOSED_NOT_APPROVED'};
 });
 return {scope:'HYPOTHETICAL_ADVANCED_PERMANENT_CAP_REVIEW',original,advancedChannels,
  advancedInnates,advancedGems,unresolvedInnates,unresolvedGemSources,
  randomPoolChanged:false,cpApproved:false,mayApplyEffects:false,releaseApproved:false};
}
