import {readFileSync} from 'node:fs';
import {proposeComponentEconomy} from './component-economy-review-v9.mjs';
import {compareRecipeBudgets,rarityBudget} from './hand-economy-review-v8.mjs';
const read=p=>JSON.parse(readFileSync(new URL('../../../docs/'+p,import.meta.url),'utf8'));
const old=read('equipment-2-0/t1-t4-48-set-unified-recipe-review-v3.json');
const affix=read('2-0/eq2-universal-affix-overlap-review-v4.json');
const processing=new Map(old.processingReview.map(x=>[x.output,x]));
const deny=Object.freeze({reviewOnly:true,mayCraft:false,mayMint:false,mayTrade:false,mayEquip:false,releaseApproved:false});
const fail=x=>{throw Error('eq2_economy_v10_'+x);};
const add=(m,k,n)=>{m[k]=(m[k]??0)+n;};
const entries=m=>Object.entries(m).sort(([a],[b])=>a.localeCompare(b));
const sum=xs=>xs.reduce((a,b)=>a+b,0);
const round=x=>Math.round(x*100)/100;
const rare=new Set(['EQ2_TROLL_SINEW','EQ2_MIRAGEFANG_CORE','EQ2_GLASSHEART_FRAGMENT','iceveinSigils','shardhearts','dawnspireCores','fortressCores','temperedHearts']);
const kind=x=>x.kind==='preserved_source'?(rare.has(x.itemId)?'rare':'common'):x.kind;
const prices=Object.freeze({refined:1,advanced:2,binder:3,common:.75,rare:12,preserved_other:1});
export const assumptions=Object.freeze({
  // Hypothetical GOLD per refined unit; no production or market observations.
  tierUnitGold:Object.freeze([0,8,20,55,110,220]),
  priceStress:Object.freeze([.5,1,2]),
  feeRates:Object.freeze([0,.05,.10]),
  salvageMaterialValueFractions:Object.freeze([0,.25,.5]),
  sellThrough:Object.freeze({common:.35,uncommon:.55,rare:.75,epic:.85,legendary:.9,mythic:.95}),
  askingCostMultipliers:Object.freeze({common:.65,uncommon:1,rare:1.8,epic:4,legendary:10,mythic:30}),
  // Work hours are synthetic active-equivalent hours, not calendar elapsed.
  profiles:Object.freeze([
    Object.freeze({id:'casual',hours:1,goldIncomePerHour:[0,400,1000,3000,6500,13000],buyRefined:.75,buyCombat:.75}),
    Object.freeze({id:'profession_specialist',hours:4,goldIncomePerHour:[0,600,1500,4500,9500,19000],buyRefined:0,buyCombat:1}),
    Object.freeze({id:'combat_focused',hours:4,goldIncomePerHour:[0,800,2000,6000,13000,26000],buyRefined:1,buyCombat:0})
  ]),
  // Only illustrative throughput for unexpanded inputs. Rare inputs remain a stochastic expectation, not guaranteed.
  rawPerHour:120,commonPerHour:20,rarePerHour:2,processedUnknownPerHour:30,
  processingSpeedFactors:Object.freeze([1,1.2])
});
export function preparation(row,version='candidate',copies=1,speed=1){
  if(!['previous','candidate'].includes(version)||!Number.isSafeInteger(copies)||copies<1||copies>1000||![1,1.2].includes(speed))fail('preparation_args');
  const raw={},unexpanded={},batches={},bySkill={},leftover={},xpBySkill={};
  // Aggregate all demands at each level first: T4 consumes T3 ingots.
  const demand={};for(const x of row.inputs)add(demand,x.itemId,x[version]*copies);
  const ordered=[...processing.values()].sort((a,b)=>b.tier-a.tier);
  for(const p of ordered){
    const q=demand[p.output]??0;if(!q)continue;
    delete demand[p.output];
    const n=Math.ceil(q/p.quantity);
    add(batches,p.output,n);add(leftover,p.output,n*p.quantity-q);
    add(bySkill,p.xpSkill,n*p.seconds/speed);add(xpBySkill,p.xpSkill,n*p.xp);
    for(const [id,amount] of Object.entries(p.inputs))add(demand,id,n*amount);
  }
  const original=new Map(row.inputs.map(x=>[x.itemId,x]));
  for(const [id,q] of Object.entries(demand)){
    const x=original.get(id);
    if(x&&['refined','advanced','binder'].includes(x.kind))add(unexpanded,id,q);
    else if(x)add(unexpanded,id,q); // combat and raw finds have no verified grant rate
    else add(raw,id,q);
  }
  return {sourceId:row.sourceId,tier:row.tier,version,copies,speed,raw,unexpanded,batches,leftover,bySkill,xpBySkill,
    knownProcessingSeconds:sum(Object.values(bySkill)),forgeSeconds:row.seconds*copies,
    completePreparation:false,sourceRateVerified:false,...deny};
}
export function materialValue(row,version='candidate',stress=1){
  if(!['previous','candidate'].includes(version)||!assumptions.priceStress.includes(stress)||!assumptions.tierUnitGold[row.tier])fail('valuation_args');
  return sum(row.inputs.map(x=>x[version]*prices[kind(x)]*assumptions.tierUnitGold[row.tier]*stress));
}
export function economics(row,version='candidate',stress=1,fee=.05,salvage=0){
  if(!assumptions.feeRates.includes(fee)||!assumptions.salvageMaterialValueFractions.includes(salvage))fail('economic_args');
  const materials=materialValue(row,version,stress);
  const gold=version==='candidate'?row.candidateGold:row.previousGold;
  const cost=gold+materials;
  const outcomes=affix.rarityBands.map(b=>{
    const p=b.buckets/1000000,s=assumptions.sellThrough[b.rarity],asking=cost*assumptions.askingCostMultipliers[b.rarity];
    // One terminal path only: sold and charged fee OR unsold and hypothetical salvage.
    const saleNet=asking*(1-fee),unsoldNet=materials*salvage;
    return {rarity:b.rarity,p,s,asking,saleNet,unsoldNet,expectedNet:p*(s*saleNet+(1-s)*unsoldNet)};
  });
  const expectedNet=sum(outcomes.map(x=>x.expectedNet));
  const saleCoefficient=sum(outcomes.map(x=>x.p*x.s*assumptions.askingCostMultipliers[x.rarity]*(1-fee)));
  const unsoldRecovery=sum(outcomes.map(x=>x.p*(1-x.s)*x.unsoldNet));
  return {sourceId:row.sourceId,tier:row.tier,version,stress,fee,salvage,gold,materials,cost,expectedNet,
    profit:expectedNet-cost,marginOnCost:(expectedNet-cost)/cost,
    breakEvenUniformAskScale:(cost-unsoldRecovery)/(cost*saleCoefficient),
    guaranteedSaleBreakEven:cost/(1-fee),outcomes,...deny};
}
export function handComparisons(rows=proposeComponentEconomy()){
  const index=new Map(rows.map(r=>[r.sourceId,r]));
  return compareRecipeBudgets().map(v=>{
    const c=index.get(v.combined.sourceId),w=index.get(v.weapon.sourceId),o=index.get(v.offhand.sourceId);
    if(!c||!w||!o)fail('hand_source');
    const combined=materialValue(c)+c.candidateGold,pair=materialValue(w)+materialValue(o)+w.candidateGold+o.candidateGold;
    // Component-only economic parity target; not an authored new ingredient list.
    // Keep current combined direct fee. Missing value is an opportunity-cost target, not a new gold charge.
    return {tier:v.tier,classId:v.classId,referenceClass:v.referenceClass,route:v.route,
      combinedId:c.itemId,combinedFee:c.candidateGold,pairFee:w.candidateGold+o.candidateGold,combinedCost:combined,pairCost:pair,
      costRatio:combined/pair,additionalComponentValue:Math.max(0,pair-combined),
      combinedSeconds:c.seconds,pairSeconds:w.seconds+o.seconds,
      additionalPreparationSecondsCandidate:Math.max(0,w.seconds+o.seconds-c.seconds),
      independentLanePolicy:'TWO_RETAINED_MATERIAL_RECEIPTS_NO_SECOND_EQUIPPABLE_ITEM',rarity:rarityBudget('mythic'),...deny};
  });
}
export function simulateProfile(row,profile,stress=1,version='candidate'){
  if(!assumptions.profiles.includes(profile))fail('profile');
  const cost=economics(row,version,stress),prep=preparation(row,version);
  let bought=0,ownHours=0;
  for(const x of row.inputs){
    const k=kind(x),isCombat=k==='common'||k==='rare';
    // Specialists buy combat and unmodeled raw finds and binders, not forced to level another skill.
    const share=k==='binder'||k==='preserved_other'?1:isCombat?profile.buyCombat:profile.buyRefined;
    const q=x[version],v=q*prices[k]*assumptions.tierUnitGold[row.tier]*stress;
    bought+=v*share;
    // Refined input supply rate includes prep; do not also add raw/processing seconds.
    const rate=isCombat?(k==='rare'?assumptions.rarePerHour:assumptions.commonPerHour):assumptions.processedUnknownPerHour;
    ownHours+=q*(1-share)/rate;
  }
  const cash=cost.gold+bought;
  const fundingHours=cash/profile.goldIncomePerHour[row.tier];
  // A hypothetical full sequential work budget; not a completion-time guarantee.
  const effortHours=ownHours+fundingHours+row.seconds/3600;
  return {sourceId:row.sourceId,tier:row.tier,profile:profile.id,stress,version,cash,fullOpportunityCost:cost.cost,
    purchasedMaterialValue:bought,ownHours,fundingHours,forgeHours:row.seconds/3600,effortHours,
    activeDayEquivalents:effortHours/profile.hours,knownPrepHours:prep.knownProcessingSeconds/3600,
    assumesMarketSupply:true,combatProgressionRequired:false,...deny};
}
const median=xs=>{const s=[...xs].sort((a,b)=>a-b),i=Math.floor(s.length/2);return s.length%2?s[i]:(s[i-1]+s[i])/2;};
export function summarizeEconomy(){
  const rows=proposeComponentEconomy();
  const byTier=[1,2,3,4,5].map(tier=>{
    const r=rows.filter(x=>x.tier===tier),p=r.map(x=>[preparation(x,'previous'),preparation(x),preparation(x,'candidate',1,1.2)]);
    const before=r.map(x=>economics(x,'previous')),after=r.map(x=>economics(x));
    return {tier,routes:r.length,medianOldCost:median(before.map(x=>x.cost)),medianNewCost:median(after.map(x=>x.cost)),
      medianKnownPrepSecondsBefore:median(p.map(x=>x[0].knownProcessingSeconds)),
      medianKnownPrepSecondsAfter:median(p.map(x=>x[1].knownProcessingSeconds)),
      medianKnownPrepSecondsFaster:median(p.map(x=>x[2].knownProcessingSeconds)),
      incompletePrepRoutes:p.filter(x=>!x[1].completePreparation).length,
      medianBreakEvenScale:median(after.map(x=>x.breakEvenUniformAskScale)),
      profiles:assumptions.profiles.map(profile=>({id:profile.id,
        medianDaysBefore:round(median(r.map(x=>simulateProfile(x,profile,1,'previous').activeDayEquivalents))),
        medianDaysAfter:round(median(r.map(x=>simulateProfile(x,profile).activeDayEquivalents))),
        lowPriceDays:round(median(r.map(x=>simulateProfile(x,profile,.5).activeDayEquivalents))),
        highPriceDays:round(median(r.map(x=>simulateProfile(x,profile,2).activeDayEquivalents)))}))};
  });
  const hands=handComparisons(rows);
  return {routes:rows.length,byTier,handComparisons:hands.length,handRatioRange:[Math.min(...hands.map(x=>x.costRatio)),Math.max(...hands.map(x=>x.costRatio))],
    scenarioCount:rows.length*assumptions.profiles.length*assumptions.priceStress.length,marketStressCases:rows.length*assumptions.priceStress.length*assumptions.feeRates.length*assumptions.salvageMaterialValueFractions.length,
    ...deny};
}
