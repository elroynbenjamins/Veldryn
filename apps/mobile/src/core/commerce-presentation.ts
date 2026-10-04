import type {CommerceProductId} from '../content/commerce-products';
import type {ServerCommerceEntitlements} from './account-entitlements';
import type {GameState} from './types';
export {purchaseEligibilityError} from '../../../../backend/src/shared/commerce-policy';

export interface CommerceEntitlementSnapshot{
  accountId:string;
  entitlements:ServerCommerceEntitlements;
}

/** Only a server response for this signed-in account can determine shop ownership. */
export function currentCommerceEntitlements(snapshot:CommerceEntitlementSnapshot|undefined,accountId:string|undefined,nowMs=Date.now()):ServerCommerceEntitlements|undefined{
  if(!accountId||snapshot?.accountId!==accountId)return undefined;
  const owned=snapshot.entitlements;
  if(!owned.supporter||owned.supporterExpiresAt===null)return owned;
  const expiry=Date.parse(owned.supporterExpiresAt);
  return Number.isFinite(expiry)&&expiry>nowMs?owned:{...owned,supporter:false};
}

/** Local flags only decide whether gameplay needs a reload; they never establish ownership. */
export function commerceEntitlementsMatchState(state:GameState,owned:ServerCommerceEntitlements):boolean{
  const flags=state.account.entitlements??{};
  return (flags.vip===true)===owned.vip&&(flags.vip_plus===true)===owned.vipPlus&&(flags.supporter===true)===owned.supporter
    &&flags.vipplus!==true&&flags['vip+']!==true&&flags.supporter_subscription!==true;
}

export function premiumProductRows(owned:ServerCommerceEntitlements|undefined,checking=false){
  const vip=owned?.vip??false,plus=owned?.vipPlus??false,supporter=owned?.supporter??false;
  const unknown=checking?'Checking…':'Check status';
  return [
    {id:'vip' as CommerceProductId,title:'VIP',status:vip?'Owned':undefined,action:!owned?unknown:vip?'Owned':'Buy VIP',owned:vip,confirmed:!!owned},
    {id:'vip_plus' as CommerceProductId,title:'VIP+',status:plus?'Owned':undefined,action:!owned?unknown:plus?'Owned':'Buy VIP+',owned:plus,confirmed:!!owned},
    {id:'supporter_monthly' as CommerceProductId,title:'Supporter',status:supporter?'Active':undefined,action:!owned?unknown:supporter?'Active':'Subscribe',owned:supporter,confirmed:!!owned},
  ];
}

export function supporterAccessLabel(owned:ServerCommerceEntitlements):string|undefined{
  if(!owned.supporter)return undefined;
  const expiry=Date.parse(owned.supporterExpiresAt??'');
  if(!Number.isFinite(expiry))return 'Active';
  return 'Access until '+new Date(expiry).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
}
