import { CoopDomainError } from '../errors';
import type { CoopMode, CoopRunPhase } from '../../../shared/coop-types';

export interface RpcError { message:string; code?:string; }
export interface ServiceRoleRpcClient {
  rpc<T>(name:string,args:Record<string,unknown>):Promise<{data:T|null;error:RpcError|null}>;
}

export interface CoopRuntimeState {
  runId:string; mode:CoopMode; phase:CoopRunPhase; stateVersion:number;
  currentNodeId?:string; clearedPreBossCount:number; privateState:unknown;
  clientProjection:unknown; eventCursor:number;
}

export interface CoopRuntimeCommit {
  runId:string; actorAccountId:string; expectedStateVersion:number; phase:CoopRunPhase;
  currentNodeId?:string; clearedPreBossCount:number; privateState:unknown;
  clientProjection:unknown; eventCursor:number; eventType:string;
  eventPayload:unknown; semanticKey:string;
}

export interface ClaimedDueJob {
  id:string; semantic_key:string; job_kind:string; resource_id:string; due_at:string;
  status:'leased'; lease_until:string; lease_owner:string; fencing_generation:number;
  attempt:number; payload:unknown;
}

export interface ReservedMatchMember {
  ticketId:string;accountId:string;characterId:string;role:'tank'|'damage'|'support';
  loadoutId:string;loadoutRevision:number;loadoutSnapshotHash:string;
  originalEnqueuedAt:string;reservationId:string;reservationExpiresAt:string;
}

function domainError(error:RpcError):Error {
  const message=error.message.toUpperCase();
  if(message.includes('STALE_STATE'))return new CoopDomainError('stale_state');
  if(message.includes('NOT_PARTICIPANT'))return new CoopDomainError('not_participant');
  if(message.includes('RESERVATION_CONFLICT'))return new CoopDomainError('reservation_conflict');
  return new Error(`coop_persistence:${error.code??'unknown'}:${error.message}`);
}

export class SupabaseCoopRuntimeRepository {
  constructor(private readonly client:ServiceRoleRpcClient){}

  async load(runId:string,actorAccountId:string):Promise<CoopRuntimeState>{
    const result=await this.client.rpc<CoopRuntimeState>('load_coop_runtime_server_v1',{
      p_run_id:runId,p_actor_account_id:actorAccountId,
    });
    if(result.error)throw domainError(result.error);
    if(!result.data)throw new Error('run_not_found');
    return structuredClone(result.data);
  }

  async compareAndSet(input:CoopRuntimeCommit):Promise<{runId:string;stateVersion:number;eventCursor:number}>{
    const result=await this.client.rpc<{runId:string;stateVersion:number;eventCursor:number}>('commit_coop_runtime_server_v1',{
      p_run_id:input.runId,p_actor_account_id:input.actorAccountId,
      p_expected_state_version:input.expectedStateVersion,p_phase:input.phase,
      p_current_node_id:input.currentNodeId??null,p_cleared_pre_boss_count:input.clearedPreBossCount,
      p_private_state:input.privateState,p_client_projection:input.clientProjection,
      p_event_cursor:input.eventCursor,p_event_type:input.eventType,
      p_event_payload:input.eventPayload,p_semantic_key:input.semanticKey,
    });
    if(result.error)throw domainError(result.error);
    if(!result.data)throw new Error('empty_commit_response');
    return structuredClone(result.data);
  }

  async claimDueJobs(workerId:string,limit=16,leaseMs=30_000):Promise<ClaimedDueJob[]>{
    const result=await this.client.rpc<ClaimedDueJob[]>('claim_coop_due_jobs_server_v1',{
      p_worker_id:workerId,p_limit:limit,p_lease_ms:leaseMs,
    });
    if(result.error)throw domainError(result.error);
    return structuredClone(result.data??[]);
  }

  async reserveMatch(ticketIds:readonly string[],reservationId:string,now:string,expiresAt:string,readinessFloor=.8):Promise<ReservedMatchMember[]>{
    if(ticketIds.length!==4||new Set(ticketIds).size!==4)throw new Error('invalid_reservation_request');
    const result=await this.client.rpc<ReservedMatchMember[]>('reserve_coop_match_server_v1',{
      p_ticket_ids:[...ticketIds],p_reservation_id:reservationId,p_now:now,p_expires_at:expiresAt,p_readiness_floor:readinessFloor,
    });
    if(result.error)throw domainError(result.error);
    if(!result.data||result.data.length!==4)throw new Error('invalid_reservation_response');
    return structuredClone(result.data);
  }

  async releaseExpiredReservations(now:string):Promise<number>{
    const result=await this.client.rpc<number>('release_expired_coop_reservations_server_v1',{p_now:now});
    if(result.error)throw domainError(result.error);
    return result.data??0;
  }
}
