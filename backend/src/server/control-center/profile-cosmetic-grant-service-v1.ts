import {assertProfileCosmeticGrantDefinition} from '../../shared/profile-cosmetic-commerce';

/** No route or Google Play product is mounted while false. */
export const PROFILE_COSMETIC_COMMERCE_GRANTS_LIVE=false;

export interface ProfileCosmeticGrantReceipt{
 accountId:string;sku:string;idempotencyKey:string;source:'verified_google_play'|'ops_comp';
}
export interface ProfileCosmeticGrantResult{
 applied:boolean;replayed:boolean;sku:string;addedBorderId:string|null;addedEffectId:string|null;addedIconIds:string[];revision:number;
}
export interface ProfileCosmeticGrantRepository{
 grantVerified(input:ProfileCosmeticGrantReceipt):Promise<ProfileCosmeticGrantResult>;
}

/**
 * Prepared server contract only. Fail closed until the commerce ledger migration,
 * verified Play SKUs and rollback/device QA are approved.
 *
 * Atomicity, idempotency and game-state revision updates belong to the database
 * repository/RPC, not to this service layer.
 */
export class ProfileCosmeticGrantService{
 constructor(private repo:ProfileCosmeticGrantRepository){}
 async grant(receipt:ProfileCosmeticGrantReceipt){
  if(!PROFILE_COSMETIC_COMMERCE_GRANTS_LIVE)throw new Error('PROFILE_COSMETIC_COMMERCE_DISABLED');
  if(!receipt.accountId||!receipt.idempotencyKey)throw new Error('INVALID_PROFILE_COSMETIC_RECEIPT');
  assertProfileCosmeticGrantDefinition(receipt.sku);
  return this.repo.grantVerified(receipt);
 }
}
