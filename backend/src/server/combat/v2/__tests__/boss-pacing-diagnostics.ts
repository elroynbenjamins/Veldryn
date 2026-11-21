import {strict as assert} from 'node:assert';
import type {CombatEvent,CombatResult} from '../../types';
import {
 observeBossPacingV2,aggregateBossPacingV2,
 type AuthoredBossPacingContractV2,
} from '../boss-pacing-diagnostics';

const contract:AuthoredBossPacingContractV2={
 bossId:'BOSS_EXP_SOLAR',classId:'IRONWARDEN',specId:'IRONWARDEN_DEFENDER',
 casts:[{abilityId:'SOLAR_V2_SUNFALL',castMs:1400,interruptible:true}],
 phases:[
  {phaseId:'SOLAR_V2_PHASE_70',hpPercent:70},
  {phaseId:'SOLAR_V2_PHASE_35',hpPercent:35},
 ],
};
const start:CombatEvent={atMs:1000,type:'cast_start',
 actorId:contract.bossId,abilityId:contract.casts[0].abilityId};
const complete:CombatEvent={atMs:2400,type:'cast_complete',
 actorId:contract.bossId,abilityId:contract.casts[0].abilityId};
const phase70:CombatEvent={atMs:3000,type:'phase',
 actorId:contract.bossId,abilityId:contract.phases[0].phaseId};
const phase35:CombatEvent={atMs:4000,type:'phase',
 actorId:contract.bossId,abilityId:contract.phases[1].phaseId};
const terminal=(ms:number,reason:'victory'|'wipe'|'timeout'):CombatEvent=>({
 atMs:ms,type:'combat_end',detail:reason,
});
const sample=(
 events:CombatEvent[],
 reason:'victory'|'wipe'|'timeout'='victory',
 durationMs=5000,
):CombatResult=>({
 victory:reason==='victory',reason,durationMs,events,
 players:[{definition:{id:'QA_PLAYER',stats:{maxHp:100}},
  hp:reason==='wipe'?0:70}],
 enemies:[{definition:{id:contract.bossId,boss:true,stats:{maxHp:1000}},
  hp:reason==='victory'?0:500}],
}) as unknown as CombatResult;
const valid=sample([start,complete,phase70,phase35,terminal(5000,'victory')]);
const obs=observeBossPacingV2(contract,valid);
assert.equal(obs.firstCastAtMs,1000);
assert.deepEqual(obs.completedCastWindupMs,[1400]);
assert.equal(obs.castsStarted,1);
assert.equal(obs.castsCompleted,1);
assert.equal(obs.castsInterrupted,0);
assert.equal(obs.castsUnresolvedAtEnd,0);
assert.equal(obs.phase70AtMs,3000);
assert.equal(obs.phase35AtMs,4000);
assert.equal(obs.playerHpPercent,70);
assert.equal(obs.bossHpPercent,0);
assert.deepEqual(obs.warnings,[]);
const identical=observeBossPacingV2(contract,valid);
assert.deepEqual(identical,obs,'Repeated immutable replay must be deterministic');

const interrupted=sample([start,{
 atMs:1800,type:'interrupt',actorId:'QA_PLAYER',targetId:contract.bossId,
 interruptedAbilityId:'SOLAR_V2_SUNFALL',
},terminal(2500,'wipe')],'wipe',2500);
const interruptedObs=observeBossPacingV2(contract,interrupted);
assert.equal(interruptedObs.castsInterrupted,1);
assert.equal(interruptedObs.castsCompleted,0);
assert.deepEqual(interruptedObs.warnings,
 ['no_authored_phase','no_completed_threat']);
const pending=sample([start,terminal(2000,'timeout')],'timeout',2000);
assert.equal(observeBossPacingV2(contract,pending).castsUnresolvedAtEnd,1,
 'An unfinished cast at a legitimate combat end is not a phantom threat');
const quick=sample([terminal(1500,'victory')],'victory',1500);
assert.deepEqual(observeBossPacingV2(contract,quick).warnings,
 ['no_authored_cast','no_authored_phase','early_end_before_counterplay']);
const simultaneous=sample([start,complete,
 {...phase70,atMs:3000},{...phase35,atMs:3000},
 terminal(5000,'victory')]);
assert.equal(observeBossPacingV2(contract,simultaneous).phase35AtMs,3000,
 'Single-tick burst may legally cross both thresholds together');

let rejected=0;
function reject(result:CombatResult,pattern:RegExp,changed=contract){
 assert.throws(()=>observeBossPacingV2(changed,result),pattern);rejected++;
}
reject(sample([start,{...complete,atMs:2300},terminal(5000,'victory')]),
 /cast_completed_too_soon/);
reject(sample([complete,terminal(5000,'victory')]),/completion_without_start/);
reject(sample([start,start,terminal(5000,'victory')]),/overlapping_authored_cast/);
reject(sample([start,phase35,terminal(5000,'victory')]),
 /duplicate_or_out_of_order_phase/);
