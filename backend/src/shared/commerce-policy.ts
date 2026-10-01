export type CommerceOwnership={vip:boolean;vipPlus:boolean;supporter:boolean};

export function purchaseEligibilityError(productId:string,owned:CommerceOwnership,upgradeEligible=owned.vip):string|null{
  const vip=owned.vip||owned.vipPlus;
  switch(productId){
    case 'vip':return vip?'VIP is already owned.':null;
    case 'vip_plus':return owned.vipPlus?'VIP+ is already owned.':vip?'VIP is already owned. Choose the VIP+ upgrade instead.':null;
    case 'vip_plus_upgrade':return owned.vipPlus?'VIP+ is already owned.':!vip?'VIP is required before purchasing the VIP+ upgrade.':!upgradeEligible?'Restore your Google Play VIP purchase before upgrading. Complimentary VIP access is not a purchased VIP tier.':null;
    case 'supporter_monthly':return owned.supporter?'Supporter is already active. Manage your subscription in Google Play.':null;
    default:return 'Unknown Google Play product.';
  }
}

// A Play restore can return purchases in any order. Restore prerequisites first.
export function orderCommercePurchases<T extends {productId:string}>(rows:readonly T[]):T[]{
  const priority=(id:string)=>id==='vip'?0:id==='vip_plus_upgrade'?2:1;
  return [...rows].sort((a,b)=>priority(a.productId)-priority(b.productId));
}
