import {readFileSync} from 'node:fs';
import {proposeComponentEconomy} from './component-economy-review-v9.mjs';
import {preparation,materialValue,handComparisons,assumptions} from './economy-simulation-review-v10.mjs';
const load=p=>JSON.parse(readFileSync(new URL('../../../docs/'+p,import.meta.url),'utf8'));
export const materialPlan=load('2-0/eq2-t5-material-production-review-v11.json');
const t5=load('equipment-2-0/t5-catalogue-expansion-review-v4.json');
const old=load('equipment-2-0/t1-t4-48-set-unified-recipe-review-v3.json');
const keys=new Map(t5.materialCandidates.map(x=>[x.key,x.id]));
const process=new Map(materialPlan.processing.map(x=>[x.output,x]));
const deny=Object.freeze({reviewOnly:true,mayCraft:false,mayMint:false,mayTrade:false,mayEquip:false,releaseApproved:false});
const fail=x=>{throw Error('eq2_economy_v11_'+x);};
const add=(o,k,v)=>{o[k]=(o[k]??0)+v;};
const sum=a=>a.reduce((n,x)=>n+x,0);
const median=a=>{const b=[...a].sort((x,y)=>x-y),i=Math.floor(b.length/2);return b.length%2?b[i]:(b[i-1]+b[i])/2;};
// Descending dependency depth; aggregate input demand before applying batch ceilings.
function depth(id,seen=new Set()){
 const p=process.get(id);if(!p)return 0;if(seen.has(id))fail('processing_cycle');
 return 1+Math.max(0,...Object.keys(p.inputs).map(x=>depth(x,new Set([...seen,id]))));
}
const ordered=[...process.keys()].sort((a,b)=>depth(b)-depth(a));
export function t5Preparation(row,version='candidate',copies=1,speed=1){
 if(row.tier!==5||!['previous','candidate'].includes(version)||!Number.isSafeInteger(copies)||copies<1||copies>1000||![1,1.2].includes(speed))fail('prep_args');
 const demand={},batches={},leftovers={},secondsBySkill={},xpBySkill={};let nominalProcessingGold=0;
 for(const x of row.inputs){const id=keys.get(x.itemId);if(!id)fail('unknown_t5_key');add(demand,id,x[version]*copies);}
 for(const id of ordered){const q=demand[id]??0;if(!q)continue;delete demand[id];const p=process.get(id),n=Math.ceil(q/p.quantity);
  add(batches,id,n);add(leftovers,id,n*p.quantity-q);add(secondsBySkill,p.skill,n*p.seconds/speed);add(xpBySkill,p.skill,n*p.xp);nominalProcessingGold+=n*p.gold;
  for(const [raw,v] of Object.entries(p.inputs))add(demand,raw,n*v);
 }
 return {sourceId:row.sourceId,tier:5,version,copies,speed,rawDemand:demand,batches,leftovers,secondsBySkill,xpBySkill,nominalProcessingGold,
  knownProcessingSeconds:sum(Object.values(secondsBySkill)),forgeSeconds:row.seconds*copies,sourceGrantVerified:false,completePreparation:false,...deny};
}
export function pacing(){
 const rows=proposeComponentEconomy();
 return [1,2,3,4,5].map(tier=>{
  const r=rows.filter(x=>x.tier===tier),prep=tier===5?t5Preparation:preparation;
  const before=median(r.map(x=>prep(x,'previous').knownProcessingSeconds)),after=median(r.map(x=>prep(x).knownProcessingSeconds));
  const faster=median(r.map(x=>prep(x,'candidate',1,1.2).knownProcessingSeconds));
  return {tier,routes:r.length,before,after,faster,ratio:faster/before,xpPerHourFactor:1.2,approval:'SPEED_AND_XP_PER_HOUR_REVIEW_REQUIRED',...deny};
 });
}
export function combinedRecipes(rows=proposeComponentEconomy()){
 const index=new Map(rows.map(x=>[x.itemId+':'+x.route,x])),groups=Object.groupBy(handComparisons(rows),x=>x.combinedId+':'+x.route);
 return Object.entries(groups).map(([key,g])=>{
  const r=index.get(key);if(!r)fail('weapon_source');
  const target=sum(g.map(x=>x.pairCost))/g.length;
  const originalCost=r.candidateGold+materialValue(r),gap=Math.max(0,target-originalCost);
  const eligible=r.inputs.filter(x=>x.kind==='refined'||x.kind==='advanced');
  if(!eligible.length)fail('weapon_components');
  const value=materialValue({...r,inputs:eligible});
  const scale=1+gap/value;
  // Scale existing manufactured inputs only. Preserve combat, rare signatures, and binder quantity.
  const inputs=r.inputs.map(x=>({...x,quantity:eligible.includes(x)?Math.ceil(x.candidate*scale):x.candidate}));
  const cost=r.candidateGold+materialValue({...r,inputs:inputs.map(x=>({...x,candidate:x.quantity}))});
  const laneA=[],laneB=[];
  for(const x of inputs){const a=Math.ceil(x.quantity/2),b=x.quantity-a;if(a)laneA.push({itemId:x.itemId,quantity:a});if(b)laneB.push({itemId:x.itemId,quantity:b});}
  if(!laneA.length||!laneB.length)fail('empty_lane');
  const extraSeconds=Math.max(0,Math.ceil(sum(g.map(x=>x.pairSeconds))/g.length)-r.seconds);
  return {key,itemId:r.itemId,route:r.route,tier:r.tier,referenceClasses:g.map(x=>x.referenceClass),originalCost,target,candidateCost:cost,overshoot:cost-target,
   inputs:inputs.map(({itemId,kind,candidate,quantity})=>({itemId,kind,previousV9:candidate,quantity})),
   directGoldAtAssembly:r.candidateGold,assemblySeconds:r.seconds,assemblyXp:r.xp,
   lanes:[{id:'primary',inputs:laneA,workSeconds:Math.ceil(extraSeconds/2),directGold:0},{id:'secondary',inputs:laneB,workSeconds:Math.floor(extraSeconds/2),directGold:0}],
   receiptPolicy:'ONE_TIME_ACCOUNT_BOUND_LANE_RECEIPTS_NO_DISASSEMBLY_OR_REROLL',laneXp:'UNSET_NO_DOUBLE_XP',...deny};
 });
}
// Recycle only proven original consumed manufactured base material lines, not recipe previews or hypothetical current prices.
// This pure quote is not a receipt validator and cannot authorize salvage.
export function recycleQuote(row,rate=.2){
 if(![.1,.2,.25].includes(rate))fail('recycle_rate');
 return {sourceId:row.sourceId,rate,returns:row.inputs.filter(x=>x.kind==='refined').map(x=>({itemId:x.itemId,quantity:Math.floor(x.candidate*rate)})).filter(x=>x.quantity>0),
  goldReturn:0,rareReturn:0,binderReturn:0,advancedReturn:0,requireOriginalConsumedBill:true,oneTimeDestroyRequired:true,maySalvage:false,...deny};
}
export function sourceStress(){
 return [...materialPlan.combat,...materialPlan.newRaw.filter(x=>x.kind==='combat')].flatMap(m=>m.sources.flatMap(s=>[150,300,900].map(killsPerHour=>{
  const p=s.effectiveChance;
  return {material:m.id,enemy:s.enemy,killsPerHour,effectiveChance:p,expectedUnitsPerHour:killsPerHour*p*s.quantity,
    hoursTo90PercentAtLeastOne:Math.ceil(Math.log(.1)/Math.log(1-p))/killsPerHour,...deny};
 })));
}
export function supplyTargets(rows=proposeComponentEconomy()){
 // Equal-weight item basket; prefer foundation/inherited only, not all alternative routes.
 const basket=rows.filter(x=>x.tier===5&&x.route!=='alternate');
 const demand={};
 for(const r of basket)for(const [id,q] of Object.entries(t5Preparation(r).rawDemand))add(demand,id,q);
 const stresses=sourceStress();
 return Object.entries(demand).map(([id,q])=>{
  const per100=q/basket.length*100;
  const rates=stresses.filter(x=>x.material===id&&x.killsPerHour===300);
  const best=rates.length?Math.max(...rates.map(x=>x.expectedUnitsPerHour)):null;
  return {id,basketItems:basket.length,unitsPer100Crafts:per100,stockTargetTwoBaskets:per100*2,
   replenishmentTargetPer100Crafts:per100*1.25,illustrativeDedicatedKillHoursAt300PerHour:best===null?null:per100/best,
   supplyVerified:false,...deny};
 });
}
export function summary(){
 const rows=proposeComponentEconomy(),hands=combinedRecipes(rows),p=pacing(),t=supplyTargets(rows);
 return {t5Routes:rows.filter(x=>x.tier===5).length,processingOutputs:process.size-1,handRecipes:hands.length,
  handCostRatio:[Math.min(...hands.map(x=>x.candidateCost/x.target)),Math.max(...hands.map(x=>x.candidateCost/x.target))],
  sourceStressCases:sourceStress().length,salvageQuotes:rows.length,supplyTargets:t.length,pacing:p,...deny};
}
