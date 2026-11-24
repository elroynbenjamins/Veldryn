import {readFileSync} from 'node:fs';
const load=p=>JSON.parse(readFileSync(new URL('../../../docs/'+p,import.meta.url),'utf8'));
const power=load('2-0/eq2-equipment-power-review-v5.json');
const affix=load('2-0/eq2-universal-affix-overlap-review-v4.json');
const recipes=load('equipment-2-0/t1-t4-48-set-unified-recipe-review-v3.json');
const t5=load('equipment-2-0/t5-catalogue-expansion-review-v4.json');
const deny={reviewOnly:true,mayCraft:false,mayMint:false,mayTrade:false,mayEquip:false,releaseApproved:false};
const fail=x=>{throw Error('eq2_hand_economy_review_'+x);};
const byId=new Map(power.items.map(x=>[x.itemId,x]));
const t5arms=new Map([...t5.armaments.weapons,...t5.armaments.offhands].map(x=>[x.itemId,x]));
const costs=(piece,route)=>{
 if(piece.tier<=4){
  const r=recipes.recipes.find(x=>x.pieceId===piece.itemId&&x.route===route);
  if(!r||r.craftable!==false||r.mayMint!==false||r.craftCombatLevelRequired!==0)fail('source');
  return {gold:r.gold,seconds:r.seconds,inputs:r.inputs,sourceId:r.id};
 }
 const item=t5arms.get(piece.itemId),r=item?.recipeRoutes?.[route];
 if(!r||item.sourceStatus!=='UNREGISTERED_REVIEW_ONLY')fail('source');
 return {gold:r.gold,seconds:r.queueSeconds,inputs:Object.entries(r).filter(([k])=>!['gold','queueSeconds','recipeFailureChance'].includes(k)).map(([itemId,quantity])=>({itemId,quantity})),sourceId:piece.itemId+':'+route};
};
function findArm(classId,tier,slot){
 const p=power.items.find(x=>x.classId===classId&&x.tier===tier&&x.slot===slot);
 if(!p)fail('armament');return byId.get(p.itemId);
}
export function compareRecipeBudgets(){
 const rows=[];
 for(let tier=1;tier<=5;tier++)for(const [classId,c] of Object.entries(power.classes).filter(([,v])=>v.hands!=='one'))
  for(const [referenceClass,o] of Object.entries(power.classes).filter(([,v])=>v.hands==='one'&&v.role===c.role))
   for(const route of ['foundation','alternate']){
    const combined=costs(findArm(classId,tier,'weapon'),route);
    const weapon=costs(findArm(referenceClass,tier,'weapon'),route);
    const offhand=costs(findArm(referenceClass,tier,'offhand'),route);
    const pairGold=weapon.gold+offhand.gold,pairSeconds=weapon.seconds+offhand.seconds;
    rows.push({tier,classId,referenceClass,route,combined,weapon,offhand,pairGold,pairSeconds,
      goldRatio:combined.gold/pairGold,timeRatio:combined.seconds/pairSeconds,...deny});
   }
 return rows;
}
export function rarityBudget(rarity){
 const band=affix.rarityBands.find(x=>x.rarity===rarity);
 if(!band)fail('rarity');
 // Exactly target rarity, not "target or better". Independent one-hand
 // outcomes allow each successful piece to be retained, never rerolled.
 const p=band.buckets/1000000;
 return {rarity,probability:p,sharedGradeSuccess:p,independentSameCraftJointSuccess:p*p,
  separateLaneExpectedTotalCrafts:2/p,sharedGradeExpectedCrafts:1/p,
  independentSameCraftExpectedCrafts:1/(p*p),
  // Candidate one-time assembly of two retained material-lane receipts.
  // At matched per-lane cost, identical expected lane attempts as two items.
  assemblyExpectedLaneCrafts:2/p,assemblyExtraCost:'UNSET',...deny};
}
export function proposeHandCostTargets(){
 const rows=compareRecipeBudgets(),out=[];
 for(const [key,group] of Object.entries(Object.groupBy(rows,r=>[r.tier,r.classId,r.route].join(':')))){
  const r=group[0],mean=k=>group.reduce((n,x)=>n+x[k],0)/group.length;
  const totalGold=Math.ceil(mean('pairGold')/100)*100;
  const totalSeconds=Math.ceil(mean('pairSeconds')/10)*10;
  const firstGold=Math.round(totalGold*9/19/100)*100,firstSeconds=Math.round(totalSeconds*9/19/10)*10;
  out.push({key,tier:r.tier,classId:r.classId,route:r.route,referenceClasses:group.map(x=>x.referenceClass),
    existingGold:r.combined.gold,existingSeconds:r.combined.seconds,totalGoldCandidate:totalGold,totalSecondsCandidate:totalSeconds,
    lanes:[{id:'primary',goldCandidate:firstGold,secondsCandidate:firstSeconds},{id:'secondary',goldCandidate:totalGold-firstGold,secondsCandidate:totalSeconds-firstSeconds}],
    materialRequirements:'OPEN_REAUTHOR_EXACT_SOURCE_PARITY_NO_AUTOMATIC_COPY',assemblyRequirements:'OPEN_NO_REROLL_NO_DISASSEMBLY',...deny});
 }
 return out;
}
export function summarizeHandEconomy(){
 const rows=compareRecipeBudgets(),targets=proposeHandCostTargets();
 return {comparisons:rows.length,targets:targets.length,
  goldRatioRange:[Math.min(...rows.map(x=>x.goldRatio)),Math.max(...rows.map(x=>x.goldRatio))],
  queueRatioRange:[Math.min(...rows.map(x=>x.timeRatio)),Math.max(...rows.map(x=>x.timeRatio))],
  mythic:rarityBudget('mythic'),...deny};
}
