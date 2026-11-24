import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {contract} from './normalized-effect-review-v18.mjs';
const v17=JSON.parse(readFileSync(new URL('../../../docs/2-0/eq2-set-trait-authoring-review-v17.json',import.meta.url),'utf8'));
test('V28 exact six healed-recipient shields and two Defense source bonuses',()=>{
 for(const [tier,value] of [[1,2.4],[2,2.7],[3,3],[4,3.3]]){
  const id='eq2_t'+tier+'_brightweave';
  const m=v17.sets.find(s=>s.setId===id)?.milestones.find(m=>m.pieces===4);
  assert.ok(m,id);assert.equal(m.trigger,'effective_direct_class_heal');
  assert.equal(m.effect,'shield');assert.equal(m.unit,'percent_target_max_hp');
  assert.equal(m.target,'healed_target');assert.equal(m.value,value);
  assert.equal(m.durationSeconds,6);assert.equal(m.internalCooldownSeconds,20);
 }
 for(const [id,pieces,channel,unit,value,cd] of [
  ['eq2_rare_t5_dawnspire',4,'shield','percent_target_max_hp',5,20],
  ['eq2_t5_dawnweave',4,'shield','percent_target_max_hp',3,18],
  ['eq2_dungeon_rootbound_t2_lifebloom',4,'defense_pct','relative_percent',3,20],
  ['eq2_combo_t5_dawnmender_chain',2,'defense_pct','relative_percent',3,18]
 ]){
  const m=contract.sets.find(s=>s.setId===id&&s.pieces===pieces),o=m?.outputs?.[0];
  assert.ok(m,id);assert.equal(m.trigger,'effective_direct_class_heal');
  assert.equal(m.outputs.length,1);assert.equal(o.channel,channel);assert.equal(o.unit,unit);
  assert.equal(o.target,'event_target');assert.equal(o.value,value);
  assert.equal(o.durationSeconds,6);assert.equal(m.internalCooldownSeconds,cd);
  assert.equal(m.releaseApproved,false);
 }
});
