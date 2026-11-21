import {assertEquipmentCraftingV2Released} from './equipment-crafting-v2-gate';
import {
 resolveEquipmentV2DraftCommand,V2DraftCraftError,
 type V2DraftCommand,type V2DraftContext,type V2DraftReceiptResponse,type V2DraftSnapshot,
} from './equipment-crafting-v2-transaction';

/** Isolated test/staging SQL shadow store. Not connected to the live Forge
 * or an Edge route, and NOT suitable as a second production wallet ledger.
 * RPC transport MUST be a server-side service-role client, never the mobile
 * public Supabase client or caller-selected account.
 */
export interface V2ShadowServiceRpc {
 rpc<T>(name:string,args:Record<string,unknown>):Promise<T>;
}
export type V2ShadowReadResult=
 |{status:'unseeded'}
 |{status:'loaded';snapshot:V2DraftSnapshot};
export type V2ShadowCommitResult=
 |{status:'committed';response:V2DraftReceiptResponse;version:number}
 |{status:'replayed';response:V2DraftReceiptResponse}
 |{status:'stale';version:number}
 |{status:'conflict'}
 |{status:'unseeded'};
export interface V2ShadowResult{
 response:V2DraftReceiptResponse;replayed:boolean;
}
const fingerprint=(command:V2DraftCommand)=>
 command.kind==='start'?'start:'+command.recipeId:'claim:'+command.jobId;

/** Staging-only evaluator. Service-side Port must implement atomic CAS.
 * Never connect to external HTTP routing without a server gate check.
 * On a commit race, read the latest snapshot and resolve again:
 * same request ID replays, different IDs receive stale_game_version.
 */
export async function evaluateEquipmentV2ShadowCommand(
 port:V2ShadowServiceRpc,ctx:V2DraftContext,command:V2DraftCommand,
):Promise<V2ShadowResult>{
 for(let attempt=0;attempt<3;attempt++){
  const loaded=await port.rpc<V2ShadowReadResult>('equipment_crafting_v2_shadow_read',
   {p_account_id:ctx.accountId});
  if(!loaded||loaded.status!=='loaded')throw new V2DraftCraftError('shadow_not_initialized');
  const resolution=resolveEquipmentV2DraftCommand(loaded.snapshot,command,ctx);
  if(resolution.replayed)return {response:resolution.response,replayed:true};
  const committed=await port.rpc<V2ShadowCommitResult>('equipment_crafting_v2_shadow_commit',{
   p_account_id:ctx.accountId,p_expected_version:loaded.snapshot.version,
   p_request_id:command.requestId,p_fingerprint:fingerprint(command),
   p_next_snapshot:resolution.next,p_response:resolution.response,
  });
  switch(committed?.status){
   case 'committed':return {response:committed.response,replayed:false};
   case 'replayed':return {response:committed.response,replayed:true};
   case 'conflict':throw new V2DraftCraftError('request_id_conflict');
   case 'stale':continue;
   case 'unseeded':throw new V2DraftCraftError('shadow_not_initialized');
   default:throw new V2DraftCraftError('shadow_commit_failed');
  }
 }
 throw new V2DraftCraftError('shadow_commit_retry_exhausted');
}
/** Genuine backend entry remains disabled until a single coordinated 2.0
 * gameplay release. Nothing inside this file modifies live data.
 */
export async function runEquipmentV2ShadowCommand(
 port:V2ShadowServiceRpc,ctx:V2DraftContext,command:V2DraftCommand,
):Promise<V2ShadowResult>{
 assertEquipmentCraftingV2Released();
 return evaluateEquipmentV2ShadowCommand(port,ctx,command);
}
