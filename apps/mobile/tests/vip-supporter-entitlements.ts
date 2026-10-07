import {createCharacter,newGame,offlineCapBreakdown} from '../src/core/game';
import {accountEntitlementBenefits,entitlementStorageCapacity,withServerCommerceEntitlements} from '../src/core/account-entitlements';
import {characterPermanentMultipliers} from '../src/core/permanent-boosts';
import {activityQueueCapacity} from '../src/core/activity-queue';
import {characterLoadoutSlotCount} from '../src/core/character-loadouts';
import {equipmentCraftSlotBreakdown} from '../src/core/equipment-crafting-queue';
import {effectivePlayerNameStyle,normalizeHexColor,playerNameCharacterColors,savePlayerNameStyle,SUPPORTER_NAME_PRESETS} from '../src/core/player-name-style';
import {COMMERCE_GUARDRAILS,COMMERCE_PRODUCTS,COMMERCE_PRODUCT_BONUSES,GOOGLE_PLAY_ONE_TIME_PRODUCT_IDS,GOOGLE_PLAY_SUBSCRIPTION_PRODUCT_IDS,PLAY_BILLING_PACKAGE_NAME} from '../src/content/commerce-products';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function eq(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}

const base=createCharacter(newGame(0),'IRONWARDEN','Entitlement Tester');
const vip={...base,account:{...base.account,entitlements:{vip:true}}};
const vipPlus={...base,account:{...base.account,entitlements:{vip_plus:true}}};
const supporter={...base,account:{...base.account,entitlements:{supporter:true}}};
const both={...base,account:{...base.account,entitlements:{vip:true,vip_plus:true}}};
const plusSupporter={...base,account:{...base.account,entitlements:{vip_plus:true,supporter:true}}};
const stacked={...base,account:{...base.account,entitlements:{vip:true,vip_plus:true,supporter:true},unlockedCharacterSlots:4}};

let b=accountEntitlementBenefits(vip);
ok(b.vip&&!b.vipPlus&&!b.supporter,'VIP entitlement should remain distinct');
eq(b.inventorySlots,10,'VIP Inventory slots');eq(b.bankSlots,20,'VIP Bank slots');eq(b.loadoutSlots,1,'VIP loadout slots');
b=accountEntitlementBenefits(vipPlus);
ok(!b.vip&&b.vipPlus,'VIP+ alone must not grant VIP');eq(b.afkHours,2,'VIP+ independent offline hours');eq(b.inventorySlots,10,'VIP+ independent Inventory slots');eq(b.bankSlots,30,'VIP+ independent Bank slots');eq(b.loadoutSlots,1,'VIP+ independent loadouts');eq(b.actionQueueSlots,1,'VIP+ Action Queue slot');eq(b.forgeSlots,1,'VIP+ Forge slot');
b=accountEntitlementBenefits(both);
ok(b.vip&&b.vipPlus&&!b.supporter,'Both permanent tiers stay active independently');eq(b.afkHours,4,'Both tiers offline hours');eq(b.inventorySlots,20,'Both tiers Inventory slots');eq(b.bankSlots,50,'Both tiers Bank slots');eq(b.loadoutSlots,2,'Both tiers loadouts');
b=accountEntitlementBenefits(supporter);
ok(b.supporter&&!b.vip&&!b.vipPlus,'Supporter should stack independently');eq(b.forgeSlots,1,'Supporter Forge slot');eq(b.inventorySlots,0,'Supporter must not grant temporary storage');
b=accountEntitlementBenefits(plusSupporter);
ok(!b.vip&&b.vipPlus&&b.supporter,'Supporter plus VIP+ must not imply VIP');eq(b.afkHours,4,'VIP+ and Supporter offline hours');eq(b.forgeSlots,2,'VIP+ and Supporter Forge slots add together');
eq(accountEntitlementBenefits(stacked).afkHours,6,'All three entitlements grant six paid offline hours');
let m=characterPermanentMultipliers(vip);
eq(m.gatheringSpeedMultiplier,1.05,'VIP Gathering speed multiplier');eq(m.characterXpMultiplier,1.05,'VIP Combat XP multiplier');eq(m.dropChanceMultiplier,1,'VIP does not inherit VIP+ drops');eq(m.craftingSpeedMultiplier,1,'VIP does not inherit VIP+ crafting speed');
m=characterPermanentMultipliers(vipPlus);
eq(m.dropChanceMultiplier,1.05,'VIP+ drop chance multiplier');eq(m.craftingSpeedMultiplier,1.10,'VIP+ Crafting speed multiplier');eq(m.gatheringSpeedMultiplier,1,'VIP+ does not imply VIP Gathering speed');eq(m.characterXpMultiplier,1,'VIP+ does not imply VIP Combat XP');
m=characterPermanentMultipliers(both);
eq(m.gatheringSpeedMultiplier,1.05,'Stacked tiers keep VIP Gathering speed');eq(m.characterXpMultiplier,1.05,'Stacked tiers keep VIP Combat XP');eq(m.dropChanceMultiplier,1.05,'Stacked tiers keep VIP+ drops');eq(m.craftingSpeedMultiplier,1.10,'Stacked tiers keep VIP+ Crafting speed');
eq(entitlementStorageCapacity(vipPlus,'inventory'),40,'VIP+ effective starter Inventory');eq(entitlementStorageCapacity(vipPlus,'bank'),150,'VIP+ effective starter Bank');
eq(entitlementStorageCapacity(both,'inventory'),50,'Both tiers effective starter Inventory');eq(entitlementStorageCapacity(both,'bank'),170,'Both tiers effective starter Bank');
eq(characterLoadoutSlotCount(vipPlus),2,'VIP+ independent loadout capacity');eq(characterLoadoutSlotCount(both),3,'Both tiers loadout capacity');eq(activityQueueCapacity(vipPlus),3,'VIP+ queue capacity');
eq(offlineCapBreakdown(vipPlus).hours-offlineCapBreakdown(base).hours,2,'Offline runtime gives VIP+ only its own reserve grant');
eq(offlineCapBreakdown(both).hours-offlineCapBreakdown(base).hours,4,'Offline runtime stacks both permanent tiers');
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

