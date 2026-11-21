/**
 * Service-role Supabase RPC port for private Combat V2 solo snapshots.
 * Inject ONLY a privileged server client (never a user's Authorization/JWT).
 * This adapter intentionally provides no public endpoint, combat settlement,
 * currency writes, dungeon reward path or feature activation.
 */
import type {
 SoloEncounterStorageV2,StoredSoloEncounterV2,TrustedSoloIdentityV2,
 SoloEncounterReserveRequestV2,
} from './solo-encounter-persistence';

interface RpcResponseV2 {
 readonly data:unknown;
 readonly error:{readonly message:string;readonly code?:string}|null;
}
export interface ServiceRoleRpcClientV2 {
 rpc(name:string,params:Readonly<Record<string,unknown>>):Promise<RpcResponseV2>;
}
export const SOLO_SNAPSHOT_READ_RPC_V2='combat_v2_solo_read_server_v1';
export const SOLO_SNAPSHOT_RESERVE_RPC_V2='combat_v2_solo_reserve_server_v1';

function row(data:unknown):StoredSoloEncounterV2|null {
 if(data===null)return null;
 if(!data||typeof data!=='object'||Array.isArray(data))
  throw Error('combat_v2_solo_invalid_rpc_readback');
 return data as StoredSoloEncounterV2;
}
function requireReadback(data:unknown):StoredSoloEncounterV2 {
 const found=row(data);
 if(!found)throw Error('combat_v2_solo_missing_rpc_reservation');
 return found;
}
export function serviceRoleSoloSnapshotStorageV2(
 serverRpc:ServiceRoleRpcClientV2,
):SoloEncounterStorageV2{
 if(!serverRpc||typeof serverRpc.rpc!=='function')
  throw Error('combat_v2_solo_service_role_rpc_required');
 const call=async(name:string,args:Record<string,unknown>):Promise<unknown>=>{
  const result=await serverRpc.rpc(name,args);
  if(result?.error)
   throw Error(result.error.message||'combat_v2_solo_rpc_error');
  if(!result||!('data' in result))
   throw Error('combat_v2_solo_missing_rpc_response');
  return result.data;
 };
 return {
  async load(scope:TrustedSoloIdentityV2){
   return row(await call(SOLO_SNAPSHOT_READ_RPC_V2,{
    p_account_id:scope.accountId,
    p_character_id:scope.characterId,
    p_encounter_id:scope.encounterId,
   }));
  },
  async reserveOnce(request:SoloEncounterReserveRequestV2){
   const {scope,snapshot}=request;
   return requireReadback(await call(SOLO_SNAPSHOT_RESERVE_RPC_V2,{
    p_account_id:scope.accountId,
    p_character_id:scope.characterId,
    p_encounter_id:scope.encounterId,
    p_expected_game_revision:request.expectedGameRevision,
    p_expected_build_revision:request.expectedBuildRevision,
    p_character_fingerprint:request.expectedCharacterFingerprint,
    p_snapshot_digest:request.snapshotDigest,
    p_payload:snapshot,
   }));
  },
 };
}
