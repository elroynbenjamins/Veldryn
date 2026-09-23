import {strict as assert} from 'node:assert';
import {launchPlayer} from '../content/launch-combat';
import {runPveBalanceBatch} from '../pve-balance-batch';

const players=['Ironwarden','Wayfinder','Ravager','Dawnkeeper'].map(classId=>launchPlayer(classId,25));
const input={encounterId:'ROOTBOUND_BOSS',players,iterations:6,seedPrefix:'PVE_BATCH_TEST_V1',maxDurationMs:180000};
const first=runPveBalanceBatch(input),second=runPveBalanceBatch(input);

assert.deepEqual(first,second,'same batch inputs must produce identical aggregate output');
assert.equal(first.schemaVersion,1);
assert.equal(first.telemetrySchemaVersion,2);
assert.equal(first.encounterId,'ROOTBOUND_BOSS');
assert.equal(first.iterations,6);
assert.equal(first.resultCounts.victory+first.resultCounts.wipe+first.resultCounts.timeout,6);
assert.ok(first.winRate>=0&&first.winRate<=1);
assert.equal(first.players.length,4);
assert.equal(first.party.length,4);
assert.ok(first.encounterArchetypes.length>0);
assert.ok(first.encounterMechanics.length>0);
assert.ok(first.enemyCasts.length>0);
assert.ok(Object.keys(first.abilities.partyDamage).length>0);
assert.ok(Object.keys(first.abilities.incomingDamage).length>0);
assert.ok(first.durationMs.min<=first.durationMs.p10&&first.durationMs.p10<=first.durationMs.p50&&first.durationMs.p50<=first.durationMs.p90&&first.durationMs.p90<=first.durationMs.max);
for(const player of first.players){
  assert.equal(player.runs,6);
  assert.ok(player.downRate>=0&&player.downRate<=1);
  assert.ok(player.endHpPct.min<=player.endHpPct.max);
}
for(const cast of first.enemyCasts){
  assert.ok(cast.started>=cast.completed);
  assert.ok(cast.started>=cast.interrupted);
  assert.ok(cast.completionRate>=0&&cast.completionRate<=1);
  assert.ok(cast.interruptionRate>=0&&cast.interruptionRate<=1);
}
const encoded=JSON.stringify(first);
for(const privateField of ['attackPower','defense','accuracy','evasion','events','cooldownReadyAt'])assert.equal(encoded.includes(privateField),false,`batch report leaked ${privateField}`);
let invalid='';try{runPveBalanceBatch({...input,iterations:0});}catch(error){invalid=error instanceof Error?error.message:String(error);}assert.equal(invalid,'invalid_balance_iterations');
console.log('PASS deterministic reusable PvE balance batch harness');
