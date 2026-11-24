import {readFileSync} from 'node:fs';
import {index,reviewCatalog} from './consolidated-economy-review-v14.mjs';
import {capChannel} from './universal-affix-overlap-review-v4.mjs';
const read=p=>JSON.parse(readFileSync(new URL('../../../docs/2-0/'+p,import.meta.url),'utf8'));
const d=read('eq2-equipment-power-review-v5.json'),a=read('eq2-universal-affix-overlap-review-v4.json'),p=read('eq2-innate-and-set-budget-review-v7.json');
const items=new Map(d.items.map(x=>[x.itemId,x])),premium=new Map(p.entries.map(x=>[x.itemId,x]));
const stats=new Map(a.stats.map(x=>[x.channel,x])),bands=new Map(a.rarityBands.map(x=>[x.rarity,x]));
const slots=Object.keys(d.basePolicy.slotBudget);
const deny=Object.freeze({reviewOnly:true,cpApproved:false,mayCraft:false,mayMint:false,mayDrop:false,mayEquip:false,mayTrade:false,mayApplyEffects:false,releaseApproved:false});
const fail=x=>{throw Error('eq2_power_v15_'+x);};
const round=x=>Math.round(x*10000)/10000;
const sum=xs=>xs.reduce((n,x)=>n+x,0);
export const contract=Object.freeze({
 name:'EQ2_PARTIAL_POWER_INDEX_V15_NOT_PLAYER_CP',hpPerPoint:d.basePolicy.hpPerPoint,tierFactor:d.basePolicy.tierFactor,
 weights:d.scorePolicy.weights,slotBudget:d.basePolicy.slotBudget,
 formula:'baseEquivalent * (1 + sum(cappedPermanentGearFraction * channelWeight))',
 qualityAndRarity:'BASE_ONLY_ONCE_PER_LANE',cap:'V4_SHARED_PERMANENT_CHANNEL_ONCE',
 missingSemantics:'EXPLICIT_UNPRICED_BLOCK_FINAL_CP',tier6To9:'UNDEFINED',...deny});
