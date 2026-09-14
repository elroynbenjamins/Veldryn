import type { RedeemCodeRepository, RedeemReservation } from './redeem-code-service-v17_3';

export interface SupabaseRpcResult<T>{data:T|null;error:{message?:string}|null;}
export interface ServiceSupabaseLike{
  rpc<T=unknown>(fn:string,args:Record<string,unknown>):Promise<SupabaseRpcResult<T>>;
}

function fail(error:{message?:string}|null, fallback:string):never{ throw new Error(error?.message||fallback); }

export class SupabaseRedeemCodeRepository implements RedeemCodeRepository{
  constructor(private db:ServiceSupabaseLike){}
  async reserve(input:{accountId:string;codeHash:string}):Promise<RedeemReservation>{
    const {data,error}=await this.db.rpc<Array<{claim_id:string;reward_bundle_id:string;idempotency_key:string}>>('reserve_ops_redeem_code_claim',{p_code_hash:input.codeHash,p_account_id:input.accountId});
    if(error) fail(error,'redeem_reservation_failed');
    const row=Array.isArray(data)?data[0]:null; if(!row) throw new Error('redeem_reservation_missing');
    return {claimId:row.claim_id,rewardBundleId:row.reward_bundle_id,idempotencyKey:row.idempotency_key};
  }
  async markGranted(claimId:string){ const {error}=await this.db.rpc('set_ops_redeem_claim_status',{p_claim_id:claimId,p_status:'granted',p_error:null}); if(error) fail(error,'redeem_mark_granted_failed'); }
  async markFailed(claimId:string,errorText:string){ const {error}=await this.db.rpc('set_ops_redeem_claim_status',{p_claim_id:claimId,p_status:'failed',p_error:String(errorText).slice(0,1000)}); if(error) fail(error,'redeem_mark_failed_failed'); }
}
