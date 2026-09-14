import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRemoteConfig, nextResetDue, stableBucket, utcPeriodKey, validateRemoteConfig } from '../functions/_shared/operations.js';

test('stable rollout bucket is deterministic and bounded', () => {
  const a=stableBucket('acct-1','feature.live_dungeons.enabled','seed-a');
  assert.equal(a,stableBucket('acct-1','feature.live_dungeons.enabled','seed-a'));
  assert.ok(a>=0 && a<10000);
});

test('remote config respects rollout and defaults', () => {
  const row={config_key:'feature.test.enabled',default_value:false,current_value:true,enabled:true,rollout_percent:0,rollout_seed:'x'};
  assert.deepEqual(evaluateRemoteConfig(row,'acct').value,false);
  row.rollout_percent=100;
  assert.equal(evaluateRemoteConfig(row,'acct').value,true);
});

test('remote config validation enforces bounds and risk metadata', () => {
  const ok=validateRemoteConfig({config_key:'tuning.xp.global_multiplier',value_type:'number',risk_tier:'medium',current_value:1.1,rollout_percent:50,constraints_json:{min:.5,max:1.5}});
  assert.deepEqual(ok.errors,[]);
  const bad=validateRemoteConfig({config_key:'X',value_type:'number',risk_tier:'wat',current_value:9,rollout_percent:120,constraints_json:{max:2}});
  assert.ok(bad.errors.length>=4);
});

test('central reset helpers use UTC calendar periods', () => {
  const weekly={cadence:'weekly',day_of_week:1,utc_hour:0,utc_minute:0};
  assert.equal(utcPeriodKey(weekly,new Date('2026-09-14T11:00:00Z')),'2026-09-14');
  assert.equal(nextResetDue(weekly,new Date('2026-09-14T11:00:00Z')),'2026-09-21T00:00:00.000Z');
  const monthly={cadence:'monthly',day_of_month:1,utc_hour:0,utc_minute:0};
  assert.equal(nextResetDue(monthly,new Date('2026-09-14T11:00:00Z')),'2026-10-01T00:00:00.000Z');
});
