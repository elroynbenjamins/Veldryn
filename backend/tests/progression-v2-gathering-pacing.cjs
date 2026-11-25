/**
 * Read-only V2 gathering XP pacing diagnostic based on actual mobile content.
 * Uses current gathering nodes as a baseline, NOT an authorization catalogue.
 * All nodes treated as accessible at their own profession level solely to
 * model the proposed future safe profession travel routes.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const source=fs.readFileSync(
  path.resolve(__dirname,'../../apps/mobile/src/content/skills.ts'),'utf8',
);
const start=source.indexOf('export const GATHERING:GatherDef[]=');
const end=source.indexOf("] as Omit<GatherDef",start);
assert.ok(start>=0&&end>start,'could not locate live gathering source');
const gatheringSource=source.slice(start,end);
const matcher=/\{id:'([^']+)',skillId:'([^']+)',name:'([^']+)',unlockLevel:(\d+),seconds:(\d+),xp:(\d+),itemId:'([^']+)'/g;
const nodes=[...gatheringSource.matchAll(matcher)].map(row=>{
  const level=Number(row[4]);
  const xpMultiplier=level>=15?1.45:level>=7?1.35:1;
  return {id:row[1],skillId:row[2],level,
    seconds:Math.ceil(Number(row[5])*2),
    xp:Math.round(Number(row[6])*xpMultiplier)};
});
assert.ok(nodes.length>=30,'audit assumes the existing live node catalog');
const checkpointLevels=[12,24,36,48,60,72,84,96,100];
function totalSecondsToLevel(skillId,targetLevel){
  let total=0;
  for(let level=1;level<targetLevel;level++){
    const eligible=nodes.filter(n=>n.skillId===skillId&&n.level<=level);
    assert.ok(eligible.length>0,'missing a safe training activity at level '+level+' for '+skillId);
    const fastest=eligible.reduce((best,candidate)=>
      !best||candidate.xp*best.seconds>best.xp*candidate.seconds?candidate:best,null);
    const requiredXp=150+45*level+8*level*level;
    total+=requiredXp*fastest.seconds/fastest.xp;
  }
  return total;
}
const output={};
for(const skill of ['mining','woodcutting','fishing']){
  const checkpoints={};
  let prior=0;
  for(const level of checkpointLevels){
    const hours=totalSecondsToLevel(skill,level)/3600;
    assert.ok(hours>prior && Number.isFinite(hours),'expected monotonically increasing hours');
    prior=hours;
    checkpoints[level]=Math.round(hours*10)/10;
  }
  assert.ok(checkpoints[96]>100&&checkpoints[96]<1000,'T9 ideal training needs balancing review');
  output[skill]=checkpoints;
}
console.log('PACING PREVIEW (hours, ideal node 24/7, no travel/combat/market/material restrictions):');
console.log(JSON.stringify(output));
console.log('PASS: baseline V2 gathering pace from current real source action data; NOT release thresholds');
