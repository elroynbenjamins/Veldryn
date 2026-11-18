import {strict as assert} from 'node:assert';
import {EXPEDITION_ENCOUNTERS} from '../content/expedition-encounters';
import {launchPlayer} from '../content/launch-combat';
import {simulateCombat} from '../engine';
import {pveBossTelegraph} from '../pve-encounter-identity';
import {ENEMY_V2_RULESET} from '../enemy-v2-prototype';
import {prepareRegionalBossV2} from '../boss-v2-regional-prototype';

const profiles=[
  ['BOSS_EXP_SOLAR','The Buried Heliarch','SOLAR_V2_PRISM_WARD'],
  ['BOSS_EXP_SPHINX','The Veiled Sphinx','SPHINX_V2_MIRAGE'],
  ['BOSS_EXP_BELLBEAST','The Bellbeast of Shiverlake','BELLBEAST_V2_FROST_HIDE'],
  ['BOSS_EXP_CANTOR','The Frozen Cantor','CANTOR_V2_DISSONANCE'],
] as const;
for(const [id,name,uniqueAbility] of profiles){
  const factory=EXPEDITION_ENCOUNTERS[id];
  assert.ok(factory,`Missing canonical boss ${id}`);
  const boss=factory()[0];
  assert.equal(boss.id,id);
  assert.equal(boss.name,name);
  assert.equal(prepareRegionalBossV2(boss),boss,`${id}: no ruleset remains strict legacy`);
  const original=JSON.stringify(boss);
  const tuned=prepareRegionalBossV2(boss,ENEMY_V2_RULESET);
  assert.equal(tuned.id,boss.id);
  assert.equal(tuned.name,boss.name);
  assert.equal(tuned.level,boss.level);
  assert.deepEqual(tuned.stats,boss.stats,'do not alter base boss stats');
  assert.deepEqual(tuned.abilities.slice(0,boss.abilities.length),boss.abilities,'do not replace the live skill kit');
  assert.ok(tuned.abilities.some(a=>a.id===uniqueAbility));
  assert.deepEqual(tuned.phases?.map(p=>p.hpPct),[.7,.35]);
  assert.equal(prepareRegionalBossV2(tuned,ENEMY_V2_RULESET),tuned,'no double application');
  assert.equal(JSON.stringify(boss),original,'base factory must remain unchanged');
  const preview=pveBossTelegraph([tuned])!;
  assert.deepEqual(preview.phases.map(p=>p.hpPct),[70,35]);
  assert.equal(preview.bossName,name);
  const players=['Ironwarden','Wayfinder','Dawnkeeper','Ravager'].map(x=>launchPlayer(x as 'Ironwarden'|'Wayfinder'|'Dawnkeeper'|'Ravager',boss.level));
  const input={seed:`regional-v2-${id}`,players,enemies:[tuned],maxDurationMs:45000};
  assert.deepEqual(simulateCombat(input).events,simulateCombat(input).events,`${id}: prototype must replay deterministically`);
}
const root=EXPEDITION_ENCOUNTERS.BOSS_EXP_ROOT()[0];
assert.equal(prepareRegionalBossV2(root,ENEMY_V2_RULESET),root,'Asterfall is handled by its own isolated profile');
console.log('PASS: four regional boss 2.0 kits are opt-in, preserve legacy identities and replay deterministically');
