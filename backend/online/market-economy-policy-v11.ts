import {itemDef} from '../../apps/mobile/src/content/items';
import {marketDraftResourceIdsV10,type MarketPriceBandV10} from './market-price-bands-v10';

/** Market stays unreleased. Every result is guidance, not a trade authorization. */
export const MARKET_ECONOMY_V11_RELEASED=false as const;
export const MARKET_SALE_TAX_BASIS_POINTS_V11=500;
export const MARKET_MAX_GROSS_GOLD_V11=1_000_000_000_000_000;
export const MARKET_PRICE_REVIEW_MIN_TRADES_V11=30;
export const MARKET_PRICE_REVIEW_MIN_DISTINCT_ACCOUNTS_V11=10;
export const MARKET_PRICE_REVIEW_LOOKBACK_DAYS_V11=7;
export const MARKET_PRICE_REVIEW_MAX_CHANGE_V11=.10;

/** Avoid tiny common-material spam without preventing rare-material listings.
 * The entire catalog still requires explicit server-owned price/trade approval.
 */
const TEN_UNIT_RESOURCES=new Set([
 'COPPER_ORE','GREENWOOD_LOG','MOSS_FIBER','BOAR_HIDE','WISP_DUST','MEADOW_PERCH',
]);
const FIVE_UNIT_RESOURCES=new Set([
 'IRONWOOD_LOG','WOLF_PELT','THORN_SAP','IRONWOOD_FANG','TROLL_HIDE','ASTER_IRON_ORE',
 'DUNEWOOD','SUNSTONE_ORE','COPPER_INGOT',
]);
export function marketDraftResourceMinLotV11(itemId:string):number|undefined{
 if(!marketDraftResourceIdsV10().includes(itemId))return undefined;
 try{if(itemDef(itemId).type!=='material')return undefined;}catch{return undefined;}
 return TEN_UNIT_RESOURCES.has(itemId)?10:FIVE_UNIT_RESOURCES.has(itemId)?5:1;
}
export function marketDraftMinimumLotV11(itemId:string,kind:'resource'|'equipment'):number|undefined{
 if(kind==='resource')return marketDraftResourceMinLotV11(itemId);
 if(kind==='equipment'){
  try{if(itemDef(itemId).type!=='gear')return undefined;}catch{return undefined;}
  return 1;
 }
 return undefined;
}
export function marketDraftLotCheckV11(itemId:string,kind:'resource'|'equipment',quantity:number){
 const minimum=marketDraftMinimumLotV11(itemId,kind);
 return {minimum,valid:minimum!==undefined&&Number.isSafeInteger(quantity)
   &&quantity>=minimum&&quantity<=2_147_483_647,canListNow:false as const};
}

/** 5% on SOLD listings only, rounded UP to the next whole Gold.
 * Seller receives gross minus fee. The fee is destroyed (not transferred).
 */
export function marketDraftSettlementV11(unitGold:number,quantity:number){
 if(!Number.isSafeInteger(unitGold)||unitGold<1||unitGold>1_000_000_000_000
   ||!Number.isSafeInteger(quantity)||quantity<1||quantity>2_147_483_647
   ||unitGold*quantity>MARKET_MAX_GROSS_GOLD_V11)
  return {valid:false as const,grossGold:0,feeGold:0,sellerGold:0,canSettleNow:false as const};
 const grossGold=unitGold*quantity;
 const feeGold=Math.ceil(grossGold*MARKET_SALE_TAX_BASIS_POINTS_V11/10_000);
 const sellerGold=grossGold-feeGold;
 return {valid:sellerGold>=1,grossGold,feeGold,sellerGold,canSettleNow:false as const};
}

export interface MarketSettledTradeEvidenceV11 {
 /** Must originate from the server's settled, idempotent purchase receipt. */
 offerId:string;
 itemId:string;
 kind:'resource'|'equipment';
 buyerAccountId:string;
 sellerAccountId:string;
 quantity:number;
 unitGold:number;
 grossGold:number;
 feeGold:number;
 sellerGold:number;
 settledAtMs:number;
 status:'settled'|'pending'|'cancelled'|'refunded';
}
export interface MarketPriceReviewV11 {
 enoughEvidence:boolean;
 reason:'thin_market'|'too_concentrated'|'insufficient_history'|'no_change'|'review_suggested';
 completedTrades:number;
 distinctBuyers:number;
 distinctSellers:number;
 currentMin:number;
 currentMax:number;
 proposedMin:number|null;
 proposedMax:number|null;
 verifiedMedian:number|null;
 /** Never authorizes a DB write, regardless of this field. */
 autoApply:false;
}
function median(sorted:readonly number[]):number{
 const index=Math.floor(sorted.length/2);
 return sorted.length%2?sorted[index]:(sorted[index-1]+sorted[index])/2;
}
const inMax=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const rounded=(n:number,tick:number)=>Math.round(n/tick)*tick;

