/** One-season LiveOps promotion. Shared by authoritative gameplay and co-op bundles.
 * Exact runtime ID prevents the bonus leaking into another annual run. */
export const VEILBREAK_CURRENCY_PROMOTION={
 eventId:'EVT_ANNUAL_010_2026',
 startsAtMs:Date.parse('2026-10-19T05:48:31Z'),
 endsAtMs:Date.parse('2026-11-03T00:00:00Z'),
 bonusBps:5000,
} as const;

export function eventCurrencyPromotionBps(eventId:string,earnedAtMs:number){
 const promotion=VEILBREAK_CURRENCY_PROMOTION;
 return eventId===promotion.eventId&&earnedAtMs>=promotion.startsAtMs&&earnedAtMs<promotion.endsAtMs?promotion.bonusBps:0;
}
export function promotedEventCurrency(eventId:string,quantity:number,earnedAtMs:number){
 return Math.floor(Math.max(0,quantity)*(10000+eventCurrencyPromotionBps(eventId,earnedAtMs))/10000);
}
