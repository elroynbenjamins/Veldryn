/**
 * Hidden, server-only first-write-wins Combat 2.0 SOLO snapshot service.
 * Not an HTTP route, reward writer, dungeon state converter or scheduler.
 *
 * The persistence port MUST be backed by the service-role-only SQL migration:
 * character ownership + online game/build revision checks, one atomic insert,
 * immutable stored readback, and no SQL endpoint callable by client JWTs.
 */
import type {CombatInput,CombatResult,CombatantDefinition} from '../types';
import {simulateCombat} from '../engine';
import {enemyV2SnapshotDigest,issueEnemyV2EngineAuthority} from './enemy-engine-authority';
import {verifyPersistedEnemyKitsV2,
 type EnemyKitCandidateV2,type PersistedEnemyKitV2} from './enemy-kit-composer';
import type {EquipmentEncounterEvidenceV2} from './unified-equipment-encounter';

export const SOLO_ENCOUNTER_SNAPSHOT_SCHEMA_V2=1 as const;
export interface TrustedSoloIdentityV2 {
 readonly accountId:string;
 readonly characterId:string;
 readonly encounterId:string;
}
/** Created ONLY after authoritative class, build, gear and Enemy V2 compilers
 * resolve their respective source records. Not a request/JSON DTO. */
export interface TrustedCompiledSoloSourceV2 {
 readonly source:'server-compiled-v2';
 readonly gameRevision:number;
 readonly buildRevision:number;
 readonly characterFingerprint:string;
 readonly combatInput:CombatInput;
 readonly baseEnemies:readonly CombatantDefinition[];
 readonly enemyKit:EnemyKitCandidateV2;
 readonly equipmentEvidence:readonly EquipmentEncounterEvidenceV2[];
}
export interface StoredSoloEncounterV2 {
 readonly schemaVersion:typeof SOLO_ENCOUNTER_SNAPSHOT_SCHEMA_V2;
 readonly encounterId:string;
 readonly accountId:string;
 readonly characterId:string;
 readonly actorId:string;
 readonly gameRevision:number;
 readonly buildRevision:number;
 readonly characterFingerprint:string;
 readonly combatInput:CombatInput;
 readonly baseEnemies:readonly CombatantDefinition[];
 readonly preparedKit:PersistedEnemyKitV2;
 readonly equipmentEvidence:readonly EquipmentEncounterEvidenceV2[];
 readonly snapshotDigest:string;
}
export interface SoloEncounterReserveRequestV2 {
 readonly scope:TrustedSoloIdentityV2;
 readonly expectedGameRevision:number;
 readonly expectedBuildRevision:number;
 readonly expectedCharacterFingerprint:string;
 readonly snapshotDigest:string;
 readonly snapshot:StoredSoloEncounterV2;
}
export interface SoloEncounterStorageV2 {
 /** Authenticated by a service-role server. Unknown ID -> null. */
 load(scope:TrustedSoloIdentityV2):Promise<StoredSoloEncounterV2|null>;
 /** CAS + first-write-wins, never UPSERT/UPDATE; retry returns original bytes.
  * Must atomically recheck account/character ownership, online game and build
  * revisions under DB locks for the first insert. Never derive from client. */
 reserveOnce(request:SoloEncounterReserveRequestV2):Promise<StoredSoloEncounterV2>;
}
export interface SoloEncounterServiceDependenciesV2 {
 readonly storage:SoloEncounterStorageV2;
 /** Calls trusted DB/auth/equipment/skills/enemy source modules, not request
  * contents. Must be omitted entirely on replay/retry when row exists. */
 readonly resolveFresh:(scope:TrustedSoloIdentityV2)=>Promise<TrustedCompiledSoloSourceV2>;
}
const id=(s:unknown)=>typeof s==='string'&&s.length>0&&s.length<=128&&
 /^[A-Za-z0-9:_-]+$/.test(s);
