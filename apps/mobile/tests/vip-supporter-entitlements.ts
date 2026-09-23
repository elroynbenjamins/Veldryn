import {createCharacter,newGame,offlineCapBreakdown} from '../src/core/game';
import {accountEntitlementBenefits,entitlementStorageCapacity,withServerCommerceEntitlements} from '../src/core/account-entitlements';
import {activityQueueCapacity} from '../src/core/activity-queue';
import {characterLoadoutSlotCount} from '../src/core/character-loadouts';
import {equipmentCraftSlotBreakdown} from '../src/core/equipment-crafting-queue';
import {effectivePlayerNameStyle,normalizeHexColor,playerNameCharacterColors,savePlayerNameStyle,SUPPORTER_NAME_PRESETS} from '../src/core/player-name-style';
import {COMMERCE_GUARDRAILS,COMMERCE_PRODUCTS,GOOGLE_PLAY_ONE_TIME_PRODUCT_IDS,GOOGLE_PLAY_SUBSCRIPTION_PRODUCT_IDS,PLAY_BILLING_PACKAGE_NAME} from '../src/content/commerce-products';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function eq(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}

const base=createCharacter(newGame(0),'IRONWARDEN','Entitlement Tester');
const vip={...base,account:{...base.account,entitlements:{vip:true}}};
const vipPlus={...base,account:{...base.account,entitlements:{vip_plus:true}}};
const supporter={...base,account:{...base.account,entitlements:{supporter:true}}};
const stacked={...base,account:{...base.account,entitlements:{vip_plus:true,supporter:true},unlockedCharacterSlots:4}};

let b=accountEntitlementBenefits(vip);
ok(b.vip&&!b.vipPlus&&!b.supporter,'VIP entitlement should remain distinct');
eq(b.inventorySlots,5,'VIP Inventory slots');eq(b.bankSlots,20,'VIP Bank slots');eq(b.loadoutSlots,1,'VIP loadout slots');
b=accountEntitlementBenefits(vipPlus);
ok(b.vip&&b.vipPlus,'VIP+ should inherit VIP');eq(b.inventorySlots,10,'VIP+ total Inventory slots');eq(b.bankSlots,50,'VIP+ total Bank slots');eq(b.loadoutSlots,2,'VIP+ total loadouts');eq(b.actionQueueSlots,1,'VIP+ Action Queue slot');eq(b.forgeSlots,1,'VIP+ Forge slot');
b=accountEntitlementBenefits(supporter);
ok(b.supporter&&!b.vipPlus,'Supporter should stack independently');eq(b.forgeSlots,1,'Supporter Forge slot');eq(b.inventorySlots,0,'Supporter must not grant temporary storage');
eq(entitlementStorageCapacity(vipPlus,'inventory'),40,'VIP+ effective starter Inventory');eq(entitlementStorageCapacity(vipPlus,'bank'),170,'VIP+ effective starter Bank');
eq(characterLoadoutSlotCount(vipPlus),5,'VIP+ loadout capacity');eq(activityQueueCapacity(vipPlus),4,'VIP+ queue capacity');
eq(equipmentCraftSlotBreakdown(stacked).capacity,7,'Fully stacked Forge capacity should reach seven');
eq(offlineCapBreakdown(stacked).maxHours,30,'Paid entitlements must never push AFK reserve above 30h');

eq(normalizeHexColor('#abc'),'#AABBCC','Short HEX should normalize');
const solid=savePlayerNameStyle(vipPlus,{mode:'solid',solidColor:'#123ABC',animation:'none'});
eq(effectivePlayerNameStyle(solid).solidColor,'#123ABC','VIP+ should keep permanent solid RGB');
let gradientRejected=false;try{savePlayerNameStyle(vipPlus,{mode:'gradient',gradientColors:['#112233','#445566'],animation:'flow'})}catch{gradientRejected=true}
ok(gradientRejected,'VIP+ without Supporter must not enable gradients');
const gradient=savePlayerNameStyle(stacked,{mode:'gradient',gradientColors:['#112233','#445566','#778899'],animation:'flow'});
ok(effectivePlayerNameStyle(gradient).mode==='gradient','Supporter should enable gradient names');
const expiredFallback={...gradient,account:{...gradient.account,entitlements:{vip_plus:true}}};
ok(effectivePlayerNameStyle(expiredFallback).mode==='solid','Expired Supporter should fall back to VIP+ solid color');
ok(playerNameCharacterColors('Veldryn',effectivePlayerNameStyle(gradient)).length===7,'Gradient should resolve one color per character');
ok(SUPPORTER_NAME_PRESETS.some(row=>row.id==='prismatic'),'Supporter should include Prismatic preset');

const vipProduct=COMMERCE_PRODUCTS.find(row=>row.id==='vip')!,vipPlusProduct=COMMERCE_PRODUCTS.find(row=>row.id==='vip_plus')!,upgrade=COMMERCE_PRODUCTS.find(row=>row.id==='vip_plus_upgrade')!,sub=COMMERCE_PRODUCTS.find(row=>row.id==='supporter_monthly')!;
eq(vipProduct.playProductId,'vip','VIP Google Play product id');eq(vipPlusProduct.playProductId,'vip_plus','VIP+ Google Play product id');eq(upgrade.playProductId,'vip_plus_upgrade','VIP+ upgrade Google Play product id');eq(sub.playProductId,'supporter_monthly','Supporter Google Play product id');
eq(sub.preferredBasePlanId,'monthly','Supporter should use monthly Play base plan');eq(PLAY_BILLING_PACKAGE_NAME,'com.elroybenjamins.veldryn','Google Play package');
ok(GOOGLE_PLAY_ONE_TIME_PRODUCT_IDS.length===3&&GOOGLE_PLAY_SUBSCRIPTION_PRODUCT_IDS.length===1,'Google Play catalog should split one-time products and subscription');
ok(COMMERCE_PRODUCTS.every(row=>!('priceEur' in row)),'Prices must not be hardcoded in the app; Google Play supplies localized prices');
ok(COMMERCE_GUARDRAILS.pricesManagedByPlayConsole&&!COMMERCE_GUARDRAILS.ads,'Play Console pricing should be authoritative and ads disabled');

const stale={...base,account:{...base.account,entitlements:{vipplus:true,supporter_subscription:true,unrelated:true}}};
const synced=withServerCommerceEntitlements(stale,{vip:true,vipPlus:false,supporter:false,supporterExpiresAt:null});
b=accountEntitlementBenefits(synced);
ok(b.vip&&!b.vipPlus&&!b.supporter,'Server sync must clear stale commerce aliases');
ok(synced.account.entitlements?.unrelated===true,'Server commerce sync must preserve unrelated account entitlements');

ok(!COMMERCE_GUARDRAILS.paidPremiumCurrency&&!COMMERCE_GUARDRAILS.paidPvpPower&&!COMMERCE_GUARDRAILS.paidRankingStrength,'Commerce guardrails must keep paid currency/PvP power/ranking strength disabled');

console.log('PASS: VIP, VIP+, Supporter QoL, Play-local pricing and name-style entitlement contracts');
