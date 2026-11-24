/** Hidden staged reservation adapter. Requires a server-selected resolving
 * node and independently staged private snapshot. Never mount on live routes.
 * Uses existing co-op CAS, not a second storage system or reward writer.
 */
import type {CoopRuntimeState,SupabaseCoopRuntimeRepository} from '../../coop/repositories/supabase-runtime';
import {reviewStoredPartyRecoveryV2,type PartyEncounterRecoverySnapshotV2,type TrustedPartyRecoveryIdentityV2} from './party-encounter-recovery';

type Repository=Pick<SupabaseCoopRuntimeRepository,'load'|'compareAndSet'>;
/** Server-derived intent for a specific staged encounter, not client DTO. */
export interface TrustedPartyReservationIntentV2 extends TrustedPartyRecoveryIdentityV2 {
 readonly nodeId:string;
 readonly encounterRevision:number;
 readonly snapshotDigest:string;
}
function fail(reason:string):never{throw Error('party_v2_reservation_'+reason);}
function privateState(runtime:CoopRuntimeState):Record<string,unknown>{
 const state=runtime.privateState;
 if(!state||typeof state!=='object'||Array.isArray(state))fail('invalid_private_state');
 return state as Record<string,unknown>;
}
const has=(state:Record<string,unknown>,key:string)=>Object.prototype.hasOwnProperty.call(state,key);
const validId=(value:unknown):value is string=>typeof value==='string'&&/^[A-Za-z0-9:_-]{1,128}$/.test(value);
function validateIdentity(identity:TrustedPartyRecoveryIdentityV2){
 if(!identity||!validId(identity.runId)||!validId(identity.accountId)||!validId(identity.characterId))fail('invalid_identity');
}
function assertIntent(snapshot:PartyEncounterRecoverySnapshotV2,intent:TrustedPartyReservationIntentV2){
 if(snapshot.binding.nodeId!==intent.nodeId||snapshot.binding.encounterRevision!==intent.encounterRevision||
    snapshot.snapshotDigest!==intent.snapshotDigest)fail('encounter_intent_mismatch');
 return snapshot;
}
/** Read active reservation first; only promote a pending snapshot from the
 * authorized runtime read. The pending snapshot must target the NEXT version.
 * No route selection, caller-supplied snapshot, equipment lookup or simulation.
 */
export async function reserveStagedPartyEncounterV2(
 repository:Repository,identity:TrustedPartyReservationIntentV2,serverEnabled=false,
):Promise<PartyEncounterRecoverySnapshotV2>{
 if(!serverEnabled)fail('disabled');
 validateIdentity(identity);
 if(!validId(identity.nodeId)||!Number.isSafeInteger(identity.encounterRevision)||identity.encounterRevision<1||
    typeof identity.snapshotDigest!=='string'||!/^[0-9a-f]{64}$/.test(identity.snapshotDigest))fail('invalid_encounter_intent');
 identity=Object.freeze({...identity});
 const runtime=await repository.load(identity.runId,identity.accountId);
 const state=privateState(runtime);
 if(has(state,'combatV2EncounterReview')){
  if(has(state,'combatV2PendingEncounterReview'))fail('ambiguous_reservation');
  return assertIntent(reviewStoredPartyRecoveryV2(runtime,identity),identity);
 }
 if(!has(state,'combatV2PendingEncounterReview'))fail('pending_snapshot_missing');
 if(!Number.isSafeInteger(runtime.stateVersion)||runtime.stateVersion<1||runtime.stateVersion>=Number.MAX_SAFE_INTEGER||
    !Number.isSafeInteger(runtime.eventCursor)||runtime.eventCursor<0||runtime.eventCursor>=Number.MAX_SAFE_INTEGER)
  fail('invalid_runtime_version');
 const {combatV2PendingEncounterReview:pending,...remaining}=state;
 const nextVersion=runtime.stateVersion+1;
 const nextState={...remaining,combatV2EncounterReview:pending};
 const candidate=assertIntent(reviewStoredPartyRecoveryV2({...runtime,stateVersion:nextVersion,privateState:nextState},identity),identity);
 // Only the reserved digest may win. A stale caller reloads the winner, never
 // overwrites or retries with a newly compiled encounter.
 const readWinner=async()=>{
  const found=await repository.load(identity.runId,identity.accountId);
  if(has(privateState(found),'combatV2PendingEncounterReview'))fail('ambiguous_reservation');
  const winner=reviewStoredPartyRecoveryV2(found,identity);
  if(winner.snapshotDigest!==candidate.snapshotDigest)fail('conflicting_reservation');
  return assertIntent(winner,identity);
 };
 const eventCursor=runtime.eventCursor+1;
 let committed:Awaited<ReturnType<Repository['compareAndSet']>>;
 try{
  committed=await repository.compareAndSet({runId:identity.runId,actorAccountId:identity.accountId,
   expectedStateVersion:runtime.stateVersion,phase:runtime.phase,currentNodeId:runtime.currentNodeId,
   clearedPreBossCount:runtime.clearedPreBossCount,privateState:nextState,
   clientProjection:runtime.clientProjection,eventCursor,eventType:'combat_v2_encounter_reserved',
   eventPayload:{nodeId:runtime.currentNodeId},semanticKey:'combat_v2_reserve:'+identity.runId+':'+candidate.binding.encounterRevision});
 }catch(error){
  if(error&&typeof error==='object'&&'code' in error&&error.code==='stale_state')return readWinner();
  throw error;
 }
 if(committed.runId!==identity.runId||committed.stateVersion!==nextVersion||committed.eventCursor!==eventCursor)
  fail('invalid_commit_receipt');
 return readWinner();
}
