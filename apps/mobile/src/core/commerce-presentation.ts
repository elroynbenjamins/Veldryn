import type {CommerceProductId} from '../content/commerce-products';
import type {ServerCommerceEntitlements} from './account-entitlements';
export {purchaseEligibilityError} from '../../../../backend/src/shared/commerce-policy';

export function premiumProductRows(owned:ServerCommerceEntitlements){
  const vip=owned.vip||owned.vipPlus;
  const plusId:CommerceProductId=vip&&!owned.vipPlus?'vip_plus_upgrade':'vip_plus';
  return [
    {id:'vip' as CommerceProductId,title:'VIP',status:vip?'Owned':undefined,action:vip?'Owned':'Buy VIP',owned:vip},
    {id:plusId,title:owned.vipPlus?'VIP+':vip?'VIP+ Upgrade':'VIP + VIP+',status:owned.vipPlus?'Owned':undefined,action:owned.vipPlus?'Owned':vip?'Upgrade to VIP+':'Buy both',owned:owned.vipPlus},
    {id:'supporter_monthly' as CommerceProductId,title:'Supporter',status:owned.supporter?'Active':undefined,action:owned.supporter?'Active':'Subscribe',owned:owned.supporter},
  ];
}

export function supporterAccessLabel(owned:ServerCommerceEntitlements):string|undefined{
  if(!owned.supporter)return undefined;
  const expiry=Date.parse(owned.supporterExpiresAt??'');
  if(!Number.isFinite(expiry))return 'Active';
  return 'Access until '+new Date(expiry).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
}
