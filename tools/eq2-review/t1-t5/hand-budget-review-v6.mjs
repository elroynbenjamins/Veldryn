import {readFileSync} from 'node:fs';
import {capChannel} from './universal-affix-overlap-review-v4.mjs';
const read=p=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));
const d=read('../../../docs/2-0/eq2-equipment-power-review-v5.json');
const a=read('../../../docs/2-0/eq2-universal-affix-overlap-review-v4.json');
const items=new Map(d.items.map(x=>[x.itemId,x]));
const stats=a.stats,slots=Object.keys(d.basePolicy.slotBudget);
const modes=['baseline','extra_distinct_rolls','double_roll_magnitude','double_independent_lanes'];
const foci={focused_crit_damage:'critDamage',focused_defense:'armor',focused_healing:'healingPower'};
const deny={reviewOnly:true,mayMint:false,mayEquip:false,mayTrade:false,mayApplyEffects:false,cpApproved:false,releaseApproved:false};
const fail=x=>{throw Error('eq2_hand_review_'+x);};
const round=x=>Math.round(x*10000)/10000;
const select=(n,focus,idx)=>{
 const pool=stats.slice();
 return Array.from({length:n},(_,j)=>pool.splice(j===0&&focus?pool.findIndex(x=>x.id===focus):(idx+j)%pool.length,1)[0]);
};
export function inspectHandBudget({classId,tier,rarity,quality,focusMode='uniform_mid',mode='double_independent_lanes'}){
 const loadout=d.loadouts.find(x=>x.classId===classId&&x.tier===tier);
 const band=a.rarityBands.find(x=>x.rarity===rarity);
 if(!loadout||!band||![0,50,100].includes(quality)||!modes.includes(mode)||!d.scorePolicy.scenarios.includes(focusMode))fail('invalid_fixture');
 const pieces=loadout.itemIds.map(id=>items.get(id));
 const weapon=pieces.find(p=>p.slot==='weapon'),offhand=pieces.find(p=>p.slot==='offhand');
 if(!weapon||weapon.classId!==classId||weapon.hands!==loadout.hands||
    (weapon.hands==='one'?offhand?.classId!==classId:!!offhand)||
    new Set(pieces.map(p=>p.slot)).size!==pieces.length)fail('hand_contract');
 const count=band.counts[tier-1],focus=foci[focusMode],totals=new Map(stats.map(s=>[s.channel,0]));
 const rolls=[];let base=0;
 const val=s=>{const [lo,hi]=s.rangeCentipercent[tier-1];return lo+Math.round((hi-lo)*(band.lowBp+band.highBp)/20000);};
 for(const p of pieces){
  const b=d.basePolicy.slotBudget,combined=p.slot==='weapon'&&loadout.hands!=='one';
  const budget=(combined?b.weapon+b.offhand:b[p.slot])*tier*d.basePolicy.tierFactor*a.policy.baseRarityMultiplier[rarity]*(.75+quality*.005);
  const split=d.basePolicy.profileSplits[p.profile];
  base+=Math.round(budget*split[0]*100)/100+Math.round(budget*split[1]*100)/100+Math.round(budget*split[2]*400)/400;
  const add=(selection,lane,mult=1)=>{for(const s of selection){const original=val(s),value=original*mult;rolls.push({itemId:p.itemId,slot:p.slot,lane,stat:s.id,channel:s.channel,unit:s.unit,originalCentipercent:original,contributionCentipercent:value});totals.set(s.channel,totals.get(s.channel)+value);}};
  add(select(combined&&mode==='extra_distinct_rolls'?2*count:count,focus,slots.indexOf(p.slot)),0,combined&&mode==='double_roll_magnitude'?2:1);
  if(combined&&mode==='double_independent_lanes')add(select(count,focus,slots.indexOf('offhand')),1);
 }
 const channels=stats.map(s=>({channel:s.channel,raw:totals.get(s.channel),effective:capChannel(s.channel,totals.get(s.channel))}));
 const weighted=channels.reduce((n,x)=>n+x.effective/10000*d.scorePolicy.weights[x.channel],0);
 return {classId,tier,rarity,quality,focusMode,mode,hands:loadout.hands,slots:pieces.length,base:round(base),equipmentIndex:round(base*(1+weighted)),rolls,channels,...deny};
}
export function auditHandBudgets(){
 const rows=[];
 for(const l of d.loadouts)for(const b of a.rarityBands)for(const quality of [0,50,100])for(const focusMode of d.scorePolicy.scenarios)for(const mode of modes)
  rows.push(inspectHandBudget({classId:l.classId,tier:l.tier,rarity:b.rarity,quality,focusMode,mode}));
 const results=modes.map(mode=>{
  const groups=Object.values(Object.groupBy(rows.filter(x=>x.mode===mode),r=>[r.tier,r.rarity,r.quality,r.focusMode].join(':')));
  const mean=xs=>xs.reduce((n,x)=>n+x.equipmentIndex,0)/xs.length;
  const gaps=groups.map(g=>{const one=g.filter(x=>x.hands==='one'),two=g.filter(x=>x.hands!=='one');if(one.length!==4||two.length!==5)fail('coverage');return (mean(one)/mean(two)-1)*100;});
  return {mode,groups:groups.length,maxAbsoluteGapPct:round(Math.max(...gaps.map(Math.abs))),meanAbsoluteGapPct:round(gaps.reduce((n,x)=>n+Math.abs(x),0)/gaps.length),groupsOverFivePct:gaps.filter(x=>Math.abs(x)>5).length};
 });
 return {scenarioCount:rows.length,results,...deny};
}
