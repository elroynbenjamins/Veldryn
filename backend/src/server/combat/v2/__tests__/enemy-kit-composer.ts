import {strict as assert} from 'node:assert';
import type {CombatantDefinition} from '../../types';
import {ENEMY_V2_TRAITS,ENEMY_V2_RULESET,type EnemyV2ServerOptions} from '../../enemy-v2-prototype';
import {prepareSoloEnemyKitsV2,verifyPersistedEnemyKitsV2,type PersistedEnemyKitV2} from '../enemy-kit-composer';
import {enemyV2SnapshotDigest} from '../enemy-engine-authority';

const baseStats={maxHp:3000,attackPower:170,healingPower:0,defense:80,
 accuracy:900,evasion:100,critChance:.05,critMultiplier:1.5,haste:0};
const base=(id:string,archetype='bruiser'):CombatantDefinition=>({
 id,name:id,team:'enemies',role:'enemy',level:35,
 stats:{...baseStats},basicAttackMs:2400,basicAttackCoeff:.8,
 abilities:[],tags:['pve:archetype:'+archetype],
});
const options:EnemyV2ServerOptions={
 ruleset:ENEMY_V2_RULESET,serverSeed:'persisted-solo-seed-333',encounterId:'encounter_33',
 region:'sunscar',equipmentTier:3,eliteEnemyIds:['WOLF_ELITE'],
};
const enemies=[base('WOLF_ELITE','assassin'),base('WOLF_NORMAL','hexer')];
const before=JSON.stringify(enemies);
const candidate=prepareSoloEnemyKitsV2(enemies,options);
assert.equal(candidate.source,'unpersisted-candidate-v2');
assert.equal(candidate.enemyIds.length,2);
assert.equal(candidate.bossIds.length,0);
assert.equal(candidate.preview[0].kind,'elite');
assert.equal(candidate.preview[0].traitIds.length,2);
assert.ok(candidate.preview[0].traitIds.every(x=>ENEMY_V2_TRAITS[x as keyof typeof ENEMY_V2_TRAITS].implemented));
assert.ok(candidate.preparedEnemies.every(x=>x.tags?.includes('enemy-v2:kit:v1')));
assert.ok(candidate.preparedEnemies.every(x=>x.abilities.every(a=>!a.id.startsWith('V2_ENEMY_'))),
 'The old generic archetype compiler must not add a second kit');
assert.equal(JSON.stringify(enemies),before,'Source enemies remain unchanged');
assert.deepEqual(prepareSoloEnemyKitsV2(enemies,options),candidate,'Fixed server seed must produce identical kits');
assert.ok(!JSON.stringify(candidate.preview).includes(options.serverSeed),'Public preview excludes seed');
assert.equal(enemyV2SnapshotDigest({b:2,a:{z:9,c:8}}),
 enemyV2SnapshotDigest({a:{c:8,z:9},b:2}),'Canonical hash ignores JSONB field order');
const persisted:PersistedEnemyKitV2={...candidate,source:'server-persisted-v2',revision:1};
const checked=verifyPersistedEnemyKitsV2(enemies,persisted);
assert.deepEqual(checked.enemies,candidate.preparedEnemies);
assert.deepEqual(checked.preview,candidate.preview);
let failed=0;
function rejects(fn:()=>unknown,match:RegExp){
 assert.throws(fn,match);failed++;
}
rejects(()=>verifyPersistedEnemyKitsV2(enemies,candidate as unknown as PersistedEnemyKitV2),/invalid_stored_kit/);
rejects(()=>prepareSoloEnemyKitsV2(candidate.preparedEnemies,options),/unverified_or_already_compiled_enemy/);
rejects(()=>prepareSoloEnemyKitsV2([base('UNKNOWN','unclassified')],{...options,equipmentTier:1,eliteEnemyIds:[]}),/unsupported_t1_archetype/);
rejects(()=>prepareSoloEnemyKitsV2(enemies,{...options,eliteEnemyIds:['OTHER']}),/invalid_elite_enemy_ids/);
rejects(()=>prepareSoloEnemyKitsV2([...enemies,enemies[0]],options),/unverified_or_already_compiled_enemy/);
rejects(()=>prepareSoloEnemyKitsV2([{...enemies[0],abilities:[
 {id:'V2_ENEMY_WOLF',name:'Injected',cooldownMs:1000,castTimeMs:0,
  priority:80,target:'self',effects:[{kind:'shield',flat:1}]},
]},enemies[1]],options),/unverified_or_already_compiled_enemy/);
rejects(()=>verifyPersistedEnemyKitsV2([base('OTHER'),enemies[1]],persisted),/stored_kit_digest_mismatch/);
rejects(()=>verifyPersistedEnemyKitsV2(enemies,{...persisted,preparedEnemyDigest:'forged'}),/stored_kit_digest_mismatch/);
rejects(()=>verifyPersistedEnemyKitsV2(enemies,{...persisted,region:'untrusted' as never}),/invalid_stored_region_or_tier/);
rejects(()=>verifyPersistedEnemyKitsV2(enemies,{...persisted,revision:0}),/invalid_stored_kit/);
rejects(()=>verifyPersistedEnemyKitsV2(enemies,{...persisted,preview:[]}),/invalid_stored_kit_size/);
const badTrait=persisted.preparedEnemies.map(e=>({...e,tags:[...(e.tags??[])]}));
badTrait[0].tags?.push('enemy-v2:trait:warded');
rejects(()=>verifyPersistedEnemyKitsV2(enemies,{
 ...persisted,preparedEnemies:badTrait,
 preparedEnemyDigest:enemyV2SnapshotDigest(badTrait),
}),/stored_unimplemented_trait|stored_trait_evidence_mismatch/);
const changedPreview=persisted.preview.map(p=>({...p,traitIds:[...p.traitIds]}));
changedPreview[0].traitIds=['warded'];
rejects(()=>verifyPersistedEnemyKitsV2(enemies,{...persisted,preview:changedPreview}),/stored_trait_evidence_mismatch/);

