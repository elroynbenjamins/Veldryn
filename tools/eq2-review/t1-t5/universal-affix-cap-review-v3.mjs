import {readFileSync} from 'node:fs';
const load=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const catalogue=load('../../../docs/2-0/eq2-t1-t5-canonical-membership-reconciliation-v2.json');
export function createAffixReview(contract){
const stats=new Map(contract.stats.map(s=>[s.id,s]));
const byChannel=new Map(contract.stats.map(s=>[s.channel,s]));
const items=new Map(catalogue.entries.map(s=>[s.itemId,s]));
const fail=reason=>{throw Error('eq2_affix_review_'+reason);};
const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const draw=(rng,max)=>{const v=rng(max);if(!integer(v,0,max-1))fail('invalid_test_draw');return v;};
const bandFor=rarity=>contract.rarityBands.find(b=>b.rarity===rarity);
const noAuthority=Object.freeze({reviewOnly:true,mayMint:false,mayEquip:false,mayTrade:false,mayApplyEffects:false,releaseApproved:false});
const roundHalfUp=(n,d)=>Math.floor((n+Math.floor(d/2))/d);
function previewUniversalRoll(itemId,testDraw){
 const item=items.get(itemId);
 if(!item||typeof testDraw!=='function')fail('unknown_item_or_missing_test_draw');
 let cursor=0;
 const rarityDraw=draw(testDraw,1000000);
 const band=contract.rarityBands.find(b=>{cursor+=b.buckets;return rarityDraw<cursor;});
 const quality=Math.min(100,Math.floor(Math.pow(draw(testDraw,1000000)/1000000,1.25)*101));
 const pool=[...stats.keys()],affixes=[];
 for(let i=0;i<band.counts[item.tier-1];i++){
  const id=pool.splice(draw(testDraw,pool.length),1)[0],s=stats.get(id);
  const [min,max]=s.rangeCentipercent[item.tier-1];
  // Same band interpolation as original Forge, represented in integer
  // centipercent and rounded once. No quality/rarity multiplier afterward.
  const u=draw(testDraw,10001);
  const numerator=band.lowBp*10000+(band.highBp-band.lowBp)*u;
  const value=min+roundHalfUp((max-min)*numerator,100000000);
  const grade=roundHalfUp((value-min)*100,max-min);
  affixes.push({id,channel:s.channel,unit:s.unit,valueCentipercent:value,grade});
 }
 return {version:contract.policy.newRulesVersionCandidate,itemId,tier:item.tier,slot:item.slot,rarity:band.rarity,quality,
  baseMultiplier:contract.policy.baseRarityMultiplier[band.rarity]*(.75+quality*.005),affixes,...noAuthority};
}
function inspectReviewLoadout(rows){
 if(!Array.isArray(rows)||rows.length>10)fail('invalid_slot_count');
 const occupied=new Set(),seen=new Set();
 const totals=new Map(contract.stats.map(s=>[s.channel,0]));
 for(const row of rows){
  const item=items.get(row?.itemId),band=bandFor(row?.rarity);
  if(!item||!band||row.version!==contract.policy.newRulesVersionCandidate||row.tier!==item.tier||row.slot!==item.slot||
   !integer(row.quality,0,100)||!Array.isArray(row.affixes)||row.affixes.length!==band.counts[item.tier-1]||
   row.reviewOnly!==true||row.mayMint!==false||row.mayEquip!==false||row.mayTrade!==false||row.mayApplyEffects!==false||row.releaseApproved!==false)
   fail('invalid_review_roll');
  if(occupied.has(item.slot)||seen.has(item.itemId))fail('duplicate_slot_or_item');
  occupied.add(item.slot);seen.add(item.itemId);
  if(Math.abs(row.baseMultiplier-contract.policy.baseRarityMultiplier[row.rarity]*(.75+row.quality*.005))>1e-9||!Number.isFinite(row.baseMultiplier))
   fail('base_multiplier_mismatch');
  const affixIds=new Set();
  for(const roll of row.affixes){
   const s=stats.get(roll?.id);
   if(!s||affixIds.has(roll.id)||roll.channel!==s.channel||roll.unit!==s.unit)fail('invalid_affix_identity');
   affixIds.add(roll.id);
   const [min,max]=s.rangeCentipercent[item.tier-1];
   const lo=min+roundHalfUp((max-min)*band.lowBp,10000),hi=min+roundHalfUp((max-min)*band.highBp,10000);
   if(!integer(roll.valueCentipercent,lo,hi)||roll.grade!==roundHalfUp((roll.valueCentipercent-min)*100,max-min))fail('invalid_affix_magnitude');
   totals.set(s.channel,totals.get(s.channel)+roll.valueCentipercent);
  }
  // Never accept caller-supplied innate values. Catalogue source proposals
  // are not a finalized innate table. This preview intentionally excludes them.
  if(Object.hasOwn(row,'innate')||Object.hasOwn(row,'innateStats'))fail('unapproved_innate_input');
 }
 const channels=contract.stats.map(s=>{
  const raw=totals.get(s.channel),effective=capChannel(s.channel,raw);
  return {channel:s.channel,unit:s.unit,rawCentipercent:raw,effectiveCentipercent:effective,excessCentipercent:raw-effective};
 });
 return {channels,slots:occupied.size,scope:'RANDOM_AFFIX_ONLY_NO_INNATE_SET_GEM_OR_SKILL_VALUES',combatBalanceApproved:false,...noAuthority};
}
function capChannel(channel,raw){
 const s=byChannel.get(channel);
 if(!s||!integer(raw,0,1000000))fail('invalid_cap_input');
 return Math.min(s.hardCapCentipercent,raw<=s.softKneeCentipercent?raw:s.softKneeCentipercent+Math.floor((raw-s.softKneeCentipercent)/2));
}

return Object.freeze({previewUniversalRoll,inspectReviewLoadout,capChannel});
}
const v3=createAffixReview(load('../../../docs/2-0/eq2-universal-affix-cap-review-v3.json'));
export const {previewUniversalRoll,inspectReviewLoadout,capChannel}=v3;
