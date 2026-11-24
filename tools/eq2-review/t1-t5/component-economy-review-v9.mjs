import {readFileSync} from 'node:fs';
const read=p=>JSON.parse(readFileSync(new URL('../../../docs/'+p,import.meta.url),'utf8'));
const catalogue=read('2-0/eq2-t1-t5-canonical-membership-reconciliation-v2.json');
const old=read('equipment-2-0/t1-t4-48-set-unified-recipe-review-v3.json');
const replacement=read('2-0/eq2-t4-replacement-recipe-review-v2.json');
const t5=read('equipment-2-0/t5-catalogue-expansion-review-v4.json');
const rare=read('equipment-2-0/t5-rare-set-catalogue-review-v1.json');
const items=new Map(catalogue.entries.map(x=>[x.itemId,x]));
const retired=new Set(catalogue.retired.items.flatMap(x=>x.retiredRecipeIds));
const refined=new Set([...old.processingReview.map(x=>x.output),'froststeelIngots','frostwoodPlanks','frostweaveCloth','hardenedFrostleather']);
const advanced=new Set(['frostmailLinks','smokeglassPlates','bloodtemperedSteel']);
const binders=new Set(['VERDANT_BINDING_RESIN','IRONWOOD_BINDING_RESIN','SUNSCAR_DUNE_BINDER','GLASSBOUND_BINDER','bindingResin']);
const combat=new Set(['EQ2_GLASSBOUND_PLATE','EQ2_BOAR_TUSK','EQ2_GLASSHEART_FRAGMENT','EQ2_MIRAGEFANG_CORE','EQ2_SUNSCAR_SCALE','EQ2_TROLL_SINEW','IRONWOOD_FANG','rimeboneShards','iceveinSigils','shardhearts','dawnspireCores','fortressCores','temperedHearts']);
const otherPreserved=new Set(['AMBERGLASS','EQ2_GLASSBOUND_SHARD','EQ2_RIVERSTONE','EQ2_THORNSTONE']);
const noAuthority={reviewOnly:true,mayCraft:false,mayMint:false,mayTrade:false,releaseApproved:false};
function classify(id){if(refined.has(id))return 'refined';if(advanced.has(id))return 'advanced';if(binders.has(id))return 'binder';if(combat.has(id))return 'preserved_source';if(otherPreserved.has(id))return 'preserved_other';throw Error('eq2_component_economy_unknown_input:'+id);}
function normalizeT5(item,route,r){
 const pieceId=item.itemId??item.id;
 if(typeof pieceId!=='string'||!pieceId)throw Error('eq2_component_economy_missing_piece_id');
 const inputs=Object.entries(r).filter(([key])=>!['gold','queueSeconds','recipeFailureChance'].includes(key)).flatMap(([itemId,quantity])=>{
  classify(itemId);
  if(quantity===0&&itemId==='frostwoodPlanks')return []; // explicit optional wood on source accessories
  if(!Number.isSafeInteger(quantity)||quantity<1)throw Error('eq2_component_economy_invalid_quantity:'+itemId);
  return [{itemId,quantity}];
 });
 return {id:pieceId+':'+route,pieceId,tier:5,route,gold:r.gold,seconds:r.queueSeconds,xp:null,inputs};
}
export function sourceRoutes(){
 const current=[...old.recipes.filter(x=>!retired.has(x.id)),...replacement.routes];
 for(const item of [...t5.standardSets,...t5.proposedRareSets,...t5.twoPieceComboSets].flatMap(s=>s.members).concat(t5.armaments.weapons,t5.armaments.offhands)){
  for(const [route,r] of Object.entries(item.craftingRoutes??item.recipeRoutes))current.push(normalizeT5(item,route,r));
 }
 for(const item of rare.sets.flatMap(s=>s.members))current.push(normalizeT5(item,'inherited',item.recipe));
 return current;
}
export function proposeComponentEconomy(){
 return sourceRoutes().map(r=>{
  const item=items.get(r.pieceId);
  if(!item||item.tier!==r.tier||item.bossName||item.dungeonId||!Number.isFinite(r.gold)||r.gold<=0)throw Error('eq2_component_economy_invalid_source');
  const inputs=r.inputs.map(x=>{
   const kind=classify(x.itemId),q=x.quantity;
   if(!Number.isSafeInteger(q)||q<1)throw Error('eq2_component_economy_invalid_quantity');
   const candidate=kind==='refined'?Math.ceil(q*1.2):kind==='advanced'?Math.ceil(q*1.25):kind==='binder'&&r.tier>=2?q+1:q;
   return {itemId:x.itemId,kind,previous:q,candidate};
  });
  return {sourceId:r.id,itemId:r.pieceId,tier:r.tier,route:r.route,previousGold:r.gold,candidateGold:Math.min(r.gold,Math.max(100,Math.round(r.gold*.7/100)*100)),seconds:r.seconds,xp:r.xp??null,inputs,combinedHandBudget:'SEPARATE_V8_PARITY_GATE_NOT_RESOLVED',...noAuthority};
 });
}
export function summarizeComponentEconomy(){
 const rows=proposeComponentEconomy();
 return {routes:rows.length,items:new Set(rows.map(x=>x.itemId)).size,byTier:[1,2,3,4,5].map(tier=>{
  const r=rows.filter(x=>x.tier===tier),sum=k=>r.reduce((n,x)=>n+x[k],0);
  const byKind=Object.fromEntries(['refined','advanced','binder','preserved_source','preserved_other'].map(kind=>[kind,r.flatMap(x=>x.inputs).filter(x=>x.kind===kind).reduce((n,x)=>({previous:n.previous+x.previous,candidate:n.candidate+x.candidate}),{previous:0,candidate:0})]));
  return {tier,routes:r.length,previousGold:sum('previousGold'),candidateGold:sum('candidateGold'),byKind};
 }),...noAuthority};
}
