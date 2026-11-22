import {strict as assert} from 'node:assert';
import {analyzeSyntheticBalanceV2,type CombatV2SyntheticBalanceSample} from '../balance-diagnostics';

const initial:CombatV2SyntheticBalanceSample={
 classId:'IRONWARDEN',spec:'guardian',role:'tank',tier:'T2',
 profile:'low',kind:'normal',enemyKit:'authored-v2',
 dps:40,hps:0,damageTaken:400,victory:true,durationMs:6000,
 resourceEvents:5,mechanics:3,baseEquipmentStat:130,
};
const samples:CombatV2SyntheticBalanceSample[]=[
 initial,{...initial,profile:'high',dps:44,baseEquipmentStat:160},
 {...initial,kind:'boss',dps:30,victory:false,profile:'low',baseEquipmentStat:130},
 {...initial,kind:'boss',dps:20,victory:false,profile:'high',baseEquipmentStat:160},
 {...initial,tier:'T1',kind:'normal',enemyKit:'generic-t1',dps:10,baseEquipmentStat:80},
 {...initial,tier:'T1',kind:'normal',enemyKit:'generic-t1',profile:'high',dps:15,baseEquipmentStat:100},
];
const summary=analyzeSyntheticBalanceV2(samples);
assert.equal(summary.provenance,'synthetic_unapproved_2_0');
assert.equal(summary.count,6);
assert.equal(summary.gearProgression.length,3);
assert.ok(summary.findings.some(f=>f.type==='dps_inversion'&&f.group.includes('boss')));
assert.ok(summary.findings.some(f=>f.type==='no_wins_in_group'));
assert.ok(summary.findings.some(f=>f.type==='t1_unverified'));
assert.ok(summary.bands.some(b=>b.group==='tank|T2|normal|low'&&b.medianDps===40));
assert.deepEqual(analyzeSyntheticBalanceV2([...samples].reverse()),summary,
 'Diagnostics must not depend on fixture row order');
assert.throws(()=>analyzeSyntheticBalanceV2([...samples,initial]),/duplicate_sample/);
assert.throws(()=>analyzeSyntheticBalanceV2(samples.slice(0,-1)),/missing_quality_pair/);
assert.throws(()=>analyzeSyntheticBalanceV2(samples.map((s,i)=>i===1?{...s,baseEquipmentStat:10}:s)),
 /nonmonotonic_verified_base_gear/);
assert.throws(()=>analyzeSyntheticBalanceV2([{...initial,dps:NaN},samples[1]]),/invalid_sample/);
assert.throws(()=>analyzeSyntheticBalanceV2([{...initial,tier:'T1'},samples[1]]),/invalid_sample/);
console.log('PASS: deterministic tier/role balance diagnostics, T1 coverage gaps, outlier flags and fail-closed corrupted fixture data');
