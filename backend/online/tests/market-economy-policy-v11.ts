import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {marketDraftResourceIdsV10,previewMarketPriceBandV10} from '../market-price-bands-v10';
import {
 MARKET_ECONOMY_V11_RELEASED,MARKET_SALE_TAX_BASIS_POINTS_V11,
 marketDraftResourceMinLotV11,marketDraftMinimumLotV11,marketDraftLotCheckV11,
 marketDraftSettlementV11,previewVerifiedMarketPriceReviewV11,
 type MarketSettledTradeEvidenceV11,
} from '../market-economy-policy-v11';

assert.equal(MARKET_ECONOMY_V11_RELEASED,false,'Do not release the Market');
assert.equal(MARKET_SALE_TAX_BASIS_POINTS_V11,500);
assert.equal(marketDraftResourceMinLotV11('COPPER_ORE'),10);
assert.equal(marketDraftResourceMinLotV11('GREENWOOD_LOG'),10);
assert.equal(marketDraftResourceMinLotV11('IRONWOOD_LOG'),5);
assert.equal(marketDraftResourceMinLotV11('DUNEWOOD'),5);
assert.equal(marketDraftResourceMinLotV11('ASTRAL_SCRIPT'),1);
assert.equal(marketDraftResourceMinLotV11('HOLY_WATER'),undefined);
assert.equal(marketDraftResourceMinLotV11('NOT_A_REAL_ITEM'),undefined);
assert.equal(marketDraftMinimumLotV11('COPPER_ORE','equipment'),undefined);
assert.equal(marketDraftMinimumLotV11('basic_sword','equipment'),undefined,'Legacy gear must not get a market listing preview');
assert.equal(marketDraftLotCheckV11('COPPER_ORE','resource',9).valid,false);
assert.equal(marketDraftLotCheckV11('COPPER_ORE','resource',10).valid,true);
assert.equal(marketDraftLotCheckV11('COPPER_ORE','resource',10).canListNow,false);
assert.equal(marketDraftLotCheckV11('ASTRAL_SCRIPT','resource',1).valid,true);
assert.equal(marketDraftLotCheckV11('ASTRAL_SCRIPT','resource',0).valid,false);
assert.equal(marketDraftLotCheckV11('COPPER_ORE','resource',10.5).valid,false);
assert.equal(marketDraftLotCheckV11('COPPER_ORE','resource',2_147_483_648).valid,false);
for(const id of marketDraftResourceIdsV10()){
 assert([1,5,10].includes(marketDraftResourceMinLotV11(id)!),'All 35 resource lot sizes explicitly supported');
}
const tax=(total:number)=>marketDraftSettlementV11(total,1);
assert.deepEqual(
 {gross:tax(100).grossGold,fee:tax(100).feeGold,payout:tax(100).sellerGold},
 {gross:100,fee:5,payout:95},
 'Buyer pays 100, seller receives 95 and exactly 5 Gold leave circulation');
assert.equal(tax(101).feeGold,6,'5% seller Gold sink always rounds up');
assert.equal(tax(19).feeGold,1,'Small valid sale always pays at least 1 Gold tax');
assert.equal(tax(1).valid,false,'Do not allow a sale which pays zero Gold to seller');
assert.equal(tax(2).valid,true);
assert.equal(marketDraftSettlementV11(23,10).feeGold,12,'Use whole listing total, not per-unit rounded tax');
assert.equal(marketDraftSettlementV11(23,10).sellerGold,218);
assert.equal(marketDraftSettlementV11(100,0).valid,false);
assert.equal(marketDraftSettlementV11(100,1.5).valid,false);
assert.equal(marketDraftSettlementV11(1_000_000_000_000,1_001).valid,false,'Maximum gross Gold safety');
for(const amount of [2,11,19,20,21,99,100,101,230,10_000,1_000_000,1_000_000_000]){
 const q=tax(amount);
 assert(q.valid&&q.grossGold===q.feeGold+q.sellerGold,'Gold conservation on every quote');
 assert(q.feeGold===Math.ceil(amount*.05),'Whole-Gold tax rounding exactly matches 5%');
 assert(q.canSettleNow===false,'No preview may settle a real trade');
}

