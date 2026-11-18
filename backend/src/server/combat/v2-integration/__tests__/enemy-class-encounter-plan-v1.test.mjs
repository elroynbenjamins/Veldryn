import assert from 'node:assert/strict';
import {
 COMBAT_V2_ENEMY_CLASS_GATE,ENEMY_V2_RULESET,
 LEGACY_ENEMY_TO_TRAITS_ARCHETYPE_V2,canonicalEnemyTraitsArchetypeV2,
 planHiddenEnemyClassEncounterV2 as plan,projectEnemyV2StatusV1 as status,
 projectEnemyV2ShieldV1 as shield,
} from '../enemy-class-encounter-plan-v1.mjs';
const roles={
 IRONWARDEN:'tank',BASTION:'tank',DREADGUARD:'tank',
 WAYFINDER:'damage',RAVAGER:'damage',HEXWEAVER:'damage',KNIFE_DANCER:'damage',
 DAWNKEEPER:'support',STONECALLER:'support',
};
const original=()=>({
 version:2,ruleset:ENEMY_V2_RULESET,source:'server-persisted-v2',
 mode:'solo',region:'sunscar',equipmentTier:3,encounterId:'run-v2-17',serverSeed:'private-snapshot-seed',
 snapshotRevision:1,
 actors:[{
  actorId:'player-1',characterId:'char-1',classId:'IRONWARDEN',role:'tank',
  classPolicyVersion:'class-v2-approved',skillBuildVersion:'skills-v2-approved',
  equipmentEvidence:{
   schema:'eq2-cv2-exact-source-v1',combatReady:false,
   actorCharacterId:'char-1',classId:'IRONWARDEN',role:'tank',
   scaling:'exact-pre-scaled-do-not-reapply-rarity-or-quality',
  },
 }],
 enemies:[{id:'mob-1',team:'enemies',kind:'normal',
  pveArchetypeTag:'pve:archetype:guardian',traits:['stonehide']}],
});
const verified={verifyPersistedSnapshot:()=>true};
let denied=0;
function rejects(mutate,expected,auth=verified){
 const f=original();
 mutate(f);
 assert.throws(()=>plan(f,auth),new RegExp('combat_v2_enemy_class_'+expected));
 denied++;
}
for(const [legacy,canonical] of Object.entries(LEGACY_ENEMY_TO_TRAITS_ARCHETYPE_V2))
 assert.equal(canonicalEnemyTraitsArchetypeV2('pve:archetype:'+legacy),canonical);
