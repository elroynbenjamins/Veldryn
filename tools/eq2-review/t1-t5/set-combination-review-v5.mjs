import {readFileSync} from 'node:fs';
const data=JSON.parse(readFileSync(new URL('../../../docs/2-0/eq2-t1-t5-canonical-membership-reconciliation-v2.json',import.meta.url),'utf8'));
const slots=['helmet','chest','gloves','legs','boots','cape','amulet','ring'];
const itemById=new Map(data.entries.map(x=>[x.itemId,x]));
const bit=slot=>{const i=slots.indexOf(slot);if(i<0)throw Error('eq2_set_review_unsupported_slot');return 1<<i;};
const combinations=(xs,n,start=0,selected=[])=>{
 if(n===0)return [selected];
 const out=[];for(let i=start;i<=xs.length-n;i++)out.push(...combinations(xs,n-1,i+1,[...selected,xs[i]]));return out;
};
const options=new Map(data.sets.map(s=>{
 const ms=s.memberIds.map(id=>{const item=itemById.get(id);if(!item||item.setId!==s.setId||item.tier!==s.tier)throw Error('eq2_set_review_source_mismatch');return {id,slot:item.slot};});
 if(new Set(ms.map(m=>m.slot)).size!==ms.length)throw Error('eq2_set_review_duplicate_slot');
 return [s.setId,s.reconciliation.thresholds.map(n=>({threshold:n,choices:combinations(ms,n).map(xs=>({mask:xs.reduce((v,m)=>v|bit(m.slot),0),items:xs.map(m=>m.id)}))}))];
}));
const setById=new Map(data.sets.map(s=>[s.setId,s]));
const deny={reviewOnly:true,mayApplyEffects:false,cpApproved:false,mayEquip:false,mayMint:false,releaseApproved:false};
export function findSetCombination(requests){
 if(!Array.isArray(requests)||requests.length<1||requests.length>4)throw Error('eq2_set_review_invalid_request');
 const ids=new Set(),groups=[];let tier=null;
 for(const r of requests){
  const s=setById.get(r?.setId);
  if(!s||ids.has(s.setId))throw Error('eq2_set_review_unknown_or_duplicate_set');
  if(tier!==null&&s.tier!==tier)throw Error('eq2_set_review_cross_tier_not_benchmarked');
  tier=s.tier;ids.add(s.setId);
  const g=options.get(s.setId).find(x=>x.threshold===r.threshold);
  if(!g)throw Error('eq2_set_review_invalid_threshold');
  groups.push(g.choices);
 }
 function search(i,mask,selected){
  if(i===groups.length)return selected;
  for(const c of groups[i])if(!(mask&c.mask)){
   const result=search(i+1,mask|c.mask,[...selected,...c.items]);
   if(result)return result;
  }
  return null;
 }
 const witness=search(0,0,[]);
 return {tier,possible:!!witness,itemIds:witness??[],reason:witness?'EXACT_DISJOINT_SOURCE_SLOTS':'NO_DISJOINT_SOURCE_SLOTS',...deny};
}
export function auditSetCombinations(){
 const byTier=[];
 for(let tier=1;tier<=5;tier++){
  const sets=data.sets.filter(x=>x.tier===tier);
  let pairChecks=0,pairPossible=0,tripleChecks=0,triplePossible=0,fullPairChecks=0,fullPairPossible=0;
  const samples=[];
  for(let i=0;i<sets.length;i++)for(let j=i+1;j<sets.length;j++){
   const a=sets[i],b=sets[j];
   const req=[{setId:a.setId,threshold:2},{setId:b.setId,threshold:2}];
   pairChecks++;const p=findSetCombination(req);if(p.possible)pairPossible++;
   if(a.itemCount+b.itemCount<=8){
    fullPairChecks++;const q=findSetCombination([{setId:a.setId,threshold:a.itemCount},{setId:b.setId,threshold:b.itemCount}]);
    if(q.possible){fullPairPossible++;if(samples.length<3)samples.push({setIds:[a.setId,b.setId],itemIds:q.itemIds});}
   }
   for(let k=j+1;k<sets.length;k++){
    tripleChecks++;
    if(findSetCombination([...req,{setId:sets[k].setId,threshold:2}]).possible)triplePossible++;
   }
  }
  byTier.push({tier,setCount:sets.length,pairChecks,pairPossible,tripleChecks,triplePossible,fullPairChecks,fullPairPossible,samples});
 }
 return {byTier,...deny};
}
