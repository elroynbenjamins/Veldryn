import {strict as assert} from 'node:assert';
import {summarizeCandidatePowerCalibrationV2,type CandidatePowerCalibrationRowV2} from '../candidate-power-calibration';
const row=(scenarioId:string,equipped:number,damage:number):CandidatePowerCalibrationRowV2=>({
 scenarioId,bossId:'B',role:'damage',equipped,observedSidecarOff:{damagePerSecond:damage,
 effectiveHealingPerSecond:0,survivingHpFraction:1,shieldGrantedPerSecond:0,interruptsPerSecond:0,cleanseEventsPerSecond:0}
});
const samples=[row('a',100,2),row('b',200,1),row('c',300,3),row('d',300,3)];
const report=summarizeCandidatePowerCalibrationV2(samples);
assert.deepEqual(report,summarizeCandidatePowerCalibrationV2([...samples].reverse()));
const damage=report.strata[0].metrics[0];
assert.equal(damage.concordant,4);assert.equal(damage.discordant,1);assert.equal(damage.bothTies,1);
assert.equal(damage.agreement,.8);
assert.equal(report.strata[0].metrics[1].agreement,null);
assert.equal(report.cpApproved,false);
assert.throws(()=>summarizeCandidatePowerCalibrationV2([...samples,samples[0]]),/invalid_row/);
assert.throws(()=>summarizeCandidatePowerCalibrationV2([row('bad',100,NaN)]),/invalid_row/);
console.log('PASS: candidate CP ordering, ties, null outcome and source-order parity');
