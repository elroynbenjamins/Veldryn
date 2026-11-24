/** Private Live Combat 2.0 recovery boundary. Not mounted on routes.
 * Reuse the service-role runtime repository; do not read current equipment or
 * rebuild an encounter on reconnect. This prepares/reads review snapshots only;
 * the CAS writer and complete trait/enemy receipt persistence are separate.
 */
import type {CoopRuntimeState,SupabaseCoopRuntimeRepository} from '../../coop/repositories/supabase-runtime';
import {enemyV2SnapshotDigest} from './enemy-engine-authority';
import {reviewPartyV2RunBinding,type PartyV2RunBindingReview} from './party-dungeon-persistence-review';

export const PARTY_ENCOUNTER_RECOVERY_SCHEMA_V2=1 as const;
export type PartyEncounterReviewInputV2=Parameters<typeof reviewPartyV2RunBinding>[0];
export interface PartyEncounterRecoverySnapshotV2 {
 readonly schemaVersion:typeof PARTY_ENCOUNTER_RECOVERY_SCHEMA_V2;
 readonly source:'party-v2-recovery-review';
 readonly reviewInput:PartyEncounterReviewInputV2;
 readonly binding:PartyV2RunBindingReview;
 readonly snapshotDigest:string;
}
export interface TrustedPartyRecoveryIdentityV2 {
 readonly runId:string;
 readonly accountId:string;
 readonly characterId:string;
}
function fail(reason:string):never{throw Error('party_v2_recovery_'+reason);}
const validId=(x:unknown):x is string=>typeof x==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(x);
const detached=<T>(value:T):T=>{
 const before=enemyV2SnapshotDigest(value);
 const copy=JSON.parse(JSON.stringify(value)) as T;
 if(enemyV2SnapshotDigest(copy)!==before)fail('non_serializable_snapshot');
 return copy;
};
/** Candidate only. stateRevision must be the version the atomic reservation
 * will commit, not its expected pre-write version. No persistence occurs here. */
export function preparePartyRecoverySnapshotV2(input:PartyEncounterReviewInputV2):PartyEncounterRecoverySnapshotV2{
 const reviewInput=detached(input);
 const binding=reviewPartyV2RunBinding(reviewInput).binding;
 const payload={schemaVersion:PARTY_ENCOUNTER_RECOVERY_SCHEMA_V2,
  source:'party-v2-recovery-review' as const,reviewInput,binding};
 return detached({...payload,snapshotDigest:enemyV2SnapshotDigest(payload)});
}
/** The runtime row must come from a participant-authorized service-role read.
 * This function validates the stored candidate; it does not authorize combat. */
export function reviewStoredPartyRecoveryV2(
 runtime:CoopRuntimeState,identity:TrustedPartyRecoveryIdentityV2,
):PartyEncounterRecoverySnapshotV2{
 if(!identity||!validId(identity.runId)||!validId(identity.accountId)||!validId(identity.characterId))
  fail('invalid_identity');
 if(!runtime||runtime.runId!==identity.runId||runtime.mode!=='live'||
    runtime.phase!=='resolving_node'||!validId(runtime.currentNodeId)||
    !Number.isSafeInteger(runtime.stateVersion)||runtime.stateVersion<1)
  fail('invalid_runtime_scope');
 const state=runtime.privateState;
 if(!state||typeof state!=='object'||Array.isArray(state)||
    !Object.prototype.hasOwnProperty.call(state,'combatV2EncounterReview'))
  fail('snapshot_missing');
 const row=(state as {combatV2EncounterReview:PartyEncounterRecoverySnapshotV2}).combatV2EncounterReview;
 if(!row||row.schemaVersion!==PARTY_ENCOUNTER_RECOVERY_SCHEMA_V2||
    row.source!=='party-v2-recovery-review'||!row.reviewInput||!row.binding||
    typeof row.snapshotDigest!=='string'||!/^[0-9a-f]{64}$/.test(row.snapshotDigest))
  fail('invalid_snapshot');
 const {snapshotDigest,...payload}=row;
 if(enemyV2SnapshotDigest(payload)!==snapshotDigest)fail('snapshot_digest_mismatch');
 const rebuilt=reviewPartyV2RunBinding(row.reviewInput).binding;
 if(enemyV2SnapshotDigest(rebuilt)!==enemyV2SnapshotDigest(row.binding))
  fail('binding_mismatch');
 if(rebuilt.runId!==runtime.runId||rebuilt.nodeId!==runtime.currentNodeId||
    rebuilt.stateRevision!==runtime.stateVersion)
  fail('stale_snapshot');
 if(!rebuilt.members.some(member=>member.accountId===identity.accountId&&
    member.characterId===identity.characterId))fail('not_frozen_participant');
 return detached(row);
}
/** Server-only read; trusted identity must originate in the authenticated
 * session and its owned character, never request-supplied account IDs. */
export async function loadPartyRecoverySnapshotV2(
 repository:Pick<SupabaseCoopRuntimeRepository,'load'>,
 identity:TrustedPartyRecoveryIdentityV2,serverEnabled=false,
):Promise<PartyEncounterRecoverySnapshotV2>{
 if(!serverEnabled)fail('disabled');
 if(!identity||!validId(identity.runId)||!validId(identity.accountId)||!validId(identity.characterId))
  fail('invalid_identity');
 const runtime=await repository.load(identity.runId,identity.accountId);
 return reviewStoredPartyRecoveryV2(runtime,identity);
}
