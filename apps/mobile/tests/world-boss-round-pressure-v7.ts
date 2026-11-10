/**
 * World Boss v7 TEST-ONLY pressure sweep.
 * Uses existing nine class kits at level 25, *not* production equipped stats.
 * Logs aggregate sensitivity only; no pass/fail damage target or live tuning.
 */
import {assert} from './test-assert';
import {launchPlayer} from '../../../backend/src/server/combat/content/launch-combat';
import {simulateWorldBossRounds,type WorldBossId,type WorldBossPhase} from '../../../backend/src/server/combat/world-boss-round-prototype';

const bosses:WorldBossId[]=['hollowroot','sunscar','frostmarch'];
const phases:WorldBossPhase[]=['armored','exposed','enraged'];
const pressureLevels=[1,1.5,2,2.5] as const;
const classNames=[
 ['Ironwarden','tank'],['Bastion','tank'],['Dreadguard','tank'],
 ['Wayfinder','damage'],['Ravager','damage'],['Hexweaver','damage'],
 ['Knife Dancer','damage'],['Dawnkeeper','support'],['Stonecaller','support'],
] as const;
function squad(initiator:string){
 const cls=classNames.find(c=>c[0]===initiator);if(!cls)throw Error('invalid_class');
 const need={tank:1,damage:2,support:1};need[cls[1]]--;
 const names=[initiator];
 for(const role of ['tank','damage','support'] as const){
  for(const [name,r] of classNames){
   if(role===r&&name!==initiator&&need[role]>0){names.push(name);need[role]--;}
  }
 }
 return names.map(name=>launchPlayer(name,25));
}
let cases=0;
for(const boss of bosses)for(const phase of phases)for(const pressure of pressureLevels){
 const rows=[] as {survived:boolean;damage:number;rounds:number;meanAlive:number}[];
 for(const [name] of classNames)for(let seed=0;seed<5;seed++){
  const result=simulateWorldBossRounds({
   boss,phase,pressure,players:squad(name),
   seed:'world-boss-pressure-v7:'+boss+':'+phase+':'+name+':'+pressure+':'+seed,
  });
  rows.push({
   survived:result.survived,
   damage:result.bossHpDamage,
   rounds:result.roundsCompleted,
   meanAlive:Object.values(result.participants).filter(p=>p.survived).length,
  });
  assert.ok(result.bossHpDamage>=0&&Number.isFinite(result.bossHpDamage),'real damage cannot be NaN');
  assert.ok(result.localGuardDamage>=0&&result.remainingGuard>=0,'local guard invariants');
  assert.ok(result.roundsCompleted>0&&result.roundsCompleted<=14,'fixed maximum fight length');
  cases++;
 }
 const mean=(values:number[])=>Math.round(values.reduce((a,b)=>a+b,0)/Math.max(1,values.length)*100)/100;
 console.log('WB_PRESSURE_V7='+JSON.stringify({
  boss,phase,pressure,fixtures:rows.length,
  survivedPct:mean(rows.map(x=>Number(x.survived)*100)),
  meanSquadDamage:mean(rows.map(x=>x.damage)),
  meanRounds:mean(rows.map(x=>x.rounds)),
  meanLivingActors:mean(rows.map(x=>x.meanAlive)),
  source:'launchPlayer level25 test-only kits; no live account snapshots'
 }));
}
assert.equal(cases,3*3*4*9*5,'full World Boss pressure sample grid');
console.log('WB_PRESSURE_METHOD_V7='+JSON.stringify({
 runs:cases,realPlayers:false,productionPressureApproved:false,rewardLedger:false,
 bossHPWrites:false,metric:'role and pressure sensitivity only'
}));
