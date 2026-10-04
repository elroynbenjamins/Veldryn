export type CommerceProductId='vip'|'vip_plus'|'supporter_monthly';
export type PlayBillingProductType='in-app'|'subs';

export interface CommerceProductDefinition{
 id:CommerceProductId;
 name:string;
 billing:'one_time'|'subscription';
 playProductId:CommerceProductId;
 playProductType:PlayBillingProductType;
 preferredBasePlanId?:'monthly';
 grants:'vip'|'vip_plus'|'supporter';
 description:string;
}

export const PLAY_BILLING_PACKAGE_NAME='com.elroybenjamins.veldryn';

export const COMMERCE_PRODUCTS:readonly CommerceProductDefinition[]=[
 {id:'vip',name:'VIP',billing:'one_time',playProductId:'vip',playProductType:'in-app',grants:'vip',description:'Permanent QoL: +2h AFK, +5 Inventory, +20 Bank and +1 saved loadout.'},
 {id:'vip_plus',name:'VIP+',billing:'one_time',playProductId:'vip_plus',playProductType:'in-app',grants:'vip_plus',description:'Permanent QoL: +2h AFK, +5 Inventory, +30 Bank, +1 saved loadout, +1 waiting activity slot, +1 active Forge slot and solid RGB name colors. Stacks with VIP.'},
 {id:'supporter_monthly',name:'Supporter',billing:'subscription',playProductId:'supporter_monthly',playProductType:'subs',preferredBasePlanId:'monthly',grants:'supporter',description:'Stacks with VIP/VIP+: +2h AFK, +1 active Forge slot and advanced gradient/animated name styles while active.'},
] as const;

export const GOOGLE_PLAY_ONE_TIME_PRODUCT_IDS=COMMERCE_PRODUCTS.filter(row=>row.playProductType==='in-app').map(row=>row.playProductId);
export const GOOGLE_PLAY_SUBSCRIPTION_PRODUCT_IDS=COMMERCE_PRODUCTS.filter(row=>row.playProductType==='subs').map(row=>row.playProductId);

export function commerceProduct(id:string){return COMMERCE_PRODUCTS.find(row=>row.playProductId===id)}

export const COMMERCE_PRODUCT_BONUSES:Record<CommerceProductId,{note:string;items:readonly string[]}>= {
 vip:{note:'Permanent bonuses.',items:['+2 hours offline reserve','+5 inventory slots','+20 bank slots','+1 saved loadout']},
 vip_plus:{note:'Permanent bonuses. Stacks with VIP.',items:['+2 hours offline reserve','+5 inventory slots','+30 bank slots','+1 saved loadout','+1 waiting activity slot (3 total)','+1 active Forge slot','Custom solid RGB / HEX name colors']},
 supporter_monthly:{note:'Active while subscribed. Stacks with VIP or VIP+.',items:['+2 hours offline reserve','+1 active Forge slot','Custom solid name colors','Gradient and animated name styles','Optional Supporter badge']},
};

export const COMMERCE_GUARDRAILS={
 ads:false,
 pricesManagedByPlayConsole:true,
 paidPremiumCurrency:false,
 paidPvpPower:false,
 paidPvpStats:false,
 paidRankingStrength:false,
 supporterStacksWithPermanentTiers:true,
} as const;