const focuses={uniform_mid:null,focused_crit_damage:'critDamage',focused_defense:'armor',focused_healing:'healingPower'};
function laneRoll(tier,slot,grade,quality,focus,endpoint){
 const band=bands.get(grade);
 if(!band||!Number.isInteger(quality)||quality<0||quality>100||!Object.hasOwn(focuses,focus)||!['low','mid','high'].includes(endpoint))fail('lane_args');
 const pool=[...a.stats],n=band.counts[tier-1],bp=endpoint==='low'?band.lowBp:endpoint==='high'?band.highBp:Math.round((band.lowBp+band.highBp)/2);
 const selected=[];
 for(let j=0;j<n;j++){
  const i=j===0&&focuses[focus]?pool.findIndex(s=>s.id===focuses[focus]):(slots.indexOf(slot)+j)%pool.length;
  const s=pool.splice(i,1)[0],[lo,hi]=s.rangeCentipercent[tier-1];
  selected.push({stat:s.id,channel:s.channel,unit:s.unit,centipercent:lo+Math.round((hi-lo)*bp/10000)});
 }
 return {grade,quality,rolls:selected,baseMultiplier:a.policy.baseRarityMultiplier[grade]*(.75+quality*.005)};
}
// All inputs are hypothetical fixtures, never actual copies, receipts, RNG or gameplay values.
export function inspectPower({classId,tier,grade='rare',quality=50,focus='uniform_mid',endpoint='mid',secondaryGrade=grade,secondaryQuality=quality}){
 const l=d.loadouts.find(x=>x.classId===classId&&x.tier===tier);
 if(!l)fail('loadout');
 const pieces=l.itemIds.map(id=>items.get(id));
 if(!pieces.every(Boolean)||new Set(pieces.map(x=>x.slot)).size!==pieces.length||pieces.some(x=>x.tier!==tier||(x.classId&&x.classId!==classId)))fail('slot');
 const weapon=pieces.find(x=>x.slot==='weapon'),offhand=pieces.find(x=>x.slot==='offhand');
 if(!weapon||weapon.hands!==l.hands||(l.hands==='one'?offhand?.classId!==classId:!!offhand))fail('hand_contract');
 const raw=new Map(a.stats.map(s=>[s.channel,0])),baseStats={attack:0,defense:0,hp:0},lanes=[],unpriced=[];
 for(const item of pieces){
  const combined=item.slot==='weapon'&&l.hands!=='one';
  for(const laneSlot of combined?['weapon','offhand']:[item.slot]){
   const secondary=laneSlot==='offhand';
   const lane=laneRoll(tier,laneSlot,secondary?secondaryGrade:grade,secondary?secondaryQuality:quality,focus,endpoint);
   const budget=contract.slotBudget[laneSlot]*tier*contract.tierFactor*lane.baseMultiplier;
   const split=d.basePolicy.profileSplits[item.profile];if(!split)fail('profile');
   baseStats.attack+=budget*split[0];baseStats.defense+=budget*split[1];baseStats.hp+=budget*split[2]*contract.hpPerPoint;
   for(const s of lane.rolls)raw.set(s.channel,raw.get(s.channel)+s.centipercent);
   lanes.push({itemId:item.itemId,slot:laneSlot,grade:lane.grade,quality:lane.quality,rolls:lane.rolls,budget:round(budget)});
  }
  const extra=premium.get(item.itemId);
  if(extra){
   for(const s of extra.innates){
    if(s.mapping==='EXACT_SHARED_CHANNEL'&&stats.has(s.canonicalChannel))raw.set(s.canonicalChannel,raw.get(s.canonicalChannel)+s.centipercent);
    else unpriced.push({itemId:item.itemId,stat:s.stat});
   }
   if(extra.trait)unpriced.push({itemId:item.itemId,stat:'signature_trait'});
  }
 }
 if(lanes.length!==10||new Set(lanes.map(x=>x.slot)).size!==10)fail('budget_slots');
 const channels=[...raw].map(([channel,value])=>({channel,rawCentipercent:value,effectiveCentipercent:capChannel(channel,value)}));
 const base=baseStats.attack+baseStats.defense+baseStats.hp/contract.hpPerPoint;
 const contribution=base*sum(channels.map(x=>x.effectiveCentipercent/10000*contract.weights[x.channel]));
 return {classId,tier,grade,quality,secondaryGrade,secondaryQuality,focus,endpoint,hands:l.hands,physicalPieces:pieces.length,budgetLanes:lanes.length,
  baseStats:Object.fromEntries(Object.entries(baseStats).map(([k,v])=>[k,round(v)])),base:round(base),permanentContribution:round(contribution),
  partialPower:round(base+contribution),channels,lanes,unpricedItemEffects:unpriced,unpricedDomains:['set_effects','gems','skills','class_progression','companions','temporary_effects','unresolved_innates'],...deny};
}
export function powerGrid(){
 const rows=[];
 for(const l of d.loadouts)for(const band of a.rarityBands)for(const quality of [0,50,100])for(const focus of Object.keys(focuses))for(const endpoint of ['low','mid','high'])
 rows.push(inspectPower({classId:l.classId,tier:l.tier,grade:band.rarity,quality,focus,endpoint}));
 return rows;
}
export function mixedHands(){
 const rows=[];
 for(const l of d.loadouts)for(const primary of a.rarityBands)for(const secondary of a.rarityBands)for(const [quality,secondaryQuality] of [[0,100],[50,50],[100,0]])
 rows.push(inspectPower({classId:l.classId,tier:l.tier,grade:primary.rarity,secondaryGrade:secondary.rarity,quality,secondaryQuality}));
 return rows;
}
export function premiumChannelAudit(){
 return p.entries.map(e=>({itemId:e.itemId,tier:e.tier,profiled:items.has(e.itemId),mapped:e.innates.filter(x=>x.mapping==='EXACT_SHARED_CHANNEL'&&stats.has(x.canonicalChannel)).map(x=>({channel:x.canonicalChannel,centipercent:x.centipercent})),unpriced:e.innates.filter(x=>x.mapping!=='EXACT_SHARED_CHANNEL'||!stats.has(x.canonicalChannel)).map(x=>x.stat),traitUnpriced:!!e.trait,...deny}));
}
export function scopeAudit(){
 const all=reviewCatalog(),profiled=all.filter(x=>items.has(x.itemId));
 return {catalogue:all.length,profiled:profiled.length,unprofiled:all.filter(x=>!items.has(x.itemId)).map(x=>x.itemId),premiumAudited:p.entries.length,premiumInBenchmarkFixtures:new Set(d.loadouts.flatMap(l=>l.itemIds).filter(id=>premium.has(id))).size,
  mappedInnates:p.summary.exactMapped,unresolvedInnates:p.summary.unresolved,traits:p.summary.traits,setsAudited:p.sets.length,
  setsOutsideAudit:index.expected.sets-p.sets.length,...deny};
}
export function summarizePower(){
 const rows=powerGrid(),mixed=mixedHands();
 const groups=Object.values(Object.groupBy(rows,x=>[x.tier,x.grade,x.quality,x.focus,x.endpoint].join(':')));
 const gaps=groups.map(g=>{
  const one=g.filter(x=>x.hands==='one'),other=g.filter(x=>x.hands!=='one');
  if(one.length!==4||other.length!==5)fail('group');
  const mean=xs=>sum(xs.map(x=>x.partialPower))/xs.length;
  return Math.abs(mean(one)/mean(other)-1)*100;
 });
 const progression=[1,2,3,4,5].map(tier=>{
  const g=rows.filter(x=>x.tier===tier&&x.quality===50&&x.focus==='uniform_mid'&&x.endpoint==='mid');
  return {tier,byRarity:a.rarityBands.map(b=>{const r=g.filter(x=>x.grade===b.rarity);return {rarity:b.rarity,mean:round(sum(r.map(x=>x.partialPower))/r.length)};})};
 });
 const comparisons=[];
 for(let tier=1;tier<5;tier++)for(const l of d.loadouts.filter(x=>x.tier===tier)){
  const lower=inspectPower({classId:l.classId,tier,grade:'mythic',quality:100,endpoint:'high'});
  const higher=inspectPower({classId:l.classId,tier:tier+1,grade:'common',quality:0,endpoint:'low'});
  comparisons.push({tier,classId:l.classId,lower:lower.partialPower,higher:higher.partialPower,lowerExceedsHigher:lower.partialPower>higher.partialPower});
 }
 return {scenarios:rows.length,mixedScenarios:mixed.length,groups:groups.length,maxHandGapPct:round(Math.max(...gaps)),progression,
  overlapComparisons:comparisons.length,lowerMythicExceedsHigherCommon:comparisons.filter(x=>x.lowerExceedsHigher).length,scope:scopeAudit(),...deny};
}