const band=previewMarketPriceBandV10('DUNEWOOD','resource')!;
const now=1_900_000_000_000;
const sale=(i:number,override:Partial<MarketSettledTradeEvidenceV11>={}):MarketSettledTradeEvidenceV11=>({
 offerId:'sale-'+i,itemId:'DUNEWOOD',kind:'resource',
 buyerAccountId:'buyer-'+(i%10),sellerAccountId:'seller-'+(i%10),
 quantity:10,unitGold:200,grossGold:2000,feeGold:100,sellerGold:1900,
 settledAtMs:Math.round(now-(i/29)*6.5*86_400_000),status:'settled',...override,
});
const thirty=Array.from({length:30},(_,i)=>sale(i));
const review=previewVerifiedMarketPriceReviewV11(band,thirty,now);
assert.equal(review.reason,'review_suggested');
assert(review.enoughEvidence&&review.proposedMin!==null&&review.proposedMax!==null);
assert.equal(review.autoApply,false,'No live repricing without an explicit reviewed action');
assert.equal(review.verifiedMedian,200);
assert(review.proposedMin!>band.unitMin&&review.proposedMin!<=band.unitMin*1.1+band.tick);
assert(review.proposedMax!>band.unitMax&&review.proposedMax!<=band.unitMax*1.1+band.tick);
assert(review.proposedMax!<=review.proposedMin!*6);
assert.equal(previewVerifiedMarketPriceReviewV11(band,thirty.slice(0,29),now).reason,'thin_market');
assert.equal(previewVerifiedMarketPriceReviewV11(band,thirty.map(row=>({...row,buyerAccountId:'same'})),now).reason,'too_concentrated');
assert.equal(previewVerifiedMarketPriceReviewV11(band,thirty.map(row=>({...row,settledAtMs:now-1_000})),now).reason,'insufficient_history');
assert.equal(previewVerifiedMarketPriceReviewV11(band,thirty.map(row=>({...row,feeGold:0,sellerGold:2000})),now).reason,'thin_market','Forged tax-free receipts cannot distort median');
assert.equal(previewVerifiedMarketPriceReviewV11(band,thirty.map(row=>({...row,status:'cancelled'})),now).reason,'thin_market','Unsettled offers never set prices');
assert.equal(previewVerifiedMarketPriceReviewV11(band,thirty.map(row=>({...row,sellerAccountId:row.buyerAccountId})),now).reason,'thin_market','Self-trades ignored');
assert.equal(previewVerifiedMarketPriceReviewV11(band,thirty.map(row=>({...row,offerId:'replayed-id'})),now).reason,'thin_market','Idempotency replays do not increase trade counts');
assert.equal(previewVerifiedMarketPriceReviewV11(band,thirty.map(row=>({...row,unitGold:2,grossGold:20,feeGold:1,sellerGold:19})),now).reason,'review_suggested','Low-priced genuine sales can propose a downward band adjustment');

const fs=(name:string)=>readFileSync('supabase/migrations/'+name,'utf8');
const base=fs('20261110103500_market_lot_tax_policy_foundation_v11.sql');
const publish=fs('20261110104000_market_offer_minimum_lots_private_v11.sql');
const settle=fs('20261110104500_market_completed_sale_gold_tax_private_v11.sql');
assert(base.includes('approved boolean not null default false'),'Seeded minimum lots must be unpublished');
assert(base.includes('enable row level security'),'Private policy table must have RLS');
assert((base.match(/revoke all on function private\.market_/g)??[]).length===2,'Neither preview RPC can be called by users');
assert((publish.match(/market_listing_lot_valid_v11\(/g)??[]).length===2,'Stack and gear publishers must both enforce lot policy');
assert((settle.match(/market_sale_tax_quote_v11\(/g)??[]).length===2,'Both settlement transactions must obtain the exact fee');
assert((settle.match(/v_new_seller_gold:=v_seller_gold\+v_payout;/g)??[]).length===2,'Payout rather than gross must be credited to seller');
assert((settle.match(/v_gross,v_fee,v_payout,'settled'/g)??[]).length===2,'Durable ledger preserves gross=fee+net');
assert((settle.match(/'sellerGoldReceived',v_payout,'feeGold',v_fee/g)??[]).length===2,'Receipts must show actual seller payout');
assert((settle.match(/market_offer_price_valid_v10\(/g)??[]).length===2,'Revalidate live price policy before paying Gold');
assert((settle.match(/market_listing_lot_valid_v11\(/g)??[]).length===2,'Revalidate lot size before paying Gold');
const evidence=fs('20261110105000_market_verified_sale_review_private_v11.sql');
assert(evidence.includes('private.market_purchase_receipts_v3')&&evidence.includes('private.market_gold_intents_v2')&&evidence.includes("g.status='settled'"),'Price-review evidence must join the actual settled receipts and Gold ledger');
assert(evidence.includes("o.status='sold'")&&evidence.includes('limit 1000'),'Price-review evidence must only use bounded completed sales');
assert(evidence.includes('p.result->>\'feeGold\'=g.fee_gold::text'),'Actual seller fee must match the stored Gold receipt');
assert(evidence.includes('revoke all on function private.market_verified_completed_sales_v11'),'Never expose sale review evidence to clients');
assert(!/trading_enabled\s*=\s*true|equipment_transfers_enabled\s*=\s*true|grant execute\b/i.test(base+'\n'+publish+'\n'+settle),'Never activate trading or grant player RPCs');
console.log('PASS: dormant Market V11 resource lots, seller 5% tax, Gold conservation and anti-wash weekly review proposals');
