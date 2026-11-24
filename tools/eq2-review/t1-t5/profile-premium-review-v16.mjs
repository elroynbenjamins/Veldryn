import {readFileSync} from 'node:fs';
import {inspectPower} from './equipment-power-contract-review-v15.mjs';
import {capChannel} from './universal-affix-overlap-review-v4.mjs';
const read=p=>JSON.parse(readFileSync(new URL('../../../docs/2-0/'+p,import.meta.url),'utf8'));
const d=read('eq2-equipment-power-review-v5.json'),a=read('eq2-universal-affix-overlap-review-v4.json'),p=read('eq2-innate-and-set-budget-review-v7.json'),m=read('eq2-t1-t5-canonical-membership-reconciliation-v2.json'),ext=read('eq2-profile-extension-review-v16.json');
const deny=Object.freeze({reviewOnly:true,cpApproved:false,mayCraft:false,mayMint:false,mayEquip:false,mayDrop:false,mayTrade:false,mayApplyEffects:false,releaseApproved:false});
const fail=x=>{throw Error('eq2_profile_v16_'+x);};
const round=x=>Math.round(x*10000)/10000;
const premium=new Map(p.entries.map(x=>[x.itemId,x]));
const stats=new Map(a.stats.map(x=>[x.channel,x]));
export const semanticCandidates=Object.freeze([
 {source:'attack_pct',candidate:'attack_pct',unit:'relative_percent',meaning:'Multiply authoritative base plus gear attackPower once',status:'EXISTING_ENGINE_CHANNEL_NEW_INNATE_CAP_AND_WEIGHT_OPEN'},
 {source:'evasion_pp',candidate:'evasion_pp',unit:'percentage_points',meaning:'Add evasion probability; final hit and evasion clamp open',status:'EXISTING_ENGINE_CHANNEL_NEW_INNATE_CAP_AND_WEIGHT_OPEN'},
 {source:'haste_pct',candidate:null,unit:'relative_percent',meaning:'Do not relabel relative haste as percentage points; specify intended timing semantics or explicitly reauthor the source',status:'UNRESOLVED_UNIT'},
 {source:'healing_power_pct',candidate:null,unit:'relative_percent',meaning:'Distinguish class_healing_pct from forge_healing_power_pct; choose exact eligible events before mapping',status:'UNRESOLVED_HEALING_SCOPE'},
 {source:'crit_chance_pp',candidate:'crit_rate_pp',unit:'percentage_points',meaning:'Candidate alias only after confirming authored probability semantics; apply one shared cap',status:'EXPLICIT_MAPPING_APPROVAL_REQUIRED'}
]);
export function profiles(){
 const byId=new Map(d.items.map(x=>[x.itemId,{...x,baseBudgetMultiplier:1,profileBasis:'V5_PRESERVED'}]));
 for(const x of ext.entries){if(byId.has(x.itemId))fail('duplicate');byId.set(x.itemId,x);}
 if(byId.size!==m.entries.length)fail('coverage');
 return m.entries.map(e=>{
  const x=byId.get(e.itemId);
  if(!x||x.tier!==e.tier||x.slot!==e.slot||!d.basePolicy.profileSplits[x.profile])fail('profile:'+e.itemId);
  return {...x,bossOnly:!!(e.bossName||e.dungeonId),blueprintUnresolved:e.reconciliation.sourceStatus==='BLUEPRINT_UNLOCK_AND_CANONICAL_RECIPE_MISSING',...deny};
 });
}
export function basePreview(item,rarity='rare',quality=50){
 if(!Object.hasOwn(a.policy.baseRarityMultiplier,rarity)||!Number.isInteger(quality)||quality<0||quality>100)fail('grade');
 const slots=d.basePolicy.slotBudget,combined=item.slot==='weapon'&&['two','dual'].includes(item.hands);
 const baseline=(slots[item.slot]+(combined?slots.offhand:0))*item.tier*d.basePolicy.tierFactor*a.policy.baseRarityMultiplier[rarity]*(.75+quality*.005);
 const base=baseline*item.baseBudgetMultiplier;
 const [atk,def,hp]=d.basePolicy.profileSplits[item.profile];
 return {itemId:item.itemId,base:round(base),baseline:round(baseline),attack:round(base*atk),defense:round(base*def),hp:round(base*hp*d.basePolicy.hpPerPoint),
   rarity,quality,budgetLanes:combined?2:1,basePremiumPct:round((item.baseBudgetMultiplier-1)*100),...deny};
}
export function premiumComparisons(){
 return profiles().filter(x=>x.bossOnly||x.blueprintUnresolved||premium.has(x.itemId)).map(x=>{
  const e=premium.get(x.itemId),base=basePreview(x);
  const mapped=(e?.innates??[]).filter(i=>i.mapping==='EXACT_SHARED_CHANNEL'&&stats.has(i.canonicalChannel));
  const unmapped=(e?.innates??[]).filter(i=>!mapped.includes(i));
  // One-item incremental budget proxy only; nonlinear loadout caps must be applied to aggregate totals.
  const isolatedPct=mapped.reduce((n,i)=>n+capChannel(i.canonicalChannel,i.centipercent)/100*d.scorePolicy.weights[i.canonicalChannel],0);
  return {itemId:x.itemId,tier:x.tier,slot:x.slot,bossOnly:x.bossOnly,blueprintUnresolved:x.blueprintUnresolved,
    basePremiumPct:base.basePremiumPct,isolatedMappedInnateWeightPct:round(isolatedPct),mapped:mapped.map(i=>i.canonicalChannel),
    unpriced:unmapped.map(i=>i.stat),traitUnpriced:!!e?.trait||x.blueprintUnresolved,
    totalPremiumApproved:false,affixReplacementPolicy:'OPEN_NO_EXTRA_ROLL_BUDGET_APPROVED',...deny};
 });
}
// One exact same-tier, same-slot replacement in a signature-class fixture.
// No claim of legally owned/wearable copies or actual Skills/Combat execution.
export function mixedPremiumFixtures(){
 const all=new Map(profiles().map(x=>[x.itemId,x])),out=[];
 for(const x of premiumComparisons()){
  const target=all.get(x.itemId);
  for(const l of d.loadouts.filter(l=>l.tier===target.tier&&(!target.classId||target.classId===l.classId)&&
   (!target.role||target.role===l.role||target.role==='all_roles_defensive_counterplay'))){
   const old=l.itemIds.map(id=>all.get(id)).find(y=>y.slot===target.slot);
   if(!old||target.slot==='weapon'&&target.hands!==old.hands)continue;
   const baseline=inspectPower({classId:l.classId,tier:l.tier,grade:'rare',quality:50});
   const before=basePreview(old),after=basePreview(target);
   const raw=new Map(baseline.channels.map(z=>[z.channel,z.rawCentipercent]));
   const innate=premium.get(target.itemId);
   for(const i of innate?.innates??[])if(i.mapping==='EXACT_SHARED_CHANNEL'&&stats.has(i.canonicalChannel))raw.set(i.canonicalChannel,raw.get(i.canonicalChannel)+i.centipercent);
   const base=baseline.base+after.base-before.base;
   const partial=base*(1+[...raw].reduce((n,[k,v])=>n+capChannel(k,v)/10000*d.scorePolicy.weights[k],0));
   out.push({itemId:target.itemId,replaces:old.itemId,classId:l.classId,tier:l.tier,baseBefore:baseline.base,baseAfter:round(base),
    attackAfter:round(baseline.baseStats.attack-before.attack+after.attack),defenseAfter:round(baseline.baseStats.defense-before.defense+after.defense),hpAfter:round(baseline.baseStats.hp-before.hp+after.hp),
    partialBefore:baseline.partialPower,partialAfter:round(partial),partialDeltaPct:round((partial/baseline.partialPower-1)*100),
    rollPolicy:'MATCHED_RANDOM_ROLLS_FOR_SENSITIVITY_NOT_APPROVED_ADDITIVE_PREMIUM',unpriced:x.unpriced,traitUnpriced:x.traitUnpriced,
    setEffectsUnpriced:true,skillEffectsUnpriced:true,...deny});
  }
 }
 return out;
}
export function setCoverage(){
 const audited=new Map(p.sets.map(s=>[s.setId,s]));
 return m.sets.map(s=>({setId:s.setId,tier:s.tier,members:s.memberIds.length,
    thresholds:s.reconciliation.thresholds??[],hasNumericSource:audited.has(s.setId),
    status:audited.has(s.setId)?'SOURCE_PROPOSAL_NOT_EXECUTABLE':'MECHANIC_OR_NUMERIC_REVIEW_REQUIRED',...deny}));
}
export function summary(){
 const x=profiles(),p=premiumComparisons(),sets=setCoverage();
 return {profiles:x.length,preserved:x.filter(v=>v.profileBasis==='V5_PRESERVED').length,
  basis:Object.fromEntries(Object.entries(Object.groupBy(x,v=>v.profileBasis)).map(([k,v])=>[k,v.length])),
  bossOnly:x.filter(v=>v.bossOnly).length,blueprintUnresolved:x.filter(v=>v.blueprintUnresolved).length,
  premiumComparisons:p.length,premiumBaseBoosts:p.filter(v=>v.basePremiumPct>0).length,
  mixedPremiumFixtures:mixedPremiumFixtures().length,sets:sets.length,setsWithNumericSource:sets.filter(v=>v.hasNumericSource).length,semanticCandidates:semanticCandidates.length,...deny};
}