const fail=(reason:string):never=>{throw Error('combat_v2_solo_'+reason);};
const unsigned=(x:unknown)=>Number.isSafeInteger(x)&&(x as number)>=0;
const same=(a:unknown,b:unknown)=>enemyV2SnapshotDigest(a)===enemyV2SnapshotDigest(b);
/** DB JSONB canonicalization removes undefined values and normalizes keys.
 * Hash before cloning to reject cyclic, nonfinite, executable data. */
const detached=<T>(data:T):T=>{
 const digest=enemyV2SnapshotDigest(data);
 const clone=JSON.parse(JSON.stringify(data)) as T;
 if(enemyV2SnapshotDigest(clone)!==digest)fail('non_serializable_snapshot');
 return clone;
};
const validateScope=(scope:TrustedSoloIdentityV2)=>{
 if(!scope||!id(scope.encounterId)||!id(scope.accountId)||
    !id(scope.characterId))fail('invalid_trusted_scope');
};
const digestPayload=(row:Omit<StoredSoloEncounterV2,'snapshotDigest'>)=>
 enemyV2SnapshotDigest(row);
function validateStored(
 scope:TrustedSoloIdentityV2,row:StoredSoloEncounterV2,
):StoredSoloEncounterV2{
 validateScope(scope);
 if(!row||row.schemaVersion!==1||
    row.accountId!==scope.accountId||row.characterId!==scope.characterId||
    row.encounterId!==scope.encounterId||!id(row.actorId)||
    !unsigned(row.gameRevision)||!unsigned(row.buildRevision)||
    typeof row.characterFingerprint!=='string'||
    !/^[0-9a-f]{32}$/.test(row.characterFingerprint)||
    typeof row.snapshotDigest!=='string'||!/^[0-9a-f]{64}$/.test(row.snapshotDigest))
   fail('invalid_persisted_snapshot_scope');
 const {snapshotDigest,...payload}=row;
 if(!same(snapshotDigest,digestPayload(payload)))fail('persisted_snapshot_digest_mismatch');
 const input=row.combatInput,kit=row.preparedKit;
 if(!input||!Array.isArray(input.players)||input.players.length!==1||
    !Array.isArray(input.enemies)||input.enemies.length<1||input.enemies.length>4||
    !Array.isArray(row.baseEnemies)||row.baseEnemies.length!==input.enemies.length||
    input.players[0].id!==row.actorId||input.players[0].team!=='players'||
    input.players[0].combatV2?.version!==2||
    !id(input.seed)||input.enemyDamageProfile!==undefined||
    input.initialPlayerState!==undefined||
    !kit||kit.source!=='server-persisted-v2'||kit.revision!==1||
    kit.mode!=='solo'||kit.encounterId!==row.encounterId||
    kit.seed!==input.seed||kit.enemyIds.length!==input.enemies.length||
    kit.enemyIds.some((enemyId,i)=>input.enemies[i].id!==enemyId)||
    !Array.isArray(row.equipmentEvidence)||row.equipmentEvidence.length!==1||
    row.equipmentEvidence[0].actorId!==row.actorId||
    !id(row.equipmentEvidence[0].classPolicyVersion))
   fail('invalid_persisted_snapshot_contract');
 verifyPersistedEnemyKitsV2(row.baseEnemies,kit);
 if(!same(kit.preparedEnemies,input.enemies))
   fail('persisted_enemy_replay_mismatch');
 if(row.equipmentEvidence.some(e=>!e.baseSources||!e.setEffects||!e.affixSources||
   !e.statStages||!same(e.statStages.afterAffixes,input.players[0].stats)))
   fail('invalid_equipment_source_evidence');
 return detached(row);
}
/** Exposed only to server-port tests; does not issue a combat token. */
export function validateStoredSoloEncounterV2(
 scope:TrustedSoloIdentityV2,row:StoredSoloEncounterV2,
):StoredSoloEncounterV2{
 return validateStored(scope,row);
}
function prepareFresh(
 scope:TrustedSoloIdentityV2,source:TrustedCompiledSoloSourceV2,
):StoredSoloEncounterV2{
 if(!source||source.source!=='server-compiled-v2'||
    !unsigned(source.gameRevision)||!unsigned(source.buildRevision)||
    typeof source.characterFingerprint!=='string'||
    !/^[0-9a-f]{32}$/.test(source.characterFingerprint)||
    !source.enemyKit||source.enemyKit.source!=='unpersisted-candidate-v2'||
    source.enemyKit.encounterId!==scope.encounterId||
    !Array.isArray(source.baseEnemies)||!Array.isArray(source.equipmentEvidence))
   fail('untrusted_compiled_source');
 // Convert candidate -> persisted row shape ONLY for the privileged atomic
 // reservation. The receipt is not trusted until storage readback verifies it.
 const kit:PersistedEnemyKitV2={...source.enemyKit,
  source:'server-persisted-v2',revision:1};
 const unsignedRow={
  schemaVersion:1 as const,encounterId:scope.encounterId,
  accountId:scope.accountId,characterId:scope.characterId,
  actorId:source.combatInput?.players?.[0]?.id??'',
  gameRevision:source.gameRevision,buildRevision:source.buildRevision,
  characterFingerprint:source.characterFingerprint,
  combatInput:source.combatInput,baseEnemies:source.baseEnemies,
  preparedKit:kit,equipmentEvidence:source.equipmentEvidence,
 };
 const fixed=detached(unsignedRow);
 const row:StoredSoloEncounterV2={...fixed,snapshotDigest:digestPayload(fixed)};
 return validateStored(scope,row);
}
export class SoloEncounterPersistenceServiceV2 {
 constructor(private readonly deps:SoloEncounterServiceDependenciesV2){}

