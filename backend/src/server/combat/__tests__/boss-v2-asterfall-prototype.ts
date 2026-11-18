import {strict as assert} from 'node:assert';
import {simulateCombat} from '../engine';
import {launchPlayer,rootboundHeartBoss,bellWardenBoss} from '../content/launch-combat';
import {pveBossTelegraph} from '../pve-encounter-identity';
import {ENEMY_V2_RULESET} from '../enemy-v2-prototype';
import {prepareAsterfallBossV2} from '../boss-v2-asterfall-prototype';

const cases=[
  {base:rootboundHeartBoss(),ids:['ROOT_SLAM','BRIAR_PULSE','THORN_RAGE'],newAbility:'ROOT_V2_LIVING_BARK'},
  {base:bellWardenBoss(),ids:['BELL_TOLL','WARDEN_STRIKE'],newAbility:'BELL_V2_SOUL_CURSE'},
];
for(const entry of cases){
  const before=JSON.stringify(entry.base);
  assert.equal(prepareAsterfallBossV2(entry.base),entry.base,'legacy runs must keep their current boss');
  const tuned=prepareAsterfallBossV2(entry.base,ENEMY_V2_RULESET);
  assert.equal(tuned.id,entry.base.id);
  assert.equal(tuned.name,entry.base.name,'preserve canonical existing boss names');
  assert.equal(tuned.stats.maxHp,entry.base.stats.maxHp);
  assert.deepEqual(tuned.abilities.slice(0,entry.ids.length).map(ability=>ability.id),entry.ids,'retain existing boss attacks');
  assert.ok(tuned.abilities.some(ability=>ability.id===entry.newAbility));
  assert.deepEqual(tuned.phases?.map(phase=>phase.hpPct),[.70,.35],'exactly two 2.0 transitions');
  assert.equal(prepareAsterfallBossV2(tuned,ENEMY_V2_RULESET),tuned,'reapplication must not multiply boss abilities');
  assert.equal(JSON.stringify(entry.base),before,'base content must never mutate');
  const telegraph=pveBossTelegraph([tuned])!;
  assert.equal(telegraph.bossName,entry.base.name);
  assert.deepEqual(telegraph.phases.map(phase=>phase.hpPct),[70,35]);
  const players=['Ironwarden','Ravager','Dawnkeeper','Hexweaver'].map(name=>launchPlayer(name as 'Ironwarden'|'Ravager'|'Dawnkeeper'|'Hexweaver',25));
  const input={seed:'enemy-v2-asterfall-'+entry.base.id,players,enemies:[tuned],maxDurationMs:90000};
  const a=simulateCombat(input),b=simulateCombat(input);
  assert.deepEqual(a.events,b.events,'opt-in boss abilities must be deterministic');
  assert.ok(a.events.some(event=>event.abilityId===entry.newAbility || event.type==='phase'),'2.0 mechanic must execute during combat');
}
const unrelated=({...rootboundHeartBoss(),id:'OTHER_BOSS'});
assert.equal(prepareAsterfallBossV2(unrelated,ENEMY_V2_RULESET),unrelated,'other regional bosses stay unchanged');
console.log('PASS Asterfall Boss 2.0 opt-in kits, canonical names, phases and deterministic replay');
