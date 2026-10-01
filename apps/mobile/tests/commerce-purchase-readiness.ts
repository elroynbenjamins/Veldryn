import {purchaseEligibilityError,orderCommercePurchases} from '../../../backend/src/shared/commerce-policy';
import {premiumProductRows,supporterAccessLabel} from '../src/core/commerce-presentation';
import {COMMERCE_PRODUCTS} from '../src/content/commerce-products';

function ok(value:unknown,message:string){if(!value)throw new Error(message);}
const free={vip:false,vipPlus:false,supporter:false,supporterExpiresAt:null};
const vip={...free,vip:true};
const plus={...free,vipPlus:true};
for(const [owned,sku,action] of [[free,'vip_plus','Buy both'],[vip,'vip_plus_upgrade','Upgrade to VIP+'],[plus,'vip_plus','Owned']] as const){
  const rows=premiumProductRows(owned);
  ok(rows[1].id===sku&&rows[1].action===action,'Tier-appropriate purchase action');
  ok(rows[0].owned===(owned.vip||owned.vipPlus),'VIP+ includes owned VIP');
}
ok(COMMERCE_PRODUCTS.find(row=>row.id==='vip_plus')?.name==='VIP + VIP+','Existing full-tier SKU is the combined purchase');
ok(purchaseEligibilityError('vip',free)===null,'Free player can buy VIP');
ok(purchaseEligibilityError('vip_plus',free)===null,'Free player can buy both at once');
ok(purchaseEligibilityError('vip_plus_upgrade',free),'Free player cannot buy upgrade');
ok(purchaseEligibilityError('vip_plus_upgrade',vip,true)===null,'Paid VIP can upgrade');
ok(purchaseEligibilityError('vip_plus_upgrade',vip,false),'Complimentary VIP alone cannot buy a Play upgrade');
ok(purchaseEligibilityError('vip_plus',vip),'VIP owner must not buy VIP twice through the bundle');
for(const id of ['vip','vip_plus','vip_plus_upgrade'])ok(purchaseEligibilityError(id,plus),'VIP+ owner cannot repurchase tiers');
ok(purchaseEligibilityError('supporter_monthly',plus)===null,'Supporter stacks with VIP+');
ok(purchaseEligibilityError('supporter_monthly',{...plus,supporter:true}),'Active Supporter cannot repurchase');
ok(purchaseEligibilityError('unknown',free),'Unknown product fails closed');
const unordered=[{productId:'vip_plus_upgrade'},{productId:'supporter_monthly'},{productId:'vip'}];
const ordered=orderCommercePurchases(unordered);
ok(ordered[0].productId==='vip'&&ordered[2].productId==='vip_plus_upgrade','Restore prerequisites before upgrades');
ok(unordered[0].productId==='vip_plus_upgrade','Restore ordering does not mutate input');
ok(supporterAccessLabel(free)===undefined,'No expiry shown for inactive Supporter');
ok(supporterAccessLabel({...free,supporter:true,supporterExpiresAt:'invalid'})==='Active','Invalid expiry never appears as a date');
ok(supporterAccessLabel({...free,supporter:true,supporterExpiresAt:'2030-01-01T12:00:00Z'})?.startsWith('Access until '),'Expiry is not mislabeled as a renewal');
console.log('PASS: commerce purchase eligibility, tier presentation, restoration order and expiry labels');
