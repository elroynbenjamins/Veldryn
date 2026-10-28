/** One-season LiveOps promotion. Shared by authoritative gameplay and co-op bundles.
 * Exact runtime ID prevents the bonus leaking into another annual run. */
export const VEILBREAK_CURRENCY_PROMOTION={
 eventId:'EVT_ANNUAL_010_2026',
 startsAtMs:Date.parse('2026-10-19T05:48:31Z'),
 endsAtMs:Date.parse('2026-11-03T00:00:00Z'),
 bonusBps:5000,
} as const;

/** From the November 2026 festival onward, common event currency is earned at
 * 75% of its authored baseline. Prestige rewards and shop prices are unchanged.
 * Older 2026 event runs retain their original economy; recurring 2027+ editions
 * use the new baseline. The active 2026 Veilbreak +50% promotion is preserved. */
export const FUTURE_EVENT_CURRENCY_ADJUSTMENT_BPS=-2500;
const FUTURE_2026_EVENT_IDS=new Set(['EVT_ANNUAL_011_2026','EVT_ANNUAL_012_2026']);
const FUTURE_ANNUAL_EVENT_ID=/^EVT_ANNUAL_\d{3}_(\d{4})$/;
export function eventCurrencyPromotionBps(eventId:string,earnedAtMs:number){
 const promotion=VEILBREAK_CURRENCY_PROMOTION;
 if(eventId===promotion.eventId&&earnedAtMs>=promotion.startsAtMs&&earnedAtMs<promotion.endsAtMs)return promotion.bonusBps;
 if(FUTURE_2026_EVENT_IDS.has(eventId))return FUTURE_EVENT_CURRENCY_ADJUSTMENT_BPS;
 const year=FUTURE_ANNUAL_EVENT_ID.exec(eventId)?.[1];
 return year&&Number(year)>=2027?FUTURE_EVENT_CURRENCY_ADJUSTMENT_BPS:0;
}
export function promotedEventCurrency(eventId:string,quantity:number,earnedAtMs:number){
 return Math.floor(Math.max(0,quantity)*(10000+eventCurrencyPromotionBps(eventId,earnedAtMs))/10000);
}
