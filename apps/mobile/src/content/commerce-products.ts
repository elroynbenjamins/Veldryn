export type CommerceProductId='vip'|'vip_plus'|'vip_plus_upgrade'|'supporter_monthly';
export type PlayBillingProductType='in-app'|'subs';

export interface CommerceProductDefinition{
 id:CommerceProductId;
 name:string;
 billing:'one_time'|'subscription';
 playProductId:CommerceProductId;
 playProductType:PlayBillingProductType;
 preferredBasePlanId?:'monthly';
 requires?:'vip';
 grants:'vip'|'vip_plus'|'supporter';
 description:string;
}

export const PLAY_BILLING_PACKAGE_NAME='com.elroybenjamins.veldryn';

export const COMMERCE_PRODUCTS:readonly CommerceProductDefinition[]=[
 {id:'vip',name:'VIP',billing:'one_time',playProductId:'vip',playProductType:'in-app',grants:'vip',description:'Permanent QoL: +2h AFK, +5 Inventory, +20 Bank and +1 saved loadout.'},
 {id:'vip_plus',name:'VIP+',billing:'one_time',playProductId:'vip_plus',playProductType:'in-app',grants:'vip_plus',description:'Includes VIP plus +2h AFK, +5 Inventory, +30 Bank, +1 loadout, +1 Action Queue, +1 Forge slot and solid RGB names.'},
 {id:'vip_plus_upgrade',name:'VIP+ Upgrade',billing:'one_time',playProductId:'vip_plus_upgrade',playProductType:'in-app',requires:'vip',grants:'vip_plus',description:'Upgrades an existing VIP purchase to VIP+ without repurchasing VIP.'},
 {id:'supporter_monthly',name:'Supporter',billing:'subscription',playProductId:'supporter_monthly',playProductType:'subs',preferredBasePlanId:'monthly',grants:'supporter',description:'Stacks with VIP/VIP+: +2h AFK, +1 active Forge slot and advanced gradient/animated name styles while active.'},
] as const;

export const GOOGLE_PLAY_ONE_TIME_PRODUCT_IDS=COMMERCE_PRODUCTS.filter(row=>row.playProductType==='in-app').map(row=>row.playProductId);
export const GOOGLE_PLAY_SUBSCRIPTION_PRODUCT_IDS=COMMERCE_PRODUCTS.filter(row=>row.playProductType==='subs').map(row=>row.playProductId);

export function commerceProduct(id:string){return COMMERCE_PRODUCTS.find(row=>row.playProductId===id)}

export const COMMERCE_GUARDRAILS={
 ads:false,
 pricesManagedByPlayConsole:true,
 paidPremiumCurrency:false,
 paidPvpPower:false,
 paidPvpStats:false,
 paidRankingStrength:false,
 supporterStacksWithPermanentTiers:true,
} as const;