/** Human-review recommendation, NOT auto-repricing. Input must be read from
 * locked, settled server ledgers: do not pass client-supplied trade history.
 * Conservative anti-wash checks intentionally reject thin concentrated markets.
 */
export function previewVerifiedMarketPriceReviewV11(
 band:MarketPriceBandV10,trades:readonly MarketSettledTradeEvidenceV11[],nowMs:number,
):MarketPriceReviewV11{
 const base={enoughEvidence:false,currentMin:band.unitMin,currentMax:band.unitMax,
  proposedMin:null,proposedMax:null,verifiedMedian:null,autoApply:false as const};
 const fail=(reason:MarketPriceReviewV11['reason'],rows:readonly MarketSettledTradeEvidenceV11[]=[])=>({
  ...base,reason,completedTrades:rows.length,
  distinctBuyers:new Set(rows.map(row=>row.buyerAccountId)).size,
  distinctSellers:new Set(rows.map(row=>row.sellerAccountId)).size,
 });
 if(!Number.isSafeInteger(nowMs)||nowMs<0||!Number.isSafeInteger(band.tick)||band.tick<1
  ||!Number.isSafeInteger(band.unitMin)||!Number.isSafeInteger(band.unitMax)
  ||band.unitMin<1||band.unitMax<band.unitMin
  ||band.unitMax>band.unitMin*6+band.tick)return fail('thin_market');
 const seen=new Set<string>(),cutoff=nowMs-MARKET_PRICE_REVIEW_LOOKBACK_DAYS_V11*86_400_000;
 const rows:MarketSettledTradeEvidenceV11[]=[];
 for(const trade of trades){
  if(trade.itemId!==band.itemId||trade.kind!==band.assetKind
    ||trade.status!=='settled'||!trade.offerId||seen.has(trade.offerId)
    ||!trade.buyerAccountId||!trade.sellerAccountId
    ||trade.buyerAccountId===trade.sellerAccountId
    ||!Number.isSafeInteger(trade.settledAtMs)||trade.settledAtMs<cutoff||trade.settledAtMs>nowMs
    ||!Number.isSafeInteger(trade.unitGold)||trade.unitGold<1||trade.unitGold>1_000_000_000_000
    ||!Number.isSafeInteger(trade.quantity)||trade.quantity<1
    ||!Number.isSafeInteger(trade.grossGold)||trade.grossGold!==trade.unitGold*trade.quantity
    ||trade.grossGold>MARKET_MAX_GROSS_GOLD_V11
    ||!Number.isSafeInteger(trade.feeGold)
    ||trade.feeGold!==Math.ceil(trade.grossGold*MARKET_SALE_TAX_BASIS_POINTS_V11/10_000)
    ||trade.sellerGold!==trade.grossGold-trade.feeGold
  )continue;
  seen.add(trade.offerId);rows.push(trade);
 }
 if(rows.length<MARKET_PRICE_REVIEW_MIN_TRADES_V11)return fail('thin_market',rows);
 const buyers=new Map<string,number>(),sellers=new Map<string,number>(),pairs=new Map<string,number>();
 for(const row of rows){
  buyers.set(row.buyerAccountId,(buyers.get(row.buyerAccountId)??0)+1);
  sellers.set(row.sellerAccountId,(sellers.get(row.sellerAccountId)??0)+1);
  const pair=row.buyerAccountId+'|'+row.sellerAccountId;
  pairs.set(pair,(pairs.get(pair)??0)+1);
 }
 if(buyers.size<MARKET_PRICE_REVIEW_MIN_DISTINCT_ACCOUNTS_V11
  ||sellers.size<MARKET_PRICE_REVIEW_MIN_DISTINCT_ACCOUNTS_V11
  ||[...buyers.values(),...sellers.values()].some(count=>count>rows.length*.2)
  ||[...pairs.values()].some(count=>count>rows.length*.1)
 )return fail('too_concentrated',rows);
 if(Math.min(...rows.map(row=>row.settledAtMs))>nowMs-6*86_400_000)
  return fail('insufficient_history',rows);
 const ordered=rows.map(row=>row.unitGold).sort((a,b)=>a-b);
 const trim=Math.floor(rows.length*.1);
 const verifiedMedian=median(ordered.slice(trim,ordered.length-trim));
 const middle=(band.unitMin+band.unitMax)/2;
 const move=inMax(verifiedMedian/middle-1,-MARKET_PRICE_REVIEW_MAX_CHANGE_V11,MARKET_PRICE_REVIEW_MAX_CHANGE_V11);
 const proposedMin=Math.max(band.tick,rounded(band.unitMin*(1+move),band.tick));
 const proposedMax=Math.max(proposedMin,rounded(band.unitMax*(1+move),band.tick));
 const constrainedMax=Math.min(proposedMax,proposedMin*6);
 if(proposedMin===band.unitMin&&constrainedMax===band.unitMax)
  return {...fail('no_change',rows),verifiedMedian};
 return {...fail('review_suggested',rows),enoughEvidence:true,proposedMin,
  proposedMax:constrainedMax,verifiedMedian};
}
