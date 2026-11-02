import type {EventShopOffer} from '../content/live-events';

/** A purchase-limit marker is not the same as global stock: each account has its own allowance. */
export function eventShopPurchaseStatus(offer:Pick<EventShopOffer,'limit'|'reward'>,recordedCount:number){
 const limit=Math.max(0,Math.floor(offer.limit));
 const bought=Math.max(0,Math.min(limit,Number.isFinite(recordedCount)?Math.floor(recordedCount):0));
 const remaining=Math.max(0,limit-bought);
 const complete=remaining===0;
 const permanent=!['candy','gold','companion_essence','bondstones'].includes(offer.reward.kind)&&limit===1;
 return {
  bought,remaining,complete,
  label:complete?(permanent?'✓ OWNED':'✓ LIMIT REACHED'):bought>0?`${bought} / ${limit} BOUGHT`:`${limit} AVAILABLE`,
  detail:complete?(permanent?'Permanently unlocked on your account.':`You have purchased all ${limit} allowed for this event.`):bought>0?`${bought} purchased · ${remaining} remaining`:`${remaining} purchases available`,
 };
}