const vipProduct=COMMERCE_PRODUCTS.find(row=>row.id==='vip')!,vipPlusProduct=COMMERCE_PRODUCTS.find(row=>row.id==='vip_plus')!,sub=COMMERCE_PRODUCTS.find(row=>row.id==='supporter_monthly')!;
eq(vipProduct.playProductId,'vip','VIP Google Play product id');eq(vipPlusProduct.playProductId,'vip_plus','VIP+ Google Play product id');eq(vipPlusProduct.name,'VIP+','VIP+ remains a separate permanent purchase');eq(sub.playProductId,'supporter_monthly','Supporter Google Play product id');
eq(sub.preferredBasePlanId,'monthly','Supporter should use monthly Play base plan');eq(PLAY_BILLING_PACKAGE_NAME,'com.elroybenjamins.veldryn','Google Play package');
eq(GOOGLE_PLAY_ONE_TIME_PRODUCT_IDS.join(','),'vip,vip_plus','Only independent VIP and VIP+ products belong in the one-time Play catalog');eq(GOOGLE_PLAY_SUBSCRIPTION_PRODUCT_IDS.join(','),'supporter_monthly','Supporter remains the single subscription');
ok(COMMERCE_PRODUCTS.every(row=>!('priceEur' in row)),'Prices must not be hardcoded in the app; Google Play supplies localized prices');
for(const [id,state] of [['vip',vip],['vip_plus',vipPlus],['supporter_monthly',supporter]] as const){
 const actual=accountEntitlementBenefits(state),items=COMMERCE_PRODUCT_BONUSES[id].items;
 for(const [value,label] of [[actual.afkHours,'hours offline reserve'],[actual.inventorySlots,'inventory slots'],[actual.bankSlots,'bank slots'],[actual.loadoutSlots,'saved loadout'],[actual.forgeSlots,'active Forge slot']] as const){
  if(value)ok(items.some(item=>item.startsWith(`+${value} ${label}`)),`${id} bonus display matches ${label}`);
 }
}
ok(COMMERCE_PRODUCT_BONUSES.vip_plus.items.includes('+1 waiting activity slot (3 total)'),'VIP+ disclosure includes the third waiting slot');
ok(COMMERCE_PRODUCT_BONUSES.vip_plus.note.includes('Stacks with VIP'),'VIP+ disclosure makes independent stacking clear');
ok(COMMERCE_PRODUCT_BONUSES.supporter_monthly.note.includes('while subscribed'),'Supporter bonuses disclose their duration');
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
const rowSource=fs.readFileSync('src/components/CommerceProductRow.tsx','utf8');
ok(rowSource.includes('useState(false)')&&rowSource.includes('accessibilityState={{expanded}}'),'Product bonuses start collapsed and expose expansion state');
ok(rowSource.includes('{expanded?<View')&&rowSource.includes('setExpanded(value=>!value)'),'Bonus content mounts only when expanded and can be collapsed');
ok(rowSource.includes('width:44,height:44')&&rowSource.includes('title:label'),'Small plus retains a touch target and web tooltip');
ok(COMMERCE_GUARDRAILS.pricesManagedByPlayConsole&&!COMMERCE_GUARDRAILS.ads,'Play Console pricing should be authoritative and ads disabled');

const stale={...base,account:{...base.account,entitlements:{vipplus:true,supporter_subscription:true,unrelated:true}}};
const synced=withServerCommerceEntitlements(stale,{vip:true,vipPlus:false,supporter:false,supporterExpiresAt:null});
b=accountEntitlementBenefits(synced);
ok(b.vip&&!b.vipPlus&&!b.supporter,'Server sync must clear stale commerce aliases');
ok(synced.account.entitlements?.unrelated===true,'Server commerce sync must preserve unrelated account entitlements');
const syncedPlus=withServerCommerceEntitlements(stale,{vip:false,vipPlus:true,supporter:false,supporterExpiresAt:null});
b=accountEntitlementBenefits(syncedPlus);
ok(!b.vip&&b.vipPlus&&!b.supporter,'Server VIP+ access must not synthesize a VIP grant');

ok(!COMMERCE_GUARDRAILS.paidPremiumCurrency&&!COMMERCE_GUARDRAILS.paidPvpPower&&!COMMERCE_GUARDRAILS.paidRankingStrength,'Commerce guardrails must keep paid currency/PvP power/ranking strength disabled');

// Release AAB entitlement regression coverage.
console.log('PASS: VIP, VIP+, Supporter benefits, Play-local pricing and name-style entitlement contracts');
