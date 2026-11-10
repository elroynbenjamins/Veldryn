/** World Boss v8 role Impact preview tests, deliberately not connected to Sigil grants. */
import {assert} from './test-assert';
import {launchPlayer} from '../../../backend/src/server/combat/content/launch-combat';
import {simulateWorldBossRounds,type WorldBossId,type WorldBossPhase,type WorldBossRoundResult} from '../../../backend/src/server/combat/world-boss-round-prototype';
import {previewWorldBossImpactPrototype,previewWorldBossMilestonesPrototype,type WorldBossImpactReferencePrototype} from '../../../backend/src/server/combat/world-boss-impact-prototype';
import type {CombatantDefinition} from '../../../backend/src/server/combat/types';

const classes=['Ironwarden','Bastion','Dreadguard','Wayfinder','Ravager','Hexweaver','Knife Dancer','Dawnkeeper','Stonecaller'];
const bosses:WorldBossId[]=['hollowroot','sunscar','frostmarch'];
const phases:WorldBossPhase[]=['armored','exposed','enraged'];
function squad(init:string):CombatantDefinition[]{
 const starter=launchPlayer(init);
 const need={tank:1,damage:2,support:1};if(starter.role==='enemy')throw Error('no_enemy_initiator');
 need[starter.role]--;
 const selected=[starter];
 for(const role of ['tank','damage','support'] as const)for(const name of classes){
  const c=launchPlayer(name);
  if(c.role===role&&name!==init&&need[role]>0){selected.push(c);need[role]--;}
 }
 assert.equal(selected.length,4);
 return selected;
}
function baseline(result:WorldBossRoundResult,initiator:string):WorldBossImpactReferencePrototype{
 const ledger=result.participants['P_'+initiator];
 const cls=launchPlayer(initiator);
 if(cls.role==='enemy')throw Error('invalid');
 return {version:'test-benchmark-not-approved',boss:result.boss,phase:result.phase,role:cls.role,
  bracket:2,classId:initiator,samples:100,
  damage:ledger.bossHpDamage,
  guard:ledger.guardDamage,
  sustain:ledger.effectiveHealing+ledger.shieldConsumed,
  protection:ledger.tankProtection,
  utility:ledger.cleansePrevented+ledger.interrupts};
}
function rejects(fn:()=>unknown,text:string):void{
 let matched=false;try{fn();}catch(e){matched=String(e).includes(text);}
 assert.ok(matched,'expected rejection: '+text);
}
let fixtures=0;
for(const boss of bosses)for(const phase of phases)for(const init of classes){
 const result=simulateWorldBossRounds({seed:'impact:'+boss+':'+phase+':'+init,players:squad(init),boss,phase});
 const role=launchPlayer(init).role;if(role==='enemy')throw Error('invalid');
 const bench=baseline(result,init);
 const preview=previewWorldBossImpactPrototype({
  result,initiatorActorId:'P_'+init,classId:init,role,bracket:2,benchmark:bench
 });
 assert.ok(preview.score>=0&&preview.score<=1.4,'score never exceeds per-attempt cap');
 assert.equal(preview.rewardEligible,false,'a preview can never mint Sigils');
 assert.equal(preview.benchmarkVersion,'test-benchmark-not-approved');
 const sum=Object.values(preview.breakdown).reduce((n,m)=>n+(m?.weightedPoints??0),0);
 assert.ok(Math.abs(preview.score-sum)<.0003,'score reconciles with role breakdown');
 assert.ok(Object.values(preview.breakdown).every(v=>v.actual>=0&&v.reference>0&&v.weightedPoints>=0),'meaningful real metric channels only');
 assert.equal(preview.classId,init);
 assert.equal(preview.role,role);
 fixtures++;
}
assert.equal(fixtures,81);
const test=simulateWorldBossRounds({
 boss:'hollowroot',phase:'armored',seed:'impact-validation',
 players:squad('Ironwarden')
});
const benchmark=baseline(test,'Ironwarden');
const valid={
 result:test,initiatorActorId:'P_Ironwarden',classId:'Ironwarden',
 role:'tank' as const,bracket:2 as const,benchmark
};
rejects(()=>previewWorldBossImpactPrototype({...valid,benchmark:{...benchmark,samples:3}}),'uncalibrated_reference');
rejects(()=>previewWorldBossImpactPrototype({...valid,benchmark:{...benchmark,phase:'exposed'}}),'uncalibrated_reference');
rejects(()=>previewWorldBossImpactPrototype({...valid,benchmark:{...benchmark,classId:'Bastion'}}),'uncalibrated_reference');
rejects(()=>previewWorldBossImpactPrototype({...valid,initiatorActorId:'P_NOBODY'}),'missing_initiator');
rejects(()=>previewWorldBossImpactPrototype({...valid,benchmark:{...benchmark,damage:-1}}),'invalid_benchmark_values');
rejects(()=>previewWorldBossImpactPrototype({...valid,benchmark:{...benchmark,damage:0}}),'invalid_benchmark_values');
const missing=previewWorldBossImpactPrototype({...valid,benchmark:{...benchmark,guard:0,protection:0,sustain:0}});
assert.ok(Object.keys(missing.breakdown).length>=2,'fallback channels remain available without fake guard or protection');

const empty=previewWorldBossMilestonesPrototype([]);
assert.deepEqual(empty.reached,[],'no attacks = no milestones');
assert.equal(empty.hypotheticalTotalMilestoneSigils,0);
const first=previewWorldBossMilestonesPrototype([.8]);
assert.deepEqual(first.reached.map(x=>x.threshold),[.8]);
const second=previewWorldBossMilestonesPrototype([.9,.9]);
assert.deepEqual(second.reached.map(x=>x.threshold),[.8,1.8]);
const third=previewWorldBossMilestonesPrototype([1,1,1]);
assert.deepEqual(third.reached.map(x=>x.threshold),[.8,1.8,3]);
assert.equal(third.hypotheticalTotalMilestoneSigils,30,'draft 5+10+15 total is not wallet credit');
assert.equal(third.rewardEligible,false);
rejects(()=>previewWorldBossMilestonesPrototype([1.4,1.4,1.4,1.4]),'invalid_event_scores');
rejects(()=>previewWorldBossMilestonesPrototype([-1]),'invalid_event_scores');
rejects(()=>previewWorldBossMilestonesPrototype([1.41]),'invalid_event_scores');

console.log('WB_IMPACT_PROTOTYPE='+JSON.stringify({
 fixtures,roleAware:true,maxPerAttempt:1.4,calibratedReferenceRequired:true,
 theoreticalMilestoneSigils:30,liveRewardsMinted:0,walletApi:false
}));