const proof=plan(original(),verified);
assert.equal(proof.schema,COMBAT_V2_ENEMY_CLASS_GATE);
assert.equal(proof.runnable,false);
assert.equal(proof.legacyRulesUntouched,true);
assert.equal(proof.singleEnemyCompilerRequired,true);
assert.equal(proof.enemies[0].archetype,'bulwark');
assert.deepEqual(proof.enemies[0].traitIds,['stonehide']);
assert.ok(Object.isFrozen(proof)&&Object.isFrozen(proof.enemies)&&Object.isFrozen(proof.enemies[0]));
assert.equal(JSON.stringify(proof).includes('private-snapshot-seed'),false);
for(const [classId,role] of Object.entries(roles)){
 const f=original();
 f.actors[0].classId=classId;f.actors[0].role=role;
 f.actors[0].equipmentEvidence.classId=classId;
 f.actors[0].equipmentEvidence.role=role;
 assert.equal(plan(f,verified).classId,classId);
}
rejects(f=>{},'trusted_snapshot_verifier_required',{});
rejects(f=>{},'unverified_server_snapshot',{verifyPersistedSnapshot:()=>false});
rejects(f=>{},'unverified_server_snapshot',{verifyPersistedSnapshot:()=>{throw Error('db-unavailable');}});
rejects(f=>f.version=1,'invalid_server_snapshot');
rejects(f=>f.ruleset='normal','invalid_server_snapshot');
rejects(f=>f.source='client','invalid_server_snapshot');
rejects(f=>f.mode='dungeon','invalid_server_snapshot');
rejects(f=>f.mode='world_boss','invalid_server_snapshot');
rejects(f=>f.region='unknown','invalid_server_snapshot');
rejects(f=>f.equipmentTier=1,'invalid_server_snapshot');
rejects(f=>f.serverSeed='','invalid_server_snapshot');
rejects(f=>f.snapshotRevision=0,'invalid_server_snapshot');
rejects(f=>f.legacyReplay={},'legacy_state_requires_versioned_migration');
rejects(f=>f.initialPlayerState={a:{hp:5}},'legacy_state_requires_versioned_migration');
rejects(f=>f.enemyDamageProfile='qmode-v1','legacy_state_requires_versioned_migration');
rejects(f=>f.experimentalRuleset='enemy-v2-prototype-1','legacy_state_requires_versioned_migration');
rejects(f=>f.actors.push({...f.actors[0]}),'unsupported_encounter_composition');
rejects(f=>f.enemies=[],'unsupported_encounter_composition');
rejects(f=>f.actors[0].role='damage','missing_authoritative_class_or_equipment_source');
rejects(f=>f.actors[0].equipmentEvidence.combatReady=true,'missing_authoritative_class_or_equipment_source');
rejects(f=>f.actors[0].equipmentEvidence.actorCharacterId='char-other','missing_authoritative_class_or_equipment_source');
rejects(f=>f.actors[0].equipmentEvidence.scaling='unscaled','missing_authoritative_class_or_equipment_source');
rejects(f=>f.enemies.push({...f.enemies[0]}),'enemy_identity_or_duplicate_compiler');
rejects(f=>f.enemies[0].kind='boss','enemy_identity_or_duplicate_compiler');
rejects(f=>f.enemies[0].boss=true,'enemy_identity_or_duplicate_compiler');
rejects(f=>f.enemies[0].tags=['combat-v2-enemy'],'enemy_identity_or_duplicate_compiler');
rejects(f=>f.enemies[0].tags=['enemy-v2:trait:stonehide'],'enemy_identity_or_duplicate_compiler');
rejects(f=>f.enemies[0].preparedByAnotherCompiler=true,'enemy_identity_or_duplicate_compiler');
rejects(f=>f.enemies[0].pveArchetypeTag='pve:archetype:mystery','unsupported_pve_archetype');
rejects(f=>f.enemies[0].traits=['warded'],'unimplemented_or_duplicate_trait');
rejects(f=>{f.enemies[0].kind='elite';f.enemies[0].traits=['stonehide','stonehide'];},'unimplemented_or_duplicate_trait');
rejects(f=>{f.enemies[0].kind='elite';f.enemies[0].traits=['stonehide','fortified'];},'multiple_major_trait_groups');
rejects(f=>f.enemies[0].traits=['stonehide','fortified'],'trait_count_exceeds_tier_policy');
rejects(f=>{f.equipmentTier=2;f.enemies[0].kind='elite';f.enemies[0].traits=['stonehide','fortified'];},'trait_count_exceeds_tier_policy');
rejects(f=>f.enemies[0].traits=[12],'unimplemented_or_duplicate_trait');
const elite=original();
elite.enemies[0]={id:'mob-2',team:'enemies',kind:'elite',pveArchetypeTag:'pve:archetype:bruiser',traits:['savage','rending']};
assert.deepEqual(plan(elite,verified).enemies[0].traitIds,['savage','rending']);
assert.equal(denied,35);
const next=(tag,sourceId='e1',kind='dot',expiresAt=4500)=>({sourceId,kind,tag,expiresAt});
const args=(existing,newEffect,nowMs=1000)=>({
 existing,next:newEffect,nowMs,targetTeam:'players',sourceTeam:'enemies',
});
let s=status(args([],next('poison')));
assert.equal(s.activeStacks,1);
s=status(args(s.entries,next('poison', 'e1','dot',5000)));
s=status(args(s.entries,next('poison', 'e1','dot',6000)));
assert.equal(s.activeStacks,3);
assert.equal(s.entries.length,3);
const before=s.entries;
s=status(args(s.entries,next('poison','e1','dot',7000)));
assert.equal(s.refreshed,true);
assert.equal(s.entries.length,3);
assert.deepEqual(s.entries.map(x=>x.expiresAt),[7000,5000,6000]);
assert.deepEqual(before.map(x=>x.expiresAt),[4500,5000,6000],
 'Status refresh must not mutate earlier snapshots');
s=status(args(s.entries,next('poison','e2')));
assert.equal(s.activeStacks,1);
assert.equal(s.entries.length,4,'Different enemy source retains independent stacks');
s=status(args(s.entries,next('poison','e2','dot',9000),8000));
assert.equal(s.entries.length,1,'All expired entries are excluded from next projection');
let hot=status(args([],next('regeneration','e1','hot')));
hot=status(args(hot.entries,next('regeneration','e1','hot',6500)));
assert.equal(hot.entries.length,1);
assert.equal(hot.refreshed,true);
let debuff=status(args([],next('damage_done','e1','debuff')));
debuff=status(args(debuff.entries,next('damage_done','e1','debuff',6500)));
assert.equal(debuff.entries.length,1);
assert.throws(()=>status(args([],next('unknown'))),/unsupported_status_effect/);
assert.throws(()=>status(args([],{...next('poison'),privatePayload:{bonus:12}})),/invalid_status_payload/);
assert.throws(()=>status(args([{...next('poison'),nested:{raw:'secret'}}],next('poison'))),/invalid_existing_status/);
assert.throws(()=>status(args([],next('poison','e1','dot',1000))),/invalid_status_payload/);
assert.throws(()=>status(args([
 next('poison','e1'),next('poison','e1'),next('poison','e1'),next('poison','e1'),
],next('poison'))),/corrupt_existing_stack/);
assert.throws(()=>status({...args([],next('poison')),sourceTeam:'players'}),/invalid_status_context/);
assert.equal(shield({targetTeam:'enemies',maxHp:1000,currentShield:0,requested:500}),100);
assert.equal(shield({targetTeam:'enemies',maxHp:1000,currentShield:95,requested:50}),5);
assert.equal(shield({targetTeam:'enemies',maxHp:1000,currentShield:110,requested:50}),0);
assert.throws(()=>shield({targetTeam:'players',maxHp:1000,currentShield:0,requested:5}),/shield_target_must_be_enemy/);
assert.throws(()=>shield({targetTeam:'enemies',maxHp:1000,currentShield:0,requested:Infinity}),/invalid_shield_amount/);
console.log('PASS: 8 archetype mappings, nine classes, 35 fail-closed encounter cases, status caps/replay and enemy shield ceilings');
