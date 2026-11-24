import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {proposeComponentEconomy} from './component-economy-review-v9.mjs';
import {combinedRecipes} from './economy-production-review-v11.mjs';
import {policy,materialCatalogue,accessAudit} from './unified-economy-review-v12.mjs';
import {refiningPlan,finalBill,gatheringPlan,sourceRateStress,raritySupply} from './economy-balance-review-v13.mjs';
const root=new URL('../../../',import.meta.url);
const read=p=>JSON.parse(readFileSync(new URL(p,root),'utf8'));
export const index=read('docs/2-0/eq2-consolidated-review-index-v14.json');
const membership=read('docs/2-0/eq2-t1-t5-canonical-membership-reconciliation-v2.json');
const t5=read('docs/equipment-2-0/t5-catalogue-expansion-review-v4.json');
const t5Sources=read('docs/2-0/eq2-t5-material-production-review-v11.json');
const keys=new Map(t5.materialCandidates.map(x=>[x.key,x.id]));
const aliases=new Map(policy.identityReconciliation.map(x=>[x.from,x.to]));
const deny=Object.freeze({reviewOnly:true,mayCraft:false,mayMint:false,mayTrade:false,mayDrop:false,mayEquip:false,mayRenderInLiveUI:false,releaseApproved:false});
const fail=x=>{throw Error('eq2_consolidated_v14_'+x);};
const add=(o,k,v)=>{o[k]=(o[k]??0)+v;};
export function verifyPins(){
 const historical=read(index.historicalSourcePins);
 const pins=[...historical.sources,...index.contracts];
 for(const p of pins){
  const bytes=readFileSync(new URL(p.path,root));
  const sha=createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex');
  if(sha!==p.blobSha)fail('source_digest:'+p.path);
 }
 return {pins:pins.length,...deny};
}
function normalized(r){
 return r.inputs.map(x=>{
  const itemId=r.tier===5?keys.get(x.itemId):aliases.get(x.itemId)??x.itemId;
  if(!itemId)fail('material_id');
  return {itemId,quantity:x.candidate,kind:x.kind};
 });
}
export function reviewCatalog(){
 const rows=proposeComponentEconomy(),byId=new Map();
 for(const r of rows){
  if(!byId.has(r.itemId))byId.set(r.itemId,[]);
  byId.get(r.itemId).push({sourceId:r.sourceId,route:r.route,ingredients:normalized(r),directGold:r.candidateGold,forgeSeconds:r.seconds,forgeXp:r.xp,...deny});
 }
 const catalog=membership.entries.map(e=>{
  const recipes=byId.get(e.itemId)??[];
  const boss=!!(e.bossName||e.dungeonId);
  const blueprint=e.reconciliation.sourceStatus==='BLUEPRINT_UNLOCK_AND_CANONICAL_RECIPE_MISSING';
  if((boss||blueprint)&&recipes.length)fail('forbidden_recipe');
  if(!boss&&!blueprint&&!recipes.length)fail('unclassified_item');
  return {itemId:e.itemId,tier:e.tier,setId:e.setId??null,
    sourceClass:boss?'BOSS_ONLY':blueprint?'BLUEPRINT_UNRESOLVED':'CRAFT_REVIEW',
    recipes,sourceApprovalRequired:true,...deny};
 });
 if(new Set(catalog.map(x=>x.itemId)).size!==catalog.length)fail('duplicate_item');
 return catalog;
}
export function canonicalGathering(){
 return gatheringPlan().map(g=>{
  const prior=policy.candidates.find(x=>x.id===g.id)??t5Sources.newRaw.find(x=>x.id===g.id);
  if(!prior||!prior.zone)fail('source_location');
  return {...g,zone:prior.zone,area:prior.area??null,sourceRegistered:false,...deny};
 });
}
export function canonicalSupply(scenario='pending1693',variant='standard'){
 if(!['standard','combined_alternative'].includes(variant))fail('basket_variant');
 const rows=proposeComponentEconomy().filter(x=>x.route!=='alternate');
 const hand=variant==='combined_alternative'?new Map(combinedRecipes().map(h=>[h.key,h])):new Map();
 return [1,2,3,4,5].map(tier=>{
  const basket=rows.filter(x=>x.tier===tier),demand={};
  let processingGold=0,forgeGold=0;
  for(const r of basket){
   const h=hand.get(r.itemId+':'+r.route);
   const q=h?new Map(h.inputs.map(x=>[x.itemId,x.quantity])):null;
   const bill=finalBill(q?{...r,inputs:r.inputs.map(x=>({...x,candidate:q.get(x.itemId)}))}:r,scenario);
   for(const [id,n] of Object.entries(bill.raw))add(demand,id,n);
   processingGold+=bill.processingGold;forgeGold+=bill.finalForgeGold;
  }
  const f=100/basket.length;
  return {tier,scenario,variant,items:basket.length,unitsPer100Crafts:Object.fromEntries(Object.entries(demand).map(([id,n])=>[id,n*f])),
    processingGoldPer100:processingGold*f,forgeGoldPer100:forgeGold*f,actualSupplyVerified:false,
    assumptions:'EQUAL_WEIGHT_SINGLE_ROUTE_PER_ITEM_NO_SHARED_BATCH_LEFTOVERS_NO_DEMAND_FORECAST',...deny};
 });
}
export function canonicalSalvagePreview(recipe,rate=.2){
 if(![.1,.2,.25].includes(rate)||!recipe.reviewOnly||recipe.mayCraft!==false||!Array.isArray(recipe.ingredients))fail('salvage_preview_only');
 return {sourceId:recipe.sourceId,rate,returns:recipe.ingredients.filter(x=>x.kind==='refined').map(x=>({itemId:x.itemId,quantity:Math.floor(x.quantity*rate)})).filter(x=>x.quantity>0),
  goldReturn:0,requireActualImmutableConsumedBill:true,atomicDestroyRequired:true,maySalvage:false,...deny};
}
export function summary(){
 const pins=verifyPins(),items=reviewCatalog(),craft=items.filter(x=>x.sourceClass==='CRAFT_REVIEW'),materials=materialCatalogue(),p=refiningPlan();
 const counts={items:items.length,sets:membership.sets.length,bossOnly:items.filter(x=>x.sourceClass==='BOSS_ONLY').length,craftItems:craft.length,
  craftRoutes:craft.reduce((n,x)=>n+x.recipes.length,0),unresolvedBlueprints:items.filter(x=>x.sourceClass==='BLUEPRINT_UNRESOLVED').length,
  t5SingleRouteItems:craft.filter(x=>x.tier===5&&x.recipes.length===1).length,materialIdentities:materials.length,processingOutputs:p.length,combinedAlternatives:combinedRecipes().length};
 for(const [k,v] of Object.entries(index.expected))if(counts[k]!==v)fail('count:'+k);
 return {counts,pins:pins.pins,gatheringCandidates:canonicalGathering().length,sourceStressCases:sourceRateStress().length,rarities:raritySupply().length,
  auditedCraftRoutes:accessAudit().length,preferredSupply:canonicalSupply(),combinedSupply:canonicalSupply('pending1693','combined_alternative'),
  launchDecision:'BLOCKED_D1_D10',...deny};
}
