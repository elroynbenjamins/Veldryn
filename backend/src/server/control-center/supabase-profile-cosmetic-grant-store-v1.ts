import type {
 ProfileCosmeticGrantReceipt,ProfileCosmeticGrantRepository,ProfileCosmeticGrantResult,
} from './profile-cosmetic-grant-service-v1';

export interface SupabaseRpcResult<T>{data:T|null;error:{message?:string}|null}
export interface ServiceSupabaseLike{
 rpc<T=unknown>(fn:string,args:Record<string,unknown>):Promise<SupabaseRpcResult<T>>;
}
function fail(error:{message?:string}|null,fallback:string):never{throw new Error(error?.message||fallback)}

function result(value:unknown):ProfileCosmeticGrantResult{
 if(!value||typeof value!=='object')throw new Error('profile_cosmetic_grant_result_invalid');
 const row=value as Partial<ProfileCosmeticGrantResult>;
 if(typeof row.applied!=='boolean'||typeof row.replayed!=='boolean'||typeof row.sku!=='string'||typeof row.revision!=='number')
  throw new Error('profile_cosmetic_grant_result_invalid');
 return {
  applied:row.applied,replayed:row.replayed,sku:row.sku,
  addedBorderId:typeof row.addedBorderId==='string'?row.addedBorderId:null,
  addedEffectId:typeof row.addedEffectId==='string'?row.addedEffectId:null,
  addedIconIds:Array.isArray(row.addedIconIds)?row.addedIconIds.filter((id):id is string=>typeof id==='string'):[],
  revision:row.revision,
 };
}

/** Service-role Supabase adapter. Never expose this client or RPC from a mobile session. */
export class SupabaseProfileCosmeticGrantRepository implements ProfileCosmeticGrantRepository{
 constructor(private db:ServiceSupabaseLike){}
 async grantVerified(input:ProfileCosmeticGrantReceipt){
  const {data,error}=await this.db.rpc('profile_cosmetic_grant_server_v1',{
   p_account_id:input.accountId,
   p_sku:input.sku,
   p_idempotency_key:input.idempotencyKey,
   p_source:input.source,
  });
  if(error)fail(error,'profile_cosmetic_grant_failed');
  return result(data);
 }
}
