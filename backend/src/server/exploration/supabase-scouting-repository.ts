import type {ScoutingRepository} from './scouting-persistence';
import type {ScoutingClaimResult,ScoutingDispatchResult,ScoutingMigrationResult,ScoutingSnapshotProjection} from './scouting-types';
export interface ServiceRpcClient{rpc<T=unknown>(name:string,args:Record<string,unknown>):Promise<{data:T|null;error:{message:string;code?:string}|null}>}
function result<T>(r:{data:T|null;error:{message:string;code?:string}|null}){if(r.error)throw Error(`scouting_persistence:${r.error.code??'unknown'}:${r.error.message}`);if(!r.data)throw Error('scouting_empty_response');return structuredClone(r.data)}
/** Server/service repository only. Never instantiate this with a browser/client key. */
export class SupabaseScoutingRepository implements ScoutingRepository{
 constructor(private readonly client:ServiceRpcClient){}
 async snapshot(accountId:string,characterId:string){return result(await this.client.rpc<ScoutingSnapshotProjection>('scouting_snapshot_server_v1',{p_account_id:accountId,p_character_id:characterId}))}
 async dispatch(input:Parameters<ScoutingRepository['dispatch']>[0]){return result(await this.client.rpc<ScoutingDispatchResult>('scouting_dispatch_server_v1',{p_account_id:input.accountId,p_character_id:input.characterId,p_command:input.command,p_request_id:input.requestId,p_now:new Date(input.nowMs).toISOString()}))}
 async claim(input:Parameters<ScoutingRepository['claim']>[0]){return result(await this.client.rpc<ScoutingClaimResult>('scouting_claim_server_v1',{p_account_id:input.accountId,p_character_id:input.characterId,p_assignment_id:input.assignmentId,p_request_id:input.requestId,p_now:new Date(input.nowMs).toISOString()}))}
 async migrateAccount(input:Parameters<ScoutingRepository['migrateAccount']>[0]){return result(await this.client.rpc<ScoutingMigrationResult>('scouting_migrate_account_server_v1',{p_account_id:input.accountId,p_now:new Date(input.nowMs).toISOString()}))}
}