reject(sample([phase70,phase70,terminal(5000,'victory')]),
 /duplicate_or_out_of_order_phase/);
reject(sample([{...start,abilityId:'SOLAR_V2_FAKE'},terminal(5000,'victory')]),
 /unknown_v2_cast/);
reject(sample([{...phase70,abilityId:'SOLAR_V2_PHASE_FORGED'},
 terminal(5000,'victory')]),/unknown_v2_phase/);
reject(sample([start,{atMs:1500,type:'interrupt',actorId:'QA_PLAYER',
 targetId:contract.bossId,interruptedAbilityId:'SOLAR_V2_SUNFALL'},
 terminal(5000,'victory')]),/uninterruptible_cast_interrupted/,
 {...contract,casts:[{...contract.casts[0],interruptible:false}]});
reject(sample([start,terminal(5000,'victory'),terminal(5000,'victory')]),
 /invalid_combat_terminal/);
reject(sample([phase70,start,terminal(5000,'victory')]),
 /invalid_event_order/);
reject(sample([start,terminal(5000,'victory')], 'wipe'),
 /invalid_combat_terminal/);
reject(sample([start,terminal(5000,'victory')], 'victory',-1),
 /invalid_combat_result/);
reject(sample([terminal(5000,'victory')]),/invalid_authored_contract/,
 {...contract,phases:[...contract.phases].reverse()});
assert.equal(rejected,13);

const second={...obs,classId:'KNIFEDANCER',specId:'KNIFEDANCER_EDGE',
 durationMs:9000,phase35AtMs:null,reason:'timeout' as const,
 bossHpPercent:12};
const third={...interruptedObs,classId:'DUSKMENDER',specId:'DUSKMENDER_LIGHT',
 durationMs:2000,reason:'wipe' as const};
const aggregate=aggregateBossPacingV2([second,third,obs]);
assert.equal(aggregate.length,1);
assert.equal(aggregate[0].cases,3);
assert.equal(aggregate[0].wins,1);
assert.equal(aggregate[0].wipes,1);
assert.equal(aggregate[0].timeouts,1);
assert.equal(aggregate[0].durationP10Ms,2000);
assert.equal(aggregate[0].durationP50Ms,5000);
assert.equal(aggregate[0].bossHpP50Percent,12);
assert.equal(aggregate[0].playerHpP50Percent,70);
assert.equal(aggregate[0].durationP90Ms,9000);
assert.equal(aggregate[0].phase70Cases,2);
assert.equal(aggregate[0].phase35Cases,1);
assert.equal(aggregate[0].castStarts,3);
assert.equal(aggregate[0].castCompletes,2);
assert.equal(aggregate[0].castInterrupts,1);
assert.equal(aggregate[0].winsBeforeFirstTell,0);
assert.equal(aggregate[0].wipesBeforeFirstTell,0);
assert.equal(aggregate[0].timeoutsWithBossHpAbove70,0);
assert.deepEqual(aggregateBossPacingV2([obs,second,third]),aggregate,
 'Pacing diagnostics must ignore the order of class/spec observations');
assert.throws(()=>aggregateBossPacingV2([obs,obs]),/duplicate_class_spec/);
assert.throws(()=>aggregateBossPacingV2([{...obs,castsStarted:3}]),
 /invalid_sample/);
assert.throws(()=>aggregateBossPacingV2([]),/empty_samples/);

// A short victory, a sudden wipe and an HP wall are distinct diagnostics.
// Observational thresholds must not change a boss stat or fail release gates.
const wall=sample([terminal(2000,'timeout')],'timeout',2000);
wall.enemies[0].hp=920;
const rapidWipe=sample([terminal(2500,'wipe')],'wipe',2500);
const cases=aggregateBossPacingV2([
 {...observeBossPacingV2(contract,quick),
  classId:'KNIFEDANCER',specId:'QUICK'},
 {...observeBossPacingV2(contract,wall),
  classId:'IRONWARDEN',specId:'WALL'},
 {...observeBossPacingV2(contract,rapidWipe),
  classId:'DUSKMENDER',specId:'WIPE'},
]);
assert.equal(cases[0].winsBeforeFirstTell,1);
assert.equal(cases[0].wipesBeforeFirstTell,1);
assert.equal(cases[0].timeoutsWithBossHpAbove70,1);
assert.equal(cases[0].bossHpP50Percent,50);
assert.equal(cases[0].durationP10Ms,1500);
assert.ok(cases[0].warnings.includes('timeout_low_boss_hp_progress:1/3'));
assert.ok(cases[0].warnings.includes('wins_before_first_tell:1/3'));
assert.ok(cases[0].warnings.includes('wipes_before_first_tell:1/3'));
console.log('PASS: boss pacing read-only phase/cast timelines, terminal casts, 13 tamper regressions and order-invariant synthetic aggregates');
