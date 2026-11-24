import {assertProfileCosmeticGrantDefinition,type ProfileCosmeticGrantState,applyProfileCosmeticGrant} from '../../shared/profile-cosmetic-commerce';

/** No route or Google Play product is mounted while false. */
export const PROFILE_COSMETIC_COMMERCE_GRANTS_LIVE=false;

export interface ProfileCosmeticGrantReceipt{
 accountId:string;sku:string;idempotencyKey:string;source:'verified_google_play'|'ops_comp';
}
export interface ProfileCosmeticGrantRepository{
 loadAccountCosmetics(accountId:string):Promise<ProfileCosmeticGrantState>;
 commitAccountCosmetics(input:{accountId:string;state:ProfileCosmeticGrantState;sku:string;idempotencyKey:string;source:ProfileCosmeticGrantReceipt['source']}):Promise<{applied:boolean}>;
}

/**
 * Prepared server contract only. Fail closed until the commerce ledger migration,
 * verified Play SKUs and rollback/device QA are approved.
 */
export class ProfileCosmeticGrantService{
 constructor(private repo:ProfileCosmeticGrantRepository){}
 async grant(receipt:ProfileCosmeticGrantReceipt){
  if(!PROFILE_COSMETIC_COMMERCE_GRANTS_LIVE)throw new Error('PROFILE_COSMETIC_COMMERCE_DISABLED');
  if(!receipt.accountId||!receipt.idempotencyKey)throw new Error('INVALID_PROFILE_COSMETIC_RECEIPT');
  assertProfileCosmeticGrantDefinition(receipt.sku);
  const current=await this.repo.loadAccountCosmetics(receipt.accountId);
  const planned=applyProfileCosmeticGrant(current,receipt.sku);
  const committed=await this.repo.commitAccountCosmetics({
   accountId:receipt.accountId,state:planned.state,sku:receipt.sku,idempotencyKey:receipt.idempotencyKey,source:receipt.source,
  });
  return {...planned,applied:committed.applied};
 }
}
