import {readFileSync} from 'node:fs';
import {previewUniversalRoll,inspectReviewLoadout} from './universal-affix-overlap-review-v4.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const d=read('../../../docs/2-0/eq2-equipment-power-review-v5.json');
const a=read('../../../docs/2-0/eq2-universal-affix-overlap-review-v4.json');
const items=new Map(d.items.map(x=>[x.itemId,x]));
const fail=x=>{throw Error('eq2_power_review_'+x);};
const round=n=>Math.round(n*10000)/10000;
const noAuthority=Object.freeze({reviewOnly:true,cpApproved:false,mayMint:false,mayEquip:false,mayApplyEffects:false,mayTrade:false,releaseApproved:false});
const qualityDraw=q=>{if(![0,50,100].includes(q))fail('quality');return Math.min(999999,Math.floor(Math.pow((q+.5)/101,.8)*1000000));};
function fixtureRoll(item,rarity,quality,mode,index){
 let offset=0;
 const band=a.rarityBands.find(b=>{if(b.rarity===rarity)return true;offset+=b.buckets;return false;});
 if(!band)fail('rarity');
 const focuses={focused_crit_damage:'critDamage',focused_defense:'armor',focused_healing:'healingPower'};
 if(!d.scorePolicy.scenarios.includes(mode))fail('scenario');
 let call=0;
 const rng=max=>{
  const i=call++;
  if(i===0)return offset+Math.floor(band.buckets/2);
  if(i===1)return qualityDraw(quality);
  if(i%2===1)return 5000;
  if(i===2&&focuses[mode])return a.stats.findIndex(x=>x.id===focuses[mode]);
  return (index+Math.floor(i/2)-1)%max;
 };
 return previewUniversalRoll(item.itemId,rng);
}
export function inspectEquipmentIndex({classId,tier,rarity,quality,mode='uniform_mid'}){
 const loadout=d.loadouts.find(x=>x.classId===classId&&x.tier===tier);
 if(!loadout)fail('unknown_class_tier');
 const character=d.classes[classId],pieces=loadout.itemIds.map(id=>items.get(id));
 const weapon=pieces.find(x=>x.slot==='weapon'),offhand=pieces.find(x=>x.slot==='offhand');
 if(!weapon||weapon.classId!==classId||weapon.hands!==character.hands||
    (character.hands==='one'?offhand?.classId!==classId:Boolean(offhand)))fail('hand_contract');
 if(new Set(pieces.map(x=>x.slot)).size!==pieces.length||pieces.some(x=>x.tier!==tier||(x.classId&&x.classId!==classId)))fail('slot_or_tier');
 const rolls=pieces.map((x,i)=>fixtureRoll(x,rarity,quality,mode,i));
 const preview=inspectReviewLoadout(rolls);
 const totals={attack:0,defense:0,hp:0};
 for(let i=0;i<pieces.length;i++){
  const p=pieces[i],r=rolls[i],b=d.basePolicy.slotBudget;
  const budget=(p.slot==='weapon'&&p.hands!=='one'?b.weapon+b.offhand:b[p.slot])*p.tier*d.basePolicy.tierFactor*r.baseMultiplier;
  const split=d.basePolicy.profileSplits[p.profile];
  if(!split)fail('missing_profile');
  totals.attack+=Math.round(budget*split[0]*100)/100;
  totals.defense+=Math.round(budget*split[1]*100)/100;
  totals.hp+=Math.round(budget*split[2]*d.basePolicy.hpPerPoint*100)/100;
 }
 const base=totals.attack+totals.defense+totals.hp/d.basePolicy.hpPerPoint;
 const weighted=preview.channels.reduce((n,c)=>{
  const weight=d.scorePolicy.weights[c.channel];
  if(!Number.isFinite(weight)||weight<0)fail('missing_weight');
  return n+c.effectiveCentipercent/10000*weight;
 },0);
 const randomCount=rolls.reduce((n,r)=>n+r.affixes.length,0);
 return {classId,tier,rarity,quality,mode,hands:character.hands,slots:pieces.length,randomCount,
  base:round(base),baseStats:Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,round(v)])),
  affixIndexContribution:round(base*weighted),equipmentIndex:round(base*(1+weighted)),
  rawWeightedAffixFraction:round(preview.channels.reduce((n,c)=>n+c.rawCentipercent/10000*d.scorePolicy.weights[c.channel],0)),
  effectiveWeightedAffixFraction:round(weighted),
  channels:preview.channels,itemIds:loadout.itemIds,unpriced:['innate','set','gem','skill','companion','class_level'],
  ...noAuthority};
}
export function benchmarkEquipmentIndex(){
 const rows=[];
 for(const l of d.loadouts)for(const b of a.rarityBands)for(const quality of d.scorePolicy.benchmarkQuality)for(const mode of d.scorePolicy.scenarios)
  rows.push(inspectEquipmentIndex({classId:l.classId,tier:l.tier,rarity:b.rarity,quality,mode}));
 return rows;
}
export function summarizeEquipmentIndex(rows){
 const groups=Object.groupBy(rows,r=>r.tier+':'+r.rarity+':'+r.quality+':'+r.mode);
 const spreads=Object.values(groups).map(g=>{
  const one=g.filter(r=>r.hands==='one'),two=g.filter(r=>r.hands!=='one');
  if(one.length!==4||two.length!==5)fail('benchmark_coverage');
  const mean=xs=>xs.reduce((n,x)=>n+x.equipmentIndex,0)/xs.length;
  const baseMin=Math.min(...g.map(r=>r.base)),baseMax=Math.max(...g.map(r=>r.base));
  return {tier:g[0].tier,rarity:g[0].rarity,quality:g[0].quality,mode:g[0].mode,
   oneHandMean:round(mean(one)),twoOrDualMean:round(mean(two)),
   handGapPct:round((mean(one)/mean(two)-1)*100),baseSpread:round(baseMax-baseMin),
   oneHandRollCount:one[0].randomCount,twoHandRollCount:two[0].randomCount};
 });
 return {scenarios:rows.length,groups:spreads.length,
  maxAbsoluteHandGapPct:round(Math.max(...spreads.map(x=>Math.abs(x.handGapPct)))),
  groupsExceedingCandidateTolerance:spreads.filter(x=>Math.abs(x.handGapPct)>d.scorePolicy.comparisonToleranceCandidatePct).length,
  t5MythicQ50:spreads.filter(x=>x.tier===5&&x.rarity==='mythic'&&x.quality===50),
  ...noAuthority};
}
