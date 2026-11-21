import {strict as assert} from 'node:assert';
import type {CombatantDefinition} from '../../types';
import {prepareSoloEnemyKitsV2,verifyPersistedEnemyKitsV2,
 type PersistedEnemyKitV2} from '../enemy-kit-composer';
import {ENEMY_V2_RULESET} from '../../enemy-v2-prototype';
import {ENEMY_T1_ARCHETYPES} from '../enemy-t1-intro-kit';
import {enemyV2SnapshotDigest} from '../enemy-engine-authority';

const make=(archetype:string):CombatantDefinition=>({
 id:'T1_'+archetype,name:'Tier 1 '+archetype,team:'enemies',role:'enemy',level:5,
 basicAttackMs:2300,basicAttackCoeff:.7,
 stats:{maxHp:500,attackPower:40,healingPower:0,defense:30,
  accuracy:800,evasion:80,critChance:.02,critMultiplier:1.5,haste:0},
 abilities:[],tags:['pve:archetype:'+archetype],
});
const options={
 ruleset:ENEMY_V2_RULESET,serverSeed:'t1-authored-seed-111',
 encounterId:'QA_T1',region:'asterfall' as const,equipmentTier:1 as const,
 eliteEnemyIds:[] as string[],
};
let valid=0;
for(const archetype of ENEMY_T1_ARCHETYPES){
 const base=make(archetype);
 const original=JSON.stringify(base);
 for(const elite of [false,true]){
  const opts={...options,eliteEnemyIds:elite?[base.id]:[]};
  const a=prepareSoloEnemyKitsV2([base],opts);
  const b=prepareSoloEnemyKitsV2([base],opts);
  assert.deepEqual(a,b,'T1 teaching kit must not roll hidden traits');
  assert.equal(a.preview[0].traitIds.length,0);
  assert.equal(a.preview[0].profile,'t1-intro:'+archetype);
  assert.equal(a.preview[0].abilityNames.length,1);
  assert.ok(a.preparedEnemies[0].tags?.includes('enemy-v2:t1-intro:'+archetype));
  assert.ok(!a.preparedEnemies[0].tags?.some(t=>t.startsWith('enemy-v2:trait:')));
  assert.equal(a.preparedEnemies[0].abilities.length,1);
  const persisted:PersistedEnemyKitV2={...a,source:'server-persisted-v2',revision:2};
  assert.deepEqual(verifyPersistedEnemyKitsV2([base],persisted).enemies,a.preparedEnemies);
  const forgedPreview={...persisted,preview:[{...persisted.preview[0],
    abilityNames:['Forged ability']}]};
  assert.throws(()=>verifyPersistedEnemyKitsV2([base],forgedPreview),
    /stored_preview_does_not_match_kit/);
  const forgedAbility=a.preparedEnemies.map(e=>({
    ...e,abilities:e.abilities.map(x=>({...x,cooldownMs:100})),
  }));
  assert.throws(()=>verifyPersistedEnemyKitsV2([base],{
    ...persisted,preparedEnemies:forgedAbility,
    preparedEnemyDigest:enemyV2SnapshotDigest(forgedAbility),
  }),/stored_t1_intro_kit_mismatch/);
  assert.equal(JSON.stringify(base),original,'Source definition remains unmodified');
  valid++;
 }
}
assert.equal(valid,16);
assert.throws(()=>prepareSoloEnemyKitsV2([make('unapproved')],options),
 /unsupported_t1_archetype/);
assert.throws(()=>prepareSoloEnemyKitsV2([make('bruiser')],{
 ...options,eliteEnemyIds:['OTHER'],
}),/invalid_elite_enemy_ids/);
console.log('PASS: 8 authored Tier 1 archetypes x 2 modes; no trait RNG, persisted replay, forgery rejection, immutable legacy source');
