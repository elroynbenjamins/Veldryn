import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ITEMS,itemDef} from '../../../apps/mobile/src/content/items';
import {V33_EQUIPMENT_RECIPES} from '../../../apps/mobile/src/content/equipment-recipes-v33';
import {
 MARKET_PRICE_BANDS_RELEASED_V10,marketDraftResourceIdsV10,
 previewMarketListingPriceV10,previewMarketPriceBandV10,
} from '../market-price-bands-v10';

assert.equal(MARKET_PRICE_BANDS_RELEASED_V10,false,'Market must remain hidden and unreleased');
const seeds=marketDraftResourceIdsV10();
assert(seeds.length>=35,'Draft resource corridors should cover early and advanced zones');
assert.equal(new Set(seeds).size,seeds.length,'No duplicate seed IDs');
for(const id of seeds){
 const item=itemDef(id);
 assert.equal(item.type,'material',id+' must refer to a real resource');
 assert(item.value>0&&!item.guildOnly&&!item.knowledgeUnlockId,id+' must not be a restricted currency or quest item');
 const band=previewMarketPriceBandV10(id,'resource');
 assert(band,id+' has a draft quote');
 assert.equal(band.approved,false);
 assert(band.unitMin>=1&&band.unitMax>=band.unitMin);
 assert(band.unitMax<=band.unitMin*6+band.tick,'No extreme starter price caps');
 assert(previewMarketListingPriceV10(band,band.unitMin,10).valid,'Listing inside the range is a valid proposal');
 assert(!previewMarketListingPriceV10(band,band.unitMin-1,10).valid,'Below-floor quote must fail');
 assert(!previewMarketListingPriceV10(band,band.unitMax+band.tick,10).valid,'Above-cap quote must fail');
 assert.equal(previewMarketListingPriceV10(band,band.unitMin,10).canListNow,false,'A valid preview still cannot authorize trading');
}
assert.equal(previewMarketPriceBandV10('SUNSCALE','resource'),undefined,'No phantom catalog IDs');
assert.equal(previewMarketPriceBandV10('HOLY_WATER','resource'),undefined,'Unpriced nontradable materials default denied');
assert.equal(previewMarketPriceBandV10('basic_sword','equipment',undefined),undefined,'No price for legacy unreceipted equipment');
assert.equal(previewMarketPriceBandV10('COPPER_ORE','equipment',{rarity:'common',quality:50,enhancementRank:0}),undefined,'Resource cannot be priced as gear');
assert.equal(previewMarketPriceBandV10('INVALID_ID','resource'),undefined,'Unknown assets never get quotes');

const tiers=[...new Set(V33_EQUIPMENT_RECIPES.map(row=>row.v33EquipmentTier))].sort();
assert.deepEqual(tiers,['T1','T2','T3','T4','T5','T6','T7','T8','T9']);
let earlier=0;
for(const tier of tiers){
 const recipe=V33_EQUIPMENT_RECIPES.find(row=>row.v33EquipmentTier===tier)!;
 const id=recipe.output.itemId;
 assert.equal(itemDef(id).type,'gear');
 const common=previewMarketPriceBandV10(id,'equipment',{rarity:'common',quality:50,enhancementRank:0})!;
 const quality=previewMarketPriceBandV10(id,'equipment',{rarity:'common',quality:100,enhancementRank:0})!;
 const epic=previewMarketPriceBandV10(id,'equipment',{rarity:'epic',quality:50,enhancementRank:0})!;
 const enchant=previewMarketPriceBandV10(id,'equipment',{rarity:'common',quality:50,enhancementRank:4})!;
 assert(common,'Valid verified forged gear can receive a draft range');
 assert(common.unitMin>earlier,'Tier values should increase monotonically');
 earlier=common.unitMin;
 assert(quality.unitMin>common.unitMin,'Higher quality should increase the listing floor');
 assert(epic.unitMin>common.unitMin,'Higher Forge rarity should increase the listing floor');
 assert(enchant.unitMin>common.unitMin,'Permanent enhancements increase the listing floor');
 assert.equal(common.approved,false);
 assert.equal(previewMarketListingPriceV10(common,common.unitMin,1).canListNow,false);
 assert.equal(previewMarketPriceBandV10(id,'equipment',{rarity:'common',quality:101,enhancementRank:0}),undefined);
 assert.equal(previewMarketPriceBandV10(id,'equipment',{rarity:'common',quality:50.5,enhancementRank:0}),undefined);
 assert.equal(previewMarketPriceBandV10(id,'equipment',{rarity:'common',quality:50,enhancementRank:5}),undefined);
 assert(!previewMarketListingPriceV10(common,common.unitMin,0).valid);
 assert(!previewMarketListingPriceV10(common,common.unitMin,2.5).valid);
 assert(!previewMarketListingPriceV10(common,common.unitMin,-1).valid);
 if(common.tick>1)assert(!previewMarketListingPriceV10(common,common.unitMin+1,1).valid,'Price ticks are enforced');
}
const source=readFileSync('supabase/migrations/20261110095000_market_private_price_bands_v10.sql','utf8');
const guard=readFileSync('supabase/migrations/20261110095500_market_private_offer_price_guard_v10.sql','utf8');
assert(source.includes('approved boolean not null default false'),'Private price bands must be unapproved by default');
assert(source.includes('check(max_unit_price<=min_unit_price*6)'),'Server enforces a corridor-width ceiling');
assert(source.includes('private.market_offer_price_valid_v10'),'Private quote validator is installed');
assert(source.includes('private.market_equipment_tier_bands_v10'),'Tier-wide exact-copy source rules exist');
assert(guard.includes('create or replace function private.market_publish_sale_offer_v5')&&guard.includes('create or replace function private.market_publish_equipment_offer_v9'),'Stack and exact equipment offers both require a price check');
assert((guard.match(/market_offer_price_valid_v10\(/g)??[]).length===2,'Both publishers call price validation inside the escrow transaction');
assert(!/trading_enabled\s*=\s*true|equipment_transfers_enabled\s*=\s*true|PLAYER_MARKET_RELEASED\s*=\s*true/.test(source+'\n'+guard),'Never activate trading in a pricing migration');
assert(ITEMS.length>seeds.length,'This is a curated subset, not a blanket automatic tradability list');
console.log('PASS: 35+ draft resource bands, T1-T9 exact-gear quality/rarity/enchant ranges, safe bounds and private publisher guards');
