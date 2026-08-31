export interface ValidatedIdleCommit { characterId:string; idempotencyKey:string; activityId:string; elapsedSec:number; resourceItemId:string; resourceAmount:number; xp:number; }
export function validateIdleCommit(x:ValidatedIdleCommit):ValidatedIdleCommit {
  if(!x.characterId||!x.idempotencyKey||!x.activityId) throw new Error('missing_identity');
  if(!Number.isInteger(x.elapsedSec)||x.elapsedSec<0||x.elapsedSec>86400) throw new Error('invalid_elapsed');
  if(!Number.isInteger(x.resourceAmount)||x.resourceAmount<0||!Number.isInteger(x.xp)||x.xp<0) throw new Error('invalid_reward');
  return x;
}
export interface MarketReserve {side:'buy'|'sell';unitPrice:number;quantity:number;listingFeeRate:number}
export function requiredMarketReserve(x:MarketReserve){
 if(x.unitPrice<=0||!Number.isInteger(x.quantity)||x.quantity<=0) throw new Error('invalid_order');
 const gross=x.unitPrice*x.quantity; const listingFee=Math.floor(gross*x.listingFeeRate);
 return x.side==='buy'?{gold:gross+listingFee,items:0,listingFee}:{gold:listingFee,items:x.quantity,listingFee};
}
