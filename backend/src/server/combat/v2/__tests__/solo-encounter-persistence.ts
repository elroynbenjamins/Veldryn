import {strict as assert} from 'node:assert';
import type {CombatantDefinition,CombatStats} from '../../types';
import {launchPlayer} from '../../content/launch-combat';
import {prepareSoloEnemyKitsV2} from '../enemy-kit-composer';
import {enemyV2SnapshotDigest} from '../enemy-engine-authority';
import {
 SoloEncounterPersistenceServiceV2,validateStoredSoloEncounterV2,
 type TrustedSoloIdentityV2,type TrustedCompiledSoloSourceV2,
 type StoredSoloEncounterV2,type SoloEncounterReserveRequestV2,
} from '../solo-encounter-persistence';
import {
 SOLO_SNAPSHOT_READ_RPC_V2,SOLO_SNAPSHOT_RESERVE_RPC_V2,
 serviceRoleSoloSnapshotStorageV2,type ServiceRoleRpcClientV2,
} from '../solo-encounter-rpc-storage';

const scope:TrustedSoloIdentityV2={
 accountId:'00000000-0000-4000-a000-000000000011',
 characterId:'00000000-0000-4000-a000-000000000022',
 encounterId:'EXPERIMENT_SOLO_001',
};
const basicEnemy:CombatantDefinition={
 id:'V2_FOX',name:'Test Fox',team:'enemies',role:'enemy',level:25,
 stats:{maxHp:6000,attackPower:160,healingPower:0,defense:200,
  accuracy:700,evasion:80,critChance:.05,critMultiplier:1.5,haste:.05},
 basicAttackMs:2500,basicAttackCoeff:.5,abilities:[],
 tags:['pve:archetype:assassin'],
};
let loadFreshCount=0;
let sourceSeed='persisted-solo-seed-original';
const source=async():Promise<TrustedCompiledSoloSourceV2>=>{
 loadFreshCount++;
 const hero=launchPlayer('Ironwarden',25);
 const player:CombatantDefinition={...hero,
  combatV2:{version:2,resource:'guard',specializationId:'ironwarden:guardian'},
  tags:['combat-v2','combat-v2-class-base-only'],
 };
 const base=[basicEnemy];
 const kit=prepareSoloEnemyKitsV2(base,{
  ruleset:'enemy-v2-prototype-1',serverSeed:sourceSeed,
  encounterId:scope.encounterId,region:'sunscar',equipmentTier:3,
  eliteEnemyIds:[basicEnemy.id],
 });
 const stages={...player.stats};
 const evidence={
  actorId:player.id,classPolicyVersion:'class-baseline-fixture-v2',
  statStages:{
   classOnly:{...stages},afterSkills:{...stages},
   afterItemBase:{...stages},afterSets:{...stages},afterAffixes:{...stages},
  },
  baseSources:[],setEffects:[],affixSources:[],
 };
 return {
  source:'server-compiled-v2',gameRevision:12,buildRevision:4,
  characterFingerprint:'a'.repeat(32),
  combatInput:{seed:sourceSeed,players:[player],enemies:[...kit.preparedEnemies],
    maxDurationMs:7000,tickMs:100},
  baseEnemies:base,enemyKit:kit,equipmentEvidence:[evidence],
 };
};
let stored:StoredSoloEncounterV2|null=null;
let gameRevision=12;
let buildRevision=4;
let successfulWrites=0;
const seenRpcs:string[]=[];
const clone=<T>(data:T):T=>JSON.parse(JSON.stringify(data)) as T;
/** Simulates the transaction contract only, NOT a live Postgres execution. */
const rpc:ServiceRoleRpcClientV2={
 async rpc(name,args){
  seenRpcs.push(name);
  if(name===SOLO_SNAPSHOT_READ_RPC_V2){
   if(args.p_account_id!==scope.accountId||
      args.p_character_id!==scope.characterId)
    return {data:null,error:{message:'combat_v2_character_mismatch'}};
   return {data:stored?.encounterId===args.p_encounter_id?clone(stored):null,error:null};
  }
  if(name===SOLO_SNAPSHOT_RESERVE_RPC_V2){
   if(args.p_account_id!==scope.accountId||
      args.p_character_id!==scope.characterId)
    return {data:null,error:{message:'combat_v2_character_mismatch'}};
   if(stored){
    if(stored.snapshotDigest!==args.p_snapshot_digest)
     return {data:null,error:{message:'combat_v2_encounter_id_conflict'}};
    return {data:clone(stored),error:null};
   }
   if(args.p_expected_game_revision!==gameRevision)
    return {data:null,error:{message:'combat_v2_stale_game_revision'}};
   if(args.p_expected_build_revision!==buildRevision)
    return {data:null,error:{message:'combat_v2_stale_build_revision'}};
   if(args.p_character_fingerprint!=='a'.repeat(32))
    return {data:null,error:{message:'combat_v2_stale_character'}};
   const payload=args.p_payload as StoredSoloEncounterV2;
   assert.equal(payload.snapshotDigest,args.p_snapshot_digest);
   assert.equal(payload.accountId,args.p_account_id);
   assert.equal(payload.characterId,args.p_character_id);
   assert.equal(payload.encounterId,args.p_encounter_id);
   assert.equal(payload.schemaVersion,1);
   stored=clone(payload);
   successfulWrites++;
   return {data:clone(stored),error:null};
  }
  return {data:null,error:{message:'unexpected_rpc'}};
 },
};
const service=new SoloEncounterPersistenceServiceV2({
 storage:serviceRoleSoloSnapshotStorageV2(rpc),
 resolveFresh:source,
});
async function rejects(promise:Promise<unknown>,pattern:RegExp){
 await assert.rejects(promise,pattern);
}
async function run(){
 await rejects(service.reserve(scope),/feature_disabled/);
 await rejects(service.replay(scope),/feature_disabled/);
 await rejects(service.load(scope,true),/encounter_not_found/);
 await rejects(service.reserve({...scope,accountId:''},true),/invalid_trusted_scope/);
 const prepared=await service.reserve(scope,true);
 assert.equal(prepared.preparedKit.source,'server-persisted-v2');
 assert.equal(prepared.preparedKit.revision,1);
 assert.equal(successfulWrites,1);
 assert.equal(loadFreshCount,1);
 assert.equal(prepared.combatInput.enemies[0].id,basicEnemy.id);
 assert.equal(prepared.snapshotDigest,enemyV2SnapshotDigest(
  Object.fromEntries(Object.entries(prepared).filter(([k])=>k!=='snapshotDigest'))));
 const first=await service.replay(scope,true);
 const second=await service.replay(scope,true);
 assert.deepEqual(first,second,'Exact stored CombatInput replays deterministically');
 assert.ok(first.events.length>1);
 assert.equal(successfulWrites,1,'Replay never creates or updates a row');
 assert.equal(loadFreshCount,1,'Replay never rerolls traits or rereads equipment');
 gameRevision=99;buildRevision=55;sourceSeed='stale-mutation-seed';
 const retried=await service.reserve(scope,true);
 assert.deepEqual(retried,prepared,'Once reserved, retries must reuse initial snapshot');
 assert.equal(loadFreshCount,1,'Retry loads instead of recomputing new kit');
 assert.deepEqual(await service.replay(scope,true),first,
  'Gear/build changes elsewhere cannot rewrite an existing encounter');
 // Caller mutation must not change the stored snapshot or next replay.
 retried.combatInput.enemies[0].stats.attackPower=99999;
 retried.equipmentEvidence[0].statStages.afterAffixes.defense=99999;
 assert.deepEqual(await service.load(scope,true),prepared,
  'Service does not return mutable references to the saved row');
 assert.deepEqual(await service.replay(scope,true),first);
 const wrongAccount={...scope,accountId:'00000000-0000-4000-a000-000000000099'};
 await rejects(service.load(wrongAccount,true),/character_mismatch/);
 await rejects(service.reserve(wrongAccount,true),/character_mismatch/);
 const forged=clone(prepared);
 forged.combatInput.players[0].stats.attackPower+=4;
 assert.throws(()=>validateStoredSoloEncounterV2(scope,forged),/persisted_snapshot_digest_mismatch/);
 const forgedDigest={...forged,snapshotDigest:enemyV2SnapshotDigest(
  Object.fromEntries(Object.entries(forged).filter(([k])=>k!=='snapshotDigest')))};
 assert.throws(()=>validateStoredSoloEncounterV2(scope,forgedDigest),
  /invalid_equipment_source_evidence/);
 const enemyChanged=clone(prepared);
 enemyChanged.combatInput.enemies[0].stats.attackPower+=42;
 const enemyChangedUpdated={...enemyChanged,snapshotDigest:enemyV2SnapshotDigest(
  Object.fromEntries(Object.entries(enemyChanged).filter(([k])=>k!=='snapshotDigest')))};
 assert.throws(()=>validateStoredSoloEncounterV2(scope,enemyChangedUpdated),
  /persisted_enemy_replay_mismatch/);
 const kitChanged=clone(prepared);
 const wrongKit={...kitChanged,preparedKit:{...kitChanged.preparedKit,
  preparedEnemyDigest:'f'.repeat(64)}};
 const kitChangedUpdated={...wrongKit,snapshotDigest:enemyV2SnapshotDigest(
  Object.fromEntries(Object.entries(wrongKit).filter(([k])=>k!=='snapshotDigest')))};
 assert.throws(()=>validateStoredSoloEncounterV2(scope,kitChangedUpdated),
  /stored_kit_digest_mismatch/);
 assert.ok(seenRpcs.includes(SOLO_SNAPSHOT_READ_RPC_V2));
 assert.ok(seenRpcs.includes(SOLO_SNAPSHOT_RESERVE_RPC_V2));

 // A different character cannot use the same encounter even with a matched ID.
 const different={...scope,characterId:'00000000-0000-4000-a000-000000000077'};
 await rejects(service.load(different,true),/character_mismatch/);

 // Demonstrate fail-closed CAS for a NEW encounter (no row).
 stored=null;gameRevision=11;buildRevision=4;
 sourceSeed='persisted-solo-seed-original';
 await rejects(service.reserve(scope,true),/stale_game_revision/);
 stored=null;gameRevision=12;buildRevision=3;
 await rejects(service.reserve(scope,true),/stale_build_revision/);
 stored=null;gameRevision=12;buildRevision=4;
 const recovered=await service.reserve(scope,true);
 assert.equal(recovered.preparedKit.revision,1);
 assert.equal(successfulWrites,2);
 assert.equal(recovered.snapshotDigest,prepared.snapshotDigest);
 // In-memory CAS contention regression only: sixteen callers may compile the
 // same frozen candidate, but exactly one storage write can win. This does NOT
 // replace real Postgres transaction/concurrency validation on staging.
 stored=null;gameRevision=12;buildRevision=4;
 sourceSeed='persisted-solo-seed-original';
 const writesBefore=successfulWrites;
 const contenders=await Promise.all(Array.from({length:16},()=>service.reserve(scope,true)));
 assert.equal(successfulWrites,writesBefore+1,
  'Concurrent requests must not create additional immutable encounter rows');
 assert.ok(contenders.every(item=>item.snapshotDigest===contenders[0].snapshotDigest),
  'Concurrent retries must all read the identical first-write payload');
 assert.deepEqual(await service.replay(scope,true),first,
  'Replayed enemy traits and class abilities remain identical after contention');
 console.log('PASS: 16 concurrent in-memory CAS reservations, exactly one stored row, deterministic replay');
 console.log('PASS: service-role RPC mapping, immutable first-write-wins, byte-identical replay, stale revisions, forgery rejection');
}
void run().catch(error=>{console.error(error);process.exitCode=1;});
