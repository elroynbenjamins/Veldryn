export type CommerceOwnership={vip:boolean;vipPlus:boolean;supporter:boolean};

export function purchaseEligibilityError(productId:string,owned:CommerceOwnership):string|null{
  switch(productId){
    case 'vip':return owned.vip?'VIP is already owned.':null;
    case 'vip_plus':return owned.vipPlus?'VIP+ is already owned.':null;
    case 'supporter_monthly':return owned.supporter?'Supporter is already active. Manage your subscription in Google Play.':null;
    default:return 'Unknown Google Play product.';
  }
}

// All current products grant independently, so restore order has no prerequisites.
export function orderCommercePurchases<T extends {productId:string}>(rows:readonly T[]):T[]{
  return [...rows];
}