const bosses=[
 {id:'BOSS_EXP_ROOT',region:'asterfall',name:'Asterfall Root'},
 {id:'BOSS_EXP_BELL',region:'asterfall',name:'Asterfall Bell'},
 {id:'BOSS_EXP_SOLAR',region:'sunscar',name:'The Buried Heliarch'},
 {id:'BOSS_EXP_SPHINX',region:'sunscar',name:'The Veiled Sphinx'},
 {id:'BOSS_EXP_BELLBEAST',region:'frostmarch',name:'The Bellbeast of Shiverlake'},
 {id:'BOSS_EXP_CANTOR',region:'frostmarch',name:'The Frozen Cantor'},
] as const;
for(const {id,region,name} of bosses){
 const boss={...base(id),name,boss:true,tags:[],phases:[{
  id:'LEGACY_PHASE',name:'Legacy phase preserved',hpPct:.8,target:'self' as const,
  effects:[{kind:'shield' as const,flat:8}],
 }]};
 const plan=prepareSoloEnemyKitsV2([boss],{
  ...options,region,eliteEnemyIds:[],
 });
 assert.equal(plan.preview[0].kind,'boss');
 assert.deepEqual(plan.preview[0].traitIds,[]);
 assert.equal(plan.bossIds[0],id);
 assert.ok(plan.preparedEnemies[0].phases?.some(x=>x.id==='LEGACY_PHASE'));
 assert.ok((plan.preparedEnemies[0].phases?.length??0)>=3);
 assert.ok(plan.preparedEnemies[0].abilities.length>=1);
 assert.equal(plan.preparedEnemies[0].name,name);
 assert.ok(plan.preparedEnemies[0].abilities.every(a=>!a.id.startsWith('V2_ENEMY_')));
 assert.ok(plan.preparedEnemies[0].tags?.includes('enemy-v2:kit:v1'));
 const stored:PersistedEnemyKitV2={...plan,source:'server-persisted-v2',revision:3};
 assert.deepEqual(verifyPersistedEnemyKitsV2([boss],stored).enemies,plan.preparedEnemies);
 const missingLegacy=plan.preparedEnemies.map(e=>({...e,
   phases:e.phases?.filter(p=>p.id!=='LEGACY_PHASE'),
 }));
 rejects(()=>verifyPersistedEnemyKitsV2([boss],{
  ...stored,preparedEnemies:missingLegacy,
  preparedEnemyDigest:enemyV2SnapshotDigest(missingLegacy),
 }),/original_enemy_kit_mutated/);
}
const unknown={...base('BOSS_EXP_UNLISTED'),boss:true};
rejects(()=>prepareSoloEnemyKitsV2([unknown],{...options,eliteEnemyIds:[]}),/boss_requires_regional_profile/);
const wrongRegion={...base('BOSS_EXP_ROOT'),boss:true};
rejects(()=>prepareSoloEnemyKitsV2([wrongRegion],{...options,eliteEnemyIds:[]}),/boss_requires_regional_profile/);
const incorrectName={...base('BOSS_EXP_SOLAR'),name:'Forged Heliarch',boss:true};
rejects(()=>prepareSoloEnemyKitsV2([incorrectName],{...options,eliteEnemyIds:[]}),/unrecognized_authored_boss/);
rejects(()=>verifyPersistedEnemyKitsV2(enemies,{
 ...persisted,preview:[null as never,...persisted.preview.slice(1)],
}),/invalid_stored_preview/);
assert.equal(failed,23);
console.log('PASS: one seeded enemy kit, 6 handcrafted bosses, baseline phase preservation, 23 fail-closed receipts');
