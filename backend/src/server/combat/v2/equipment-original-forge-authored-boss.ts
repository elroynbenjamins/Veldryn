/**
 * HIDDEN EQ2 / Skills / genuine regional Enemy 2.0 boss bridge.
 *
 * This is a server-only QA adapter, NOT a live route or equipment release.
 * It uses the original Forge frozen mint/claim/custody compiler (not synthetic
 * unscaled Combat equipment) and the canonical persisted authored solo kits
 * (not the generic pressure-phase enemy bridge). Both independent verification
 * callbacks are placeholders for future privileged locked transactions.
 */
import {simulateCombat} from '../engine';
import type {CombatInput,CombatResult} from '../types';
import {compileRealFrozenForgeActorV2,
 type TrustedFrozenForgeCombatSourceV2,type FrozenForgeEvidenceV2,
} from './equipment-frozen-forge-bridge';
import type {VerifiedSkillBuildV2} from './skill-effects';
import {verifyPersistedEnemyKitsV2,
 type PersistedEnemyKitV2} from './enemy-kit-composer';
import {issueEnemyV2EngineAuthority} from './enemy-engine-authority';

export interface TrustedOriginalForgeAuthoredBossKitV2{
 readonly snapshot:PersistedEnemyKitV2;
 /** Must be bound to privileged, immutable encounter storage. A QA callback
  * does not imply production authentication or grant authorization. */
 readonly verifyPersisted:(snapshot:PersistedEnemyKitV2,
   combatInputDigest:string)=>boolean;
}
export interface OriginalForgeAuthoredBossReviewV2{
 readonly combat:CombatResult;
 readonly equipmentEvidence:FrozenForgeEvidenceV2;
 readonly bossMechanicLabels:readonly string[];
 readonly authenticBossProfile:true;
 readonly equipmentSource:'ORIGINAL_EQ2_MINT_AND_CUSTODY_TEST_LEDGER';
 readonly grantAllowed:false;
 readonly marketTradeAllowed:false;
 readonly releaseApproved:false;
}
const deny=(why:string):never=>{throw Error('eq2_authored_boss_'+why);};
/**
 * Only newly started SOLO regional authored-boss encounters; the existing
 * party/dungeon and non-solo flows have distinct custody+reward guarantees.
 * Require both server-gated source compilers, not user-provided input fields.
 */
export function simulateOriginalForgeAuthoredBossReviewV2(
 input:CombatInput,build:VerifiedSkillBuildV2,
 source:TrustedFrozenForgeCombatSourceV2,
 bossKit:TrustedOriginalForgeAuthoredBossKitV2,
 serverEnabled=false,
):OriginalForgeAuthoredBossReviewV2{
 if(!serverEnabled)deny('release_gate_off');
 if(!input||!Array.isArray(input.players)||input.players.length!==1||
  !Array.isArray(input.enemies)||input.enemies.length!==1||
  input.enemies[0].boss!==true||
  !build||!source||!bossKit||
  !bossKit.snapshot||typeof bossKit.verifyPersisted!=='function'||
  input.enemyDamageProfile!==undefined||
  (input.initialPlayerState&&Object.keys(input.initialPlayerState).length>0))
  deny('source_only_complete_solo_boss_required');
 if(input.players[0]!==build.actor||input.players[0].id!==source.actorId||
  bossKit.snapshot.seed!==input.seed||
  bossKit.snapshot.enemyIds.length!==1||
  bossKit.snapshot.bossIds.length!==1||
  bossKit.snapshot.bossIds[0]!==input.enemies[0].id)
  deny('encounter_actor_seed_or_boss_mismatch');
 // Validate stored Enemy 2.0 boss kit (no second V2 generic kit). This
 // checks source digest, copied abilities, phase IDs and regional identity.
 const verified=verifyPersistedEnemyKitsV2(input.enemies,bossKit.snapshot);
 const original=compileRealFrozenForgeActorV2(input.players[0],build,source);
 const compiled:CombatInput={...input,players:[original.actor],
  enemies:[...verified.enemies]};
 const snapshot=bossKit.snapshot;
 const authority=issueEnemyV2EngineAuthority({
  source:'server-persisted-v2',version:2,ruleset:snapshot.ruleset,
  mode:'solo',encounterId:snapshot.encounterId,revision:snapshot.revision,
  seed:snapshot.seed,playerIds:[original.actor.id],
  enemyIds:snapshot.enemyIds,bossIds:snapshot.bossIds,
 },compiled,(_scope,digest)=>bossKit.verifyPersisted(snapshot,digest));
 const fight=simulateCombat(compiled,authority);
 return {
  combat:fight,equipmentEvidence:original.evidence,
  bossMechanicLabels:verified.preview.flatMap(row=>[
   ...row.abilityNames.map(name=>row.enemyId+': '+name),
   ...row.phaseNames.map(name=>row.enemyId+': '+name),
  ]),
  authenticBossProfile:true,
  equipmentSource:'ORIGINAL_EQ2_MINT_AND_CUSTODY_TEST_LEDGER',
  grantAllowed:false,marketTradeAllowed:false,releaseApproved:false,
 };
}
