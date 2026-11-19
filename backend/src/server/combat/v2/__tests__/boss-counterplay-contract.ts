import {strict as assert} from 'node:assert';
import type {CombatantDefinition} from '../../types';
import {simulateCombat} from '../../engine';
import {prepareSoloEnemyKitsV2,type PersistedEnemyKitV2} from '../enemy-kit-composer';
import {projectPersistedBossCounterplayV2} from '../boss-counterplay-contract';
import {enemyV2SnapshotDigest} from '../enemy-engine-authority';

const stats={maxHp:4000,attackPower:100,healingPower:0,defense:100,
 accuracy:1000,evasion:100,critChance:0,critMultiplier:1.5,haste:0};
const boss=(id:string,name:string):CombatantDefinition=>({
 id,name,boss:true,team:'enemies',role:'enemy',level:40,stats:{...stats},
 basicAttackMs:2500,basicAttackCoeff:.6,abilities:[],tags:[],
 phases:[{id:'LEGACY_PHASE',name:'Legacy untouched',hpPct:.8,
  target:'self',effects:[{kind:'shield',flat:15}]}],
});
const hero:CombatantDefinition={
 id:'HERO',name:'Unmodified legacy player',team:'players',role:'damage',
 level:40,stats:{...stats,maxHp:8000,attackPower:250,defense:250},
 basicAttackMs:2300,basicAttackCoeff:1,abilities:[],
};
const six=[
 ['BOSS_EXP_ROOT','Asterfall Root','asterfall',2,1],
 ['BOSS_EXP_BELL','Asterfall Bell','asterfall',2,2],
 ['BOSS_EXP_SOLAR','The Buried Heliarch','sunscar',3,1],
 ['BOSS_EXP_SPHINX','The Veiled Sphinx','sunscar',3,1],
 ['BOSS_EXP_BELLBEAST','The Bellbeast of Shiverlake','frostmarch',5,1],
 ['BOSS_EXP_CANTOR','The Frozen Cantor','frostmarch',5,1],
] as const;
const seen=new Set<string>();
let interrupted=0,legacyChecks=0;
for(const [id,name,region,tier,castCount] of six){
 const raw=boss(id,name);
 const original=JSON.stringify(raw);
 const legacyInput={seed:'old-inflight-boss',players:[hero],enemies:[raw],
  maxDurationMs:4500};
 const before=simulateCombat(legacyInput);
 const options={ruleset:'enemy-v2-prototype-1' as const,
  serverSeed:'server-persisted-boss-seed',encounterId:'BOSS_QA_'+id,
  region,equipmentTier:tier,eliteEnemyIds:[] as string[]};
 const candidate=prepareSoloEnemyKitsV2([raw],options);
 const stored:PersistedEnemyKitV2={...candidate,
  source:'server-persisted-v2',revision:1};
 const preview=projectPersistedBossCounterplayV2([raw],stored);
 assert.equal(preview.length,1);
 assert.equal(preview[0].bossId,id);
 assert.equal(preview[0].casts.length,castCount);
 assert.deepEqual(preview[0].phases.map(p=>p.hpPercent),[70,35]);
 assert.equal(candidate.preparedEnemies[0].phases?.length,3,
  'Legacy phase must be preserved alongside the two V2 phases');
 assert.equal(JSON.stringify(raw),original);
 assert.deepEqual(simulateCombat(legacyInput),before,
  'Old in-flight dungeon/boss replays must not be recompiled');
 assert.deepEqual(projectPersistedBossCounterplayV2([raw],stored),preview,
  'Persisted boss tells must replay byte-for-byte');
 const safe=JSON.stringify(preview);
 assert.ok(!safe.includes(options.serverSeed));
 assert.ok(!safe.includes('coeff')&&!safe.includes('maxHp'));
 for(const cast of preview[0].casts){
  assert.ok(cast.castMs>=1100,'Minimum readable mobile cast window');
  assert.ok(cast.tell.length>0&&cast.counter.length>0&&cast.fallback.length>0);
  assert.ok(!seen.has(cast.abilityId),'Authored cast ID must be unique');
  seen.add(cast.abilityId);
  if(cast.interruptible)interrupted++;
 }
 const forgedPreview:PersistedEnemyKitV2={...stored,
  preview:[{...stored.preview[0],phaseNames:['Fake','Fake']}]};
 assert.throws(()=>projectPersistedBossCounterplayV2([raw],forgedPreview),
  /stored_preview_does_not_match_kit/);
 const weakerCast=candidate.preparedEnemies.map(e=>({
  ...e,abilities:e.abilities.map(a=>({...a,castTimeMs:100})),
 }));
 assert.throws(()=>projectPersistedBossCounterplayV2([raw],{
  ...stored,preparedEnemies:weakerCast,
  preparedEnemyDigest:enemyV2SnapshotDigest(weakerCast),
 }),/stored_boss_authored_kit_mismatch|cast_counter_contract_mismatch/);
 const forgedPhases=candidate.preparedEnemies.map(e=>({...e,
  phases:e.phases?.map(p=>p.id==='LEGACY_PHASE'?p:{...p,hpPct:.40}),
 }));
 assert.throws(()=>projectPersistedBossCounterplayV2([raw],{
  ...stored,preparedEnemies:forgedPhases,
  preparedEnemyDigest:enemyV2SnapshotDigest(forgedPhases),
 }),/stored_boss_authored_kit_mismatch|phase_counter_contract_mismatch/);
 const forgedDamage=candidate.preparedEnemies.map(e=>({
  ...e,abilities:e.abilities.map(a=>a.id===preview[0].casts[0].abilityId?{
   ...a,effects:a.effects.map(fx=>({...fx,
    ...(fx.coeff!==undefined?{coeff:fx.coeff*1.2}:{flat:999999})})),
  }:a),
 }));
 assert.throws(()=>projectPersistedBossCounterplayV2([raw],{
  ...stored,preparedEnemies:forgedDamage,
  preparedEnemyDigest:enemyV2SnapshotDigest(forgedDamage),
 }),/stored_boss_authored_kit_mismatch/,
  'Re-hashing a changed boss damage/shield should not authorize it');
 legacyChecks++;
}
assert.equal(legacyChecks,6);
assert.equal(seen.size,7);
assert.equal(interrupted,3);
console.log('PASS: 6 boss profiles, 7 readable cast tells, 12 authored phases, 3 interruptible mechanics with class-neutral fallbacks and preserved legacy replays');
