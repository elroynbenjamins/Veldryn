export type CommerceProductId='vip'|'vip_plus'|'vip_plus_upgrade'|'supporter_monthly';

export interface CommerceProductDefinition{
 id:CommerceProductId;
 name:string;
 billing:'one_time'|'subscription';
 priceEur:number;
 period?:'month';
 requires?:'vip';
 grants:'vip'|'vip_plus'|'supporter';
 description:string;
}

export const COMMERCE_PRODUCTS:readonly CommerceProductDefinition[]=[
 {id:'vip',name:'VIP',billing:'one_time',priceEur:4.99,grants:'vip',description:'Permanent QoL: +2h AFK, +5 Inventory, +20 Bank and +1 saved loadout.'},
 {id:'vip_plus',name:'VIP+',billing:'one_time',priceEur:9.99,grants:'vip_plus',description:'Includes VIP plus +2h AFK, +5 Inventory, +30 Bank, +1 loadout, +1 Action Queue, +1 Forge slot and solid RGB names.'},
 {id:'vip_plus_upgrade',name:'VIP+ Upgrade',billing:'one_time',priceEur:5.00,requires:'vip',grants:'vip_plus',description:'Upgrades an existing VIP purchase to VIP+ without repurchasing VIP.'},
 {id:'supporter_monthly',name:'Supporter',billing:'subscription',priceEur:2.99,period:'month',grants:'supporter',description:'Stacks with VIP/VIP+: +2h AFK, +1 active Forge slot and advanced gradient/animated name styles while active.'},
] as const;

export const COMMERCE_GUARDRAILS={
 paidPremiumCurrency:false,
 paidPvpPower:false,
 paidPvpStats:false,
 paidRankingStrength:false,
 supporterStacksWithPermanentTiers:true,
} as const;
