import {readFileSync} from 'node:fs';
import {proposeComponentEconomy,sourceRoutes} from './component-economy-review-v9.mjs';
const load=p=>JSON.parse(readFileSync(new URL('../../../docs/'+p,import.meta.url),'utf8'));
export const policy=load('2-0/eq2-unified-economy-policy-v12.json');
const old=load('equipment-2-0/t1-t4-48-set-unified-recipe-review-v3.json');
const t5=load('equipment-2-0/t5-catalogue-expansion-review-v4.json');
const production=load('2-0/eq2-t5-material-production-review-v11.json');
const rare=load('equipment-2-0/t5-rare-set-catalogue-review-v1.json');
const t5Gates=new Map();
for(const s of [...t5.standardSets,...t5.proposedRareSets,...t5.twoPieceComboSets])for(const x of s.members)t5Gates.set(x.itemId,{level:x.craftLevelCandidate??s.craftLevelCandidate??null,profession:x.profession??s.profession??null});
for(const x of [...t5.armaments.weapons,...t5.armaments.offhands])t5Gates.set(x.itemId,{level:x.craftLevelCandidate??null,profession:x.profession??null});
for(const s of rare.sets)for(const x of s.members)t5Gates.set(x.id,{level:rare.professionCraftLevelCandidate??null,profession:rare.craftingPolicy.profession??null});
const deny=Object.freeze({reviewOnly:true,mayCraft:false,mayMint:false,mayDrop:false,mayTrade:false,releaseApproved:false});
const fail=x=>{throw Error('eq2_unified_economy_v12_'+x);};
const add=(o,k,v)=>{o[k]=(o[k]??0)+v;};
const keys=new Map(t5.materialCandidates.map(x=>[x.key,x.id]));
const proposedReplacements=new Map(policy.identityReconciliation.map(x=>[x.from,x.to]));
const normalize=(r,id,mode)=>{const exact=r.tier===5?keys.get(id):id;if(!exact)fail('material_identity');return mode==='reuse_candidate'?(proposedReplacements.get(exact)??exact):exact;};
const baseline=old.processingReview.map(p=>({...p,id:p.recipeId??'REVIEW_PROCESS_'+p.output,skill:p.xpSkill,level:p.output==='SUNSTONE_INGOT'?26:policy.tierProfessionTargets[p.tier-1].level,referenceOnly:!!p.recipeId,levelCandidate:!p.recipeId,...deny}));
export function processingRegistry(mode='baseline',smeltScenario='snapshot'){
 if(!['baseline','reuse_candidate'].includes(mode)||!['snapshot','pending1693'].includes(smeltScenario))fail('mode');
 const canonicalRefs=new Map(policy.smelts.map(x=>[x.output,x]));
 let rows=[...baseline,...production.processing.map(x=>({...x,tier:5})),...policy.binders];
 if(mode==='reuse_candidate')rows=[...rows.filter(x=>!proposedReplacements.has(x.output)),...policy.smelts.filter(x=>x.tier<=2)];
 rows=rows.map(x=>{
  const ref=canonicalRefs.get(x.output);
  if(ref){const pending=smeltScenario==='pending1693'?ref.pending1693:null;return {...x,...ref,...(pending??{}),...deny};}
  return {...x,...deny};
 });
 if(new Set(rows.map(x=>x.output)).size!==rows.length||new Set(rows.map(x=>x.id)).size!==rows.length)fail('duplicate_processing');
 return rows;
}
export function materialCatalogue(mode='reuse_candidate'){
 const procs=processingRegistry(mode),process=new Map(procs.map(x=>[x.output,x]));
 const sources=new Map();
 const record=(id,x)=>{if(!sources.has(id))sources.set(id,[]);sources.get(id).push(x);};
 for(const [id,s] of Object.entries(old.resolution.sourceIds))record(id,{origin:s.origin,sourceIds:s.candidates??[],status:'INHERITED_SOURCE_REVIEW'});
 for(const s of policy.existingSources)record(s.id,{...s,status:'INSPECTED_SOURCE_NOT_GRANT_VERIFIED'});
 for(const s of policy.candidates)record(s.id,{...s,status:'NEW_SOURCE_CANDIDATE_NOT_REGISTERED'});
 for(const s of [...production.existingRaw,...production.newRaw,...production.combat])record(s.id,{...s,status:'V11_SOURCE_REVIEW'});
 const recipes=proposeComponentEconomy();
 const direct=new Map(),processingConsumers=new Map(),tierUses=new Map(),all=new Set();
 for(const r of recipes)for(const x of r.inputs){
  const id=normalize(r,x.itemId,mode);all.add(id);
  if(!direct.has(id))direct.set(id,new Set());direct.get(id).add(r.sourceId);
  if(!tierUses.has(id))tierUses.set(id,new Set());tierUses.get(id).add(r.tier);
 }
 for(const p of procs){all.add(p.output);for(const id of Object.keys(p.inputs)){all.add(id);if(!processingConsumers.has(id))processingConsumers.set(id,new Set());processingConsumers.get(id).add(p.output);}}
 // Propagate tier usage through the graph from finished recipes, not source drop levels.
 for(let pass=0;pass<procs.length;pass++)for(const p of procs)for(const id of Object.keys(p.inputs)){
  if(!tierUses.has(id))tierUses.set(id,new Set());
  for(const t of tierUses.get(p.output)??[])tierUses.get(id).add(t);
 }
 // Explicit dormant optional source; never authorized merely by presence.
 all.add('EQ2_VERDANT_ESSENCE');
 return [...all].sort().map(id=>{
  const tiers=[...(tierUses.get(id)??[])].sort((a,b)=>a-b),p=process.get(id),s=sources.get(id)??[];
  const supported=s.some(x=>x.status==='INSPECTED_SOURCE_NOT_GRANT_VERIFIED'||(x.status==='INHERITED_SOURCE_REVIEW'&&x.sourceIds.length>0)||x.status==='NEW_SOURCE_CANDIDATE_NOT_REGISTERED'||(x.status==='V11_SOURCE_REVIEW'&&(x.sources?.length||x.source?.length||x.nodeId)));
  return {id,tiers,firstTier:tiers[0]??null,directRecipeCount:direct.get(id)?.size??0,processingConsumers:[...(processingConsumers.get(id)??[])].sort(),
   processingRecipe:p?.id??null,profession:p?.skill??null,professionLevel:p?.level??null,sourceEvidence:s,
   status:!tiers.length?'DORMANT_NO_RECIPE_CONSUMER':p?'PROCESSING_REVIEW_ONLY':supported?'SOURCE_REVIEW_ONLY':'SOURCE_GAP',
   grantVerified:false,sourceRegistered:false,...deny};
 });
}
function depth(id,procs,seen=new Set()){
 const p=procs.get(id);if(!p)return 0;if(seen.has(id))fail('cycle');
 return 1+Math.max(0,...Object.keys(p.inputs).map(x=>depth(x,procs,new Set([...seen,id]))));
}
export function fullBill(row,mode='reuse_candidate',smeltScenario='snapshot'){
 const procs=new Map(processingRegistry(mode,smeltScenario).map(x=>[x.output,x]));
 const order=[...procs.keys()].sort((a,b)=>depth(b,procs)-depth(a,procs));
 const demand={},batches={},leftovers={},seconds={},xp={},missingFees=[];
 let knownNominalGold=0;
 for(const x of row.inputs)add(demand,normalize(row,x.itemId,mode),x.candidate);
 for(const id of order){const q=demand[id]??0;if(!q)continue;delete demand[id];const p=procs.get(id),n=Math.ceil(q/p.quantity);
  add(batches,id,n);add(leftovers,id,n*p.quantity-q);add(seconds,p.skill,n*p.seconds);add(xp,p.skill,n*p.xp);
  if(Number.isFinite(p.gold))knownNominalGold+=n*p.gold;else missingFees.push(id);
  for(const [k,v] of Object.entries(p.inputs))add(demand,k,n*v);
 }
 return {sourceId:row.sourceId,tier:row.tier,mode,smeltScenario,raw:demand,batches,leftovers,seconds,xp,knownNominalGold,missingFees,
   finalForgeGold:row.candidateGold,finalForgeSeconds:row.seconds,totalCostComplete:false,sourceGrantVerified:false,...deny};
}
export function accessAudit(){
 const rows=sourceRoutes(),lookup=new Map(proposeComponentEconomy().map(x=>[x.sourceId,x])),catalog=new Map(materialCatalogue().map(x=>[x.id,x]));
 const result=[];
 for(const r of rows){const candidate=lookup.get(r.id);if(!candidate)fail('route');
  const bill=fullBill(candidate),levels=Object.keys(bill.batches).map(id=>catalog.get(id)).filter(Boolean);
  const t5Gate=r.tier===5?t5Gates.get(r.pieceId):null;
  const craftLevel=Number.isSafeInteger(r.professionLevel)?r.professionLevel:Number.isSafeInteger(t5Gate?.level)?t5Gate.level:null;
  const gaps=levels.filter(x=>craftLevel!==null&&x.professionLevel>craftLevel).map(x=>({id:x.id,level:x.professionLevel,skill:x.profession}));
  const sourceGaps=Object.keys(bill.raw).filter(id=>catalog.get(id)?.status==='SOURCE_GAP');
  const laterGatheringRequirements=Object.keys(bill.raw).flatMap(id=>{const s=catalog.get(id)?.sourceEvidence??[];const gates=s.filter(x=>x.kind==='gathering'&&Number.isSafeInteger(x.level??x.skillLevel));const first=gates.length?Math.min(...gates.map(x=>x.level??x.skillLevel)):null;return craftLevel!==null&&first!==null&&first>craftLevel?[{id,level:first}]:[];});
  result.push({sourceId:r.id,tier:r.tier,profession:r.profession??t5Gate?.profession??null,craftLevel,craftCombatLevelRequired:0,secondaryProfessionRequired:false,
   laterProcessingRequirements:gaps,laterGatheringRequirements,sourceGaps,procurement:'TRADE_OR_COMMISSION_REQUIRED_WHERE_NEEDED_NOT_VERIFIED',...deny});
 }
 return result;
}
export function summary(){
 const r=proposeComponentEconomy(),c=materialCatalogue(),a=accessAudit(),p=processingRegistry();
 const byTier=[1,2,3,4,5].map(tier=>({tier,routes:r.filter(x=>x.tier===tier).length,materials:c.filter(x=>x.tiers.includes(tier)).length,
   routesWithSourceGap:a.filter(x=>x.tier===tier&&x.sourceGaps.length).length,unknownCraftGate:a.filter(x=>x.tier===tier&&x.craftLevel===null).length}));
 return {materialCount:c.length,processingReferences:p.length,processingCandidateCount:p.filter(x=>!x.referenceOnly).length,duplicateBarReauthorCandidates:policy.identityReconciliation.length,
  routes:r.length,sourceGapIds:c.filter(x=>x.status==='SOURCE_GAP').map(x=>x.id),dormant:c.filter(x=>x.status==='DORMANT_NO_RECIPE_CONSUMER').map(x=>x.id),byTier,...deny};
}
