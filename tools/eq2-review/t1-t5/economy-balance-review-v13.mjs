import {readFileSync} from 'node:fs';
import {proposeComponentEconomy} from './component-economy-review-v9.mjs';
import {policy,processingRegistry,materialCatalogue,accessAudit} from './unified-economy-review-v12.mjs';
import {materialPlan,combinedRecipes} from './economy-production-review-v11.mjs';
const load=p=>JSON.parse(readFileSync(new URL('../../../docs/'+p,import.meta.url),'utf8'));
const t5=load('equipment-2-0/t5-catalogue-expansion-review-v4.json');
const affix=load('2-0/eq2-universal-affix-overlap-review-v4.json');
const aliases=new Map(policy.identityReconciliation.map(x=>[x.from,x.to]));
const keys=new Map(t5.materialCandidates.map(x=>[x.key,x.id]));
const deny=Object.freeze({reviewOnly:true,mayCraft:false,mayMint:false,mayTrade:false,mayDrop:false,mayEquip:false,releaseApproved:false});
const fail=x=>{throw Error('eq2_balance_v13_'+x);};
const add=(o,k,v)=>{o[k]=(o[k]??0)+v;};
const sum=a=>a.reduce((n,x)=>n+x,0);
const median=a=>{const b=[...a].sort((x,y)=>x-y),i=Math.floor(b.length/2);return b.length%2?b[i]:(b[i-1]+b[i])/2;};
const pendingCharged={COPPER_INGOT:30,ASTER_IRON_INGOT:50,SUNSTONE_INGOT:290,FROSTIRON_INGOT:730};
export const balancePolicy=Object.freeze({
 preferredSmeltScenario:'pending1693', // owner-approved separate PR inputs, still not merged
 newProcessingGold:0,newProcessingSpeed:1.2,newBasicBatchQuantity:3,
 t5DurationStress:[1,2], sourceRatesVerified:false,
 feeRule:'EXISTING_SMELT_CHARGED_AS_PINNED_OR_SNAPSHOT_SURCHARGE; BINDER_ASSUMED_20_PERCENT_ONCE; NEW_EQ2_ZERO',
 noCrossProfessionLevel:true, noCombatLevelForCraft:true,
 releaseScope:'HIDDEN_CANDIDATE_ONLY'
});
export function refiningPlan(scenario='pending1693',t5Factor=1){
 if(!['snapshot','pending1693'].includes(scenario)||![1,2].includes(t5Factor))fail('scenario');
 return processingRegistry('reuse_candidate',scenario).map(p=>{
  const units=p.referenceOnly||p.tier===5?1:3;
  const time=p.referenceOnly?p.seconds:Math.ceil(p.seconds*units*(p.tier===5?t5Factor:1)/1.2);
  const gold=p.referenceOnly?(scenario==='pending1693'&&Object.hasOwn(pendingCharged,p.output)?pendingCharged[p.output]:Math.ceil(p.gold*6/5)):0;
  if(!Number.isSafeInteger(gold)||gold<0)fail('fee');
  return {...p,inputs:Object.fromEntries(Object.entries(p.inputs).map(([id,q])=>[id,q*units])),
   quantity:p.quantity*units,seconds:time,xp:p.xp*units,chargedGoldCandidate:gold,
   xpPerHour:p.xp*units/time*3600,sourceXpPerHour:p.xp/p.seconds*3600,
   feeBasis:p.referenceOnly?'EXISTING_REFERENCE_SCENARIO_NOT_LIVE_READBACK':'NEW_NO_EXTRA_GOLD_CANDIDATE',...deny};
 });
}
function depth(id,p,seen=new Set()){
 if(!p.has(id))return 0;if(seen.has(id))fail('cycle');
 return 1+Math.max(0,...Object.keys(p.get(id).inputs).map(k=>depth(k,p,new Set([...seen,id]))));
}
export function finalBill(row,scenario='pending1693',t5Factor=1){
 const p=new Map(refiningPlan(scenario,t5Factor).map(x=>[x.output,x])),d={},batches={},leftovers={},seconds={},xp={};
 for(const x of row.inputs){const id=row.tier===5?keys.get(x.itemId):aliases.get(x.itemId)??x.itemId;if(!id)fail('identity');add(d,id,x.candidate);}
 let gold=0;
 for(const id of [...p.keys()].sort((a,b)=>depth(b,p)-depth(a,p))){
  const q=d[id]??0;if(!q)continue;delete d[id];const r=p.get(id),n=Math.ceil(q/r.quantity);
  add(batches,id,n);add(leftovers,id,n*r.quantity-q);add(seconds,r.skill,n*r.seconds);add(xp,r.skill,n*r.xp);gold+=n*r.chargedGoldCandidate;
  for(const [k,v] of Object.entries(r.inputs))add(d,k,n*v);
 }
 return {sourceId:row.sourceId,tier:row.tier,scenario,t5Factor,raw:d,batches,leftovers,seconds,xp,
  processingGold:gold,finalForgeGold:row.candidateGold,totalGold:gold+row.candidateGold,
  processingSeconds:sum(Object.values(seconds)),forgeSeconds:row.seconds,forgeXp:row.xp,
  excludesRawOpportunityValue:true,sourceGrantVerified:false,...deny};
}
// Targets for new T1-T4 sources, not verified drops. Preserve existing materials' actual source policy.
const dropTargets=[
 ['EQ2_BOAR_TUSK','ROADSIDE_BOAR',.18],['EQ2_TROLL_SINEW','FOREST_TROLL',.012],
 ['EQ2_SUNSCAR_SCALE','SUNSCAR_SCORPION',.18],['EQ2_MIRAGEFANG_CORE','SUNSCAR_SCORPION',.006],['EQ2_MIRAGEFANG_CORE','MIRAGE_SHADE',.012],
 ['EQ2_SUNSCAR_HIDE','EQ2_DUNE_HARE',.20],['EQ2_GLASSBOUND_PLATE','SANDPLATE_JUGGERNAUT',.18],['EQ2_GLASSBOUND_PLATE','GLASSBOUND_SENTINEL',.20],
 ['EQ2_GLASSHEART_FRAGMENT','SANDPLATE_JUGGERNAUT',.006],['EQ2_GLASSHEART_FRAGMENT','GLASSBOUND_SENTINEL',.010]
];
export function sourceRateStress(){
 const t5=[...materialPlan.combat,...materialPlan.newRaw.filter(x=>x.kind==='combat')].flatMap(m=>m.sources.map(s=>[m.id,s.enemy,s.effectiveChance]));
 return [...dropTargets,...t5].flatMap(([id,enemy,p])=>[150,300,900].map(killsPerHour=>({id,enemy,p,killsPerHour,expectedUnitsPerHour:p*killsPerHour,
  hours90AtLeastOne:Math.ceil(Math.log(.1)/Math.log(1-p))/killsPerHour,sourceRegistered:false,...deny})));
}
export function gatheringPlan(){
 const rows=policy.candidates.filter(x=>x.kind==='gathering').map(x=>({...x,id:x.id,node:x.sourceId,level:x.level}));
 rows.push({id:'EQ2_T5_FROSTFLAX',node:'EQ2_T5_FROSTFLAX_PATCH',skill:'herbalism',level:46});
 return rows.map(x=>{
  // Total effective action duration, not legacy pre-doubling duration.
  const seconds=x.level===1?32:x.level===8?48:x.level===26?96:x.level===34?112:130;
  const xp=x.level===1?10:x.level===8?24:x.level===26?130:x.level===34?180:220;
  const find=x.id==='EQ2_RIVERSTONE'||x.id==='EQ2_THORNSTONE';
  return {id:x.id,node:x.node,skill:x.skill,level:x.level,seconds,xp,quantity:1,
    acquisition:find?'SECONDARY_FIND_ON_ELIGIBLE_EXISTING_ACTION':'DEDICATED_RESOURCE_ACTION',
    effectiveChance:find ? 0.10 : 1,expectedUnitsPerHour:3600/seconds*(find ? 0.10 : 1),
    // A secondary find must NOT pay a second full action XP award.
    xpPerHour:find?null:xp*3600/seconds,secondaryFindExtraXp:find?0:null,
    requiresSkillOnlyTravel:true,sourceRegistered:false,...deny};
 });
}
export function raritySupply(){
 const bands=affix.rarityBands;
 if(sum(bands.map(x=>x.buckets))!==1000000)fail('rarity_mass');
 return bands.map((x,i)=>{
  const p=x.buckets/1000000,atLeast=sum(bands.slice(0,i+1).map(y=>y.buckets))/1000000;
  return {rarity:x.rarity,p,atLeast,expectedPer1000:1000*p,expectedAttemptsExact:1/p,
    attempts90Exact:Math.ceil(Math.log(.1)/Math.log(1-p)),
    expectedAttemptsAtLeast:1/atLeast,independentTwoLaneExpectedAttempts:2/p,...deny};
 });
}
export function candidateCosts(){
 const rows=proposeComponentEconomy(),hands=combinedRecipes(rows),byId=new Map(rows.map(x=>[x.itemId+':'+x.route,x]));
 const normal=rows.map(r=>finalBill(r));
 const combined=hands.map(h=>{
  const r=byId.get(h.key);if(!r)fail('combined_source');
  const q=new Map(h.inputs.map(x=>[x.itemId,x.quantity]));
  const bill=finalBill({...r,inputs:r.inputs.map(x=>({...x,candidate:q.get(x.itemId)}))});
  return {...bill,variant:'COMBINED_LANE_CANDIDATE',laneWorkSeconds:sum(h.lanes.map(x=>x.workSeconds)),laneXp:null,...deny};
 });
 return {normal,combined,...deny};
}
export function progressionAccess(){
 return accessAudit().map(x=>({...x,
   ownCraftAt:x.craftLevel,combatLevelRequired:0,secondaryProfessionRequired:false,
   procurementPath:'OWN_PROFESSION_OR_VERIFIED_TRADE_COMMISSION',soloSelfSupplyGuaranteed:false,
   // Supply readiness is separate from skill eligibility. No fake materials or bypass.
   releaseBlockers:['SOURCE_GRANT_RECEIPTS','SKILL_ONLY_TRAVEL','TRADE_COMMISSION_CUSTODY','ACTUAL_SOURCE_RATES'],...deny}));
}
export function summary(){
 const rows=proposeComponentEconomy(),costs=candidateCosts(),access=progressionAccess(),g=gatheringPlan(),s=sourceRateStress(),r=raritySupply();
 const byTier=[1,2,3,4,5].map(tier=>{
  const rr=rows.filter(x=>x.tier===tier),b=costs.normal.filter(x=>x.tier===tier),snapshot=rr.map(x=>finalBill(x,'snapshot')),slow=rr.map(x=>finalBill(x,'pending1693',2));
  return {tier,routes:b.length,medianProcessingSeconds:median(b.map(x=>x.processingSeconds)),medianProcessingGold:median(b.map(x=>x.processingGold)),
   medianTotalGold:median(b.map(x=>x.totalGold)),medianSnapshotTotalGold:median(snapshot.map(x=>x.totalGold)),
   medianSlowT5Seconds:median(slow.map(x=>x.processingSeconds)),laterAccessRoutes:access.filter(x=>x.tier===tier&&(x.laterProcessingRequirements.length||x.laterGatheringRequirements.length)).length};
 });
 return {routes:rows.length,combined:costs.combined.length,refining:refiningPlan().length,gathering:g.length,dropStressCases:s.length,rarities:r.length,
  materials:materialCatalogue().length,byTier,combatIntegration:'STRUCTURAL_HANDOFF_ONLY_NO_MINT_CP_OR_SET_APPROVAL',...deny};
}
