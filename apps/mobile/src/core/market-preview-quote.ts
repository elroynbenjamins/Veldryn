/**
 * Display-only quote helper for the hidden Player Market design screen.
 * Never use this result to settle a sale or authorize a purchase; real fees,
 * price bounds, item ownership and proceeds belong to the authenticated server.
 */
export const MARKET_PREVIEW_MAX_QUANTITY=99_999;
export const MARKET_PREVIEW_MAX_UNIT_PRICE=99_999_999;
export const MARKET_PREVIEW_SELLER_FEE_RATE=0.05;

export type MarketPreviewQuote={
 quantity:number;
 pricePerUnit:number;
 gross:number;
 fee:number;
 net:number;
 valid:boolean;
 issue:string|null;
};

const parseInput=(text:string,max:number)=>{
 const clean=text.trim();
 if(!/^\d+$/.test(clean))return null;
 const value=Number(clean);
 return Number.isSafeInteger(value)&&value>=1&&value<=max?value:null;
};

export function estimateMarketPreviewQuote(quantityText:string,unitPriceText:string):MarketPreviewQuote{
 const quantity=parseInput(quantityText,MARKET_PREVIEW_MAX_QUANTITY);
 const pricePerUnit=parseInput(unitPriceText,MARKET_PREVIEW_MAX_UNIT_PRICE);
 if(quantity===null||pricePerUnit===null){
  return {quantity:0,pricePerUnit:0,gross:0,fee:0,net:0,valid:false,
   issue:`Enter whole positive values: quantity 1–${MARKET_PREVIEW_MAX_QUANTITY.toLocaleString('en-US')}, unit price 1–${MARKET_PREVIEW_MAX_UNIT_PRICE.toLocaleString('en-US')} Gold.`};
 }
 const gross=quantity*pricePerUnit;
 const fee=Math.ceil(gross*MARKET_PREVIEW_SELLER_FEE_RATE);
 return {quantity,pricePerUnit,gross,fee,net:gross-fee,valid:true,issue:null};
}
