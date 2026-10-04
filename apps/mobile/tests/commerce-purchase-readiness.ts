import {purchaseEligibilityError,orderCommercePurchases} from '../../../backend/src/shared/commerce-policy';
import {commerceEntitlementsMatchState,currentCommerceEntitlements,premiumProductRows,supporterAccessLabel} from '../src/core/commerce-presentation';
import {COMMERCE_PRODUCTS} from '../src/content/commerce-products';
import {newGame} from '../src/core/game';

function ok(value:unknown,message:string){if(!value)throw new Error(message);}
const free={vip:false,vipPlus:false,supporter:false,supporterExpiresAt:null};
const vip={...free,vip:true};
const plus={...free,vipPlus:true};
const unknownRows=premiumProductRows(undefined);
ok(unknownRows.every(row=>!row.confirmed&&!row.owned&&row.action==='Check status'),'A failed or missing ownership read must not offer unconfirmed purchases');
ok(premiumProductRows(undefined,true).every(row=>!row.confirmed&&row.action==='Checking…'),'Initial ownership load remains distinct from confirmed unowned');
ok(premiumProductRows(free).every(row=>row.confirmed&&!row.owned),'Confirmed free account can receive purchase actions');
for(const [owned,sku,action] of [[free,'vip_plus','Buy VIP+'],[vip,'vip_plus','Buy VIP+'],[plus,'vip_plus','Owned']] as const){
  const rows=premiumProductRows(owned);
  ok(rows[1].id===sku&&rows[1].action===action,'Tier-appropriate purchase action');
  ok(rows[0].owned===owned.vip,'VIP ownership is independent of VIP+');
}
ok(COMMERCE_PRODUCTS.find(row=>row.id==='vip_plus')?.name==='VIP+','Existing VIP+ SKU retains its independent tier');
ok(purchaseEligibilityError('vip',free)===null,'Free player can buy VIP');
ok(purchaseEligibilityError('vip_plus',free)===null,'Free player can buy VIP+ independently');
ok(purchaseEligibilityError('vip_plus',vip)===null,'Paid or complimentary VIP can add VIP+');
ok(purchaseEligibilityError('vip',plus)===null,'VIP+ alone can add VIP');
ok(purchaseEligibilityError('vip',vip),'VIP owner cannot repurchase VIP');
ok(purchaseEligibilityError('vip_plus',plus),'VIP+ owner cannot repurchase VIP+');
for(const owned of [free,vip,plus])ok(purchaseEligibilityError('vip_plus_upgrade',owned),'Retired upgrade is never offered for checkout');
ok(purchaseEligibilityError('supporter_monthly',plus)===null,'Supporter stacks with VIP+');
ok(purchaseEligibilityError('supporter_monthly',{...plus,supporter:true}),'Active Supporter cannot repurchase');
ok(purchaseEligibilityError('unknown',free),'Unknown product fails closed');
const unordered=[{productId:'vip_plus'},{productId:'supporter_monthly'},{productId:'vip'}];
const ordered=orderCommercePurchases(unordered);
ok(ordered.length===3&&new Set(ordered.map(row=>row.productId)).size===3,'Restore retains independent purchased products');
ok(unordered[0].productId==='vip_plus'&&ordered!==unordered,'Restore preparation does not mutate input');
ok(supporterAccessLabel(free)===undefined,'No expiry shown for inactive Supporter');
ok(supporterAccessLabel({...free,supporter:true,supporterExpiresAt:'invalid'})==='Active','Invalid expiry never appears as a date');
ok(supporterAccessLabel({...free,supporter:true,supporterExpiresAt:'2030-01-01T12:00:00Z'})?.startsWith('Access until '),'Expiry is not mislabeled as a renewal');

const now=Date.parse('2030-01-01T12:00:00Z');
// An authenticated ownership response includes Play and redeem-code grants alike;
// there is deliberately no dependency on a Play catalog/context response here.
const redeemed={accountId:'redeemed-account',entitlements:{vip:true,vipPlus:true,supporter:true,supporterExpiresAt:null}};
let effective=currentCommerceEntitlements(redeemed,'redeemed-account',now);
let rows=premiumProductRows(effective);
ok(rows[0].action==='Owned'&&rows[1].action==='Owned'&&rows[2].action==='Active','Redeemed VIP, VIP+ and lifetime Supporter remain owned while Play is unavailable');
ok(rows.every(row=>row.owned&&row.confirmed),'All effective code grants prevent duplicate checkout');
ok(currentCommerceEntitlements(redeemed,'another-account',now)===undefined,'Account switching cannot display the previous account benefits');
ok(currentCommerceEntitlements(redeemed,undefined,now)===undefined,'Sign-out clears purchase ownership evidence');
ok(currentCommerceEntitlements(undefined,'redeemed-account',now)===undefined,'Missing server evidence never becomes false ownership');
const subscription={accountId:'subscriber',entitlements:{...free,supporter:true,supporterExpiresAt:'2030-01-01T12:00:00Z'}};
ok(currentCommerceEntitlements(subscription,'subscriber',now-1)?.supporter,'Supporter remains active until the exact expiry');
effective=currentCommerceEntitlements(subscription,'subscriber',now);
ok(effective?.supporter===false&&premiumProductRows(effective)[2].action==='Subscribe','A cached active status expires while the shop stays open');
ok(subscription.entitlements.supporter,'Expiry presentation does not mutate server evidence');
ok(currentCommerceEntitlements(redeemed,'redeemed-account',now+365*24*60*60_000)?.supporter,'Lifetime grants do not acquire an invented expiry');
const revoked={accountId:redeemed.accountId,entitlements:free};
rows=premiumProductRows(currentCommerceEntitlements(revoked,redeemed.accountId,now));
ok(rows.every(row=>row.confirmed&&!row.owned),'A newer revocation replaces previous code grants without merging old true flags');
ok(currentCommerceEntitlements({accountId:'invalid',entitlements:{...free,supporter:true,supporterExpiresAt:'invalid'}},'invalid',now)?.supporter===false,'Malformed dated access cannot become lifetime Supporter');
const local=newGame(0);
ok(commerceEntitlementsMatchState(local,free),'Unchanged free access does not need repeated gameplay loads');
ok(!commerceEntitlementsMatchState(local,redeemed.entitlements),'New code grants trigger authoritative gameplay refresh');
const outdated={...local,account:{...local.account,entitlements:{vip:true,vip_plus:true,supporter:true}}};
ok(commerceEntitlementsMatchState(outdated,redeemed.entitlements),'Unchanged owned flags avoid repeated gameplay loads');
ok(!commerceEntitlementsMatchState(outdated,free),'Refunds and revocation refresh gameplay even when Play restore is empty');
ok(!commerceEntitlementsMatchState({...local,account:{...local.account,entitlements:{supporter_subscription:true}}},free),'Legacy aliases trigger cleanup instead of preserving expired access');
console.log('PASS: commerce ownership, account isolation, expiry, purchase eligibility, restoration order and status labels');