 /** On retry load the FIRST authoritative row, never call trait RNG,
  * source compiler, item ledger or class build service again. */
 async reserve(
   scope:TrustedSoloIdentityV2,serverEnabled=false,
 ):Promise<StoredSoloEncounterV2>{
  if(!serverEnabled)fail('feature_disabled');
  validateScope(scope);
  const prior=await this.deps.storage.load(scope);
  if(prior)return validateStored(scope,prior);
  const source=await this.deps.resolveFresh(scope);
  const row=prepareFresh(scope,source);
  const saved=await this.deps.storage.reserveOnce({
   scope,expectedGameRevision:row.gameRevision,
   expectedBuildRevision:row.buildRevision,
   expectedCharacterFingerprint:row.characterFingerprint,
   snapshotDigest:row.snapshotDigest,snapshot:row,
  });
  const persisted=validateStored(scope,saved);
  if(persisted.snapshotDigest!==row.snapshotDigest)
   fail('conflicting_first_write');
  return persisted;
 }
 async load(
  scope:TrustedSoloIdentityV2,serverEnabled=false,
 ):Promise<StoredSoloEncounterV2>{
  if(!serverEnabled)fail('feature_disabled');
  validateScope(scope);
  const stored=await this.deps.storage.load(scope);
  if(!stored)fail('encounter_not_found');
  return validateStored(scope,stored);
 }
 /** Deterministic calculation only, NO rewards or DB mutation.
  * Always re-load from the server store; never accept client combatInput. */
 async replay(
  scope:TrustedSoloIdentityV2,serverEnabled=false,
 ):Promise<CombatResult>{
  const snapshot=await this.load(scope,serverEnabled);
  const input=detached(snapshot.combatInput);
  const kit=snapshot.preparedKit;
  // The persistence port is already the authoritative read path and scope
  // verifier. The exact kit/actor hash was checked by validateStored.
  const authority=issueEnemyV2EngineAuthority({
   source:'server-persisted-v2',version:2,ruleset:kit.ruleset,
   mode:'solo',encounterId:scope.encounterId,
   revision:kit.revision,seed:kit.seed,
   playerIds:input.players.map(p=>p.id),
   enemyIds:kit.enemyIds,bossIds:kit.bossIds,
  },input,(_evidence,digest)=>digest===enemyV2SnapshotDigest(input));
  return simulateCombat(input,authority);
 }
}
