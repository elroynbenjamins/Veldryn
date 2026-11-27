/** Hidden candidate economy model. Authored legacy rates are diagnostics, not telemetry.
 * No material grants, bonus currency or runtime reward policy. */
const flags={released:false,authorizesReward:false};
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const median=xs=>{const a=[...xs].sort((a,b)=>a-b),i=Math.floor(a.length/2);return a.length%2?a[i]:(a[i-1]+a[i])/2;};
const round10=n=>Math.round(n/10)*10;
export function regionalRewardReview(books,sideCatalogues,enemyRows,legacyBudget){
 if(!integer(legacyBudget)||legacyBudget===0||!Array.isArray(books)||!Array.isArray(sideCatalogues)||!Array.isArray(enemyRows))return {...flags,status:'unavailable'};
 const ids=new Set();
 for(const e of enemyRows){if(typeof e.id!=='string'||ids.has(e.id)||!integer(e.gold)||!integer(e.seconds)||!e.seconds)return {...flags,status:'unavailable',reason:'invalid_enemy_source'};ids.add(e.id);}
 const regions=['ASTERFALL','SUNSCAR','FROSTMARCH'];
 const rates={};
 for(const region of regions){
  const pool=enemyRows.filter(e=>e.regionId===region&&e.boss===false);
  if(!pool.length)return {...flags,status:'unavailable',reason:'missing_enemy_source'};
  rates[region]=median(pool.map(e=>60*e.gold/e.seconds));
 }
 if(!rates.ASTERFALL)return {...flags,status:'unavailable',reason:'zero_baseline'};
 const results=[];
 for(const region of regions){
  const b=books.find(x=>x.regionId===region),s=sideCatalogues.find(x=>x.regionId===region);
  if(!b||!s||b.released!==false||s.released!==false||!b.quests?.length||!s.quests?.length)return {...flags,status:'unavailable',reason:'missing_book'};
  const ratio=rates[region]/rates.ASTERFALL;
  // Conservative candidate envelope: no more than 2x/3x legacy baseline.
  const multiplier=region==='ASTERFALL'?1:Math.min(region==='SUNSCAR'?2:3,Math.max(1,ratio));
  const mainBudget=round10(legacyBudget*multiplier),sideBudget=round10(mainBudget*.2);
  const quests=[...b.quests,...(b.finale?[b.finale]:[])];
  const weights=quests.map((q,i)=>i===quests.length-1?5:i===quests.length-2?3:1+i/(quests.length-1));
  const totalWeight=weights.reduce((a,x)=>a+x,0);
  let remaining=mainBudget;
  const main=quests.map((q,i)=>{const gold=i===quests.length-1?remaining:round10(mainBudget*weights[i]/totalWeight);remaining-=gold;return {questId:q.id,candidateGold:gold,pendingBinding:q.bindingStatus==='pending_authoritative_solo_boss_id',...flags};});
  const perSide=round10(sideBudget/s.quests.length);
  const side=s.quests.map((q,i)=>({questId:q.id,candidateGold:i===s.quests.length-1?sideBudget-perSide*(s.quests.length-1):perSide,...flags}));
  if([...main,...side].some(r=>!integer(r.candidateGold)))return {...flags,status:'unavailable',reason:'invalid_distribution'};
  results.push({regionId:region,nominalMedianGoldPerMinute:rates[region],multiplier,mainBudget,sideBudget,main,side,...flags});
 }
 return {...flags,status:'review',regions:results,calibration:'legacy authored kill rate only; actual V2 rates and reward approval outstanding'};
}
