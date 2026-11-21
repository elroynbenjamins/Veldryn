/**
 * Pure review-only paired gathering simulation for EQ2 T4.
 * Does not import game models, depend on device state or mutate player data.
 */
import {seededRng} from './eq2-drop-risk-v2.mjs';
const safeInt=(n,name,allowZero=false)=>{
  if(!Number.isSafeInteger(n)||n<(allowZero?0:1))throw Error('Invalid '+name+': '+n);
  return n;
};
const percentile=(sorted,p)=>sorted[Math.ceil(sorted.length*p)-1];
const quantiles=values=>{
  const sorted=[...values].sort((a,b)=>a-b);
  return {p50:percentile(sorted,.5),p90:percentile(sorted,.9),p95:percentile(sorted,.95)};
};
const toHours=(counts,seconds)=>Object.fromEntries(
  Object.entries(counts).map(([key,n])=>[key,Number((n*seconds/3600).toFixed(2))])
);
export function verifyGatheringScenario(scenario){
  if(!scenario||typeof scenario!=='object'||!scenario.id)throw Error('Missing scenario');
  safeInt(scenario.orePerAction,'orePerAction');
  safeInt(scenario.bonusDustMin,'bonusDustMin');
  safeInt(scenario.bonusDustMax,'bonusDustMax');
  if(scenario.bonusDustMax<scenario.bonusDustMin)throw Error('Invalid dust quantity range');
  if(!Number.isFinite(scenario.bonusDustChance)||scenario.bonusDustChance<0||scenario.bonusDustChance>1)throw Error('Invalid dust proc chance');
  if(!Number.isFinite(scenario.cycleSeconds)||scenario.cycleSeconds<=0)throw Error('Invalid cycleSeconds');
  return scenario;
}
export function simulateJointOreDust({
  scenario,requiredOre,requiredDust,trials=2048,seed=20261121,maxActions=100000
}){
  verifyGatheringScenario(scenario);
  safeInt(requiredOre,'requiredOre',true);
  safeInt(requiredDust,'requiredDust',true);
  safeInt(trials,'trials');
  safeInt(maxActions,'maxActions');
  if(trials<256||trials>100000)throw Error('Trials out of bounds');
  if(requiredDust>0&&scenario.bonusDustChance===0)throw Error('Dust cannot be acquired at this node');
  const rng=seededRng(seed);
  const actionCounts=[],dustSurplus=[],oreSurplus=[];
  for(let trial=0;trial<trials;trial++){
    let ore=0,dust=0,actions=0;
    while(ore<requiredOre||dust<requiredDust){
      if(actions>=maxActions)throw Error('Gathering simulation exceeded action ceiling');
      actions++;
      ore+=scenario.orePerAction;
      if(rng()<scenario.bonusDustChance){
        const n=scenario.bonusDustMax-scenario.bonusDustMin+1;
        dust+=scenario.bonusDustMin+Math.floor(rng()*n);
      }
    }
    actionCounts.push(actions);
    oreSurplus.push(ore-requiredOre);
    dustSurplus.push(dust-requiredDust);
  }
  const actionQuantiles=quantiles(actionCounts);
  return {
    trials,seed,requiredOre,requiredDust,scenarioId:scenario.id,
    expectedPrimaryOrePerHour:Number((scenario.orePerAction*3600/scenario.cycleSeconds).toFixed(2)),
    expectedSecondaryDustPerHour:Number((scenario.bonusDustChance*(scenario.bonusDustMin+scenario.bonusDustMax)/2*3600/scenario.cycleSeconds).toFixed(2)),
    actions:actionQuantiles,
    baseHours:toHours(actionQuantiles,scenario.cycleSeconds),
    surplusAtStop:{ore:quantiles(oreSurplus),dust:quantiles(dustSurplus)}
  };
}
