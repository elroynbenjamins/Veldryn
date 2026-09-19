/**
 * VELDRYN v17.3 redeem-code integration.
 *
 * The mobile client sends the entered code to an authenticated game backend endpoint.
 * The endpoint resolves the authenticated account itself. Never accept an arbitrary
 * account id from the client and never expose the Supabase service role key.
 */
export interface RedeemReservation {
  claimId: string;
  rewardBundleId: string;
  idempotencyKey: string;
}

export interface RedeemCodeRepository {
  reserve(input:{accountId:string;codeHash:string}):Promise<RedeemReservation>;
  markGranted(claimId:string):Promise<void>;
  markFailed(claimId:string,error:string):Promise<void>;
}

export interface RedeemRewardDomain {
  grantRewardBundle(input:{accountId:string;bundleId:string;idempotencyKey:string;source:'redeem_code'}):Promise<void>;
}

export type CodeHasher=(normalizedCode:string)=>Promise<string>;

export async function sha256RedeemCode(normalizedCode:string):Promise<string>{
  const bytes=new TextEncoder().encode(normalizedCode);
  const digest=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

export function normalizeRedeemCode(value:string){ return String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,48); }

export class RedeemCodeService {
  constructor(private repo:RedeemCodeRepository,private rewards:RedeemRewardDomain,private hash:CodeHasher=sha256RedeemCode){}
  async redeem(accountId:string,rawCode:string){
    const normalized=normalizeRedeemCode(rawCode);
    if(normalized.length<12||normalized.length>40) throw new Error('invalid_redeem_code');
    const codeHash=await this.hash(normalized);
    const reservation=await this.repo.reserve({accountId,codeHash});
    try {
      await this.rewards.grantRewardBundle({accountId,bundleId:reservation.rewardBundleId,idempotencyKey:reservation.idempotencyKey,source:'redeem_code'});
      await this.repo.markGranted(reservation.claimId);
      return {ok:true,rewardBundleId:reservation.rewardBundleId};
    } catch(error){
      // A retry MUST reuse the same reservation/idempotency key. If the reward-domain
      // grant succeeded before a process crash, its normal receipt/idempotency layer
      // prevents duplicate rewards when this claim is retried.
      await this.repo.markFailed(reservation.claimId,error instanceof Error?error.message:String(error)).catch(()=>{});
      throw error;
    }
  }
}
