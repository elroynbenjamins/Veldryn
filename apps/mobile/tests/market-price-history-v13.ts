import {
 marketPriceGraphBarsV13,marketPriceGraphHasVisibleSalesV13,
 type MarketPriceGraphSnapshotV13,
} from '../src/core/market-price-history-v13';
const check=(value:unknown,reason:string)=>{if(!value)throw new Error(reason);};
const original:MarketPriceGraphSnapshotV13={
 itemId:'COPPER_ORE',kind:'resource',rarity:null,
 periodDays:7,asOfDate:'2026-11-10',
 minimumDailySales:3,hasEnoughData:false,points:[],
};
const empty=marketPriceGraphBarsV13(original);
check(empty.length===7&&empty.every(day=>day.point===null),
 'No real transactions: all 7 days must remain empty, without synthetic 0 Gold values');
check(!marketPriceGraphHasVisibleSalesV13(original),
 'No completed sales must not cause graph or a fabricated median');
const sample={
 date:'2026-11-08',sales:3,units:30,lowGold:9,highGold:15,medianGold:12,
};
const graph={...original,points:[sample],hasEnoughData:true};
const shown=marketPriceGraphBarsV13(graph);
check(shown.filter(point=>point.point!==null).length===1
  &&shown.find(point=>point.date==='2026-11-08')?.point?.medianGold===12,
 'Only the settled observed trading date may have a bar');
check(shown.find(point=>point.date==='2026-11-09')?.point===null,
 'Missing days must not be interpolated or set to zero');
check(marketPriceGraphBarsV13({...graph,periodDays:30}).length===30,
 'Thirty-day history must have real UTC daily buckets');
check(marketPriceGraphBarsV13({...graph,periodDays:90}).length===90,
 'Ninety-day history must have real UTC daily buckets');
check(!marketPriceGraphHasVisibleSalesV13({...graph,points:[{...sample,sales:1}]}),
 'A single trader/sale may not establish a public price history point');
check(!marketPriceGraphHasVisibleSalesV13({...graph,points:[{...sample,medianGold:999}]}),
 'An invalid daily median outside the observed range is rejected');
check(!marketPriceGraphHasVisibleSalesV13({...graph,points:[{...sample,date:'2026-11-31'}]}),
 'Impossible calendar dates are rejected');
check(!marketPriceGraphHasVisibleSalesV13({...graph,points:[{...sample,date:'2026-11-11'}]}),
 'Future prices cannot be shown inside a prior as-of window');
check(marketPriceGraphBarsV13({...graph,points:[sample,sample]}).filter(x=>x.point).length===1,
 'Duplicate bucket dates may not inflate a trend');
console.log('PASS: Market history remains empty without real completed sales, preserving UTC gaps and 7/30/90-day windows');
