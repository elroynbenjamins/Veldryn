/** Hidden Market V13 graph contract.
 * A price is drawn only when backed by multiple real, server-verified sales.
 * Raw buyer/seller IDs and exact Forge receipts never enter this DTO.
 */
export type MarketPriceGraphPeriodV13=7|30|90;
export interface MarketPriceGraphDayV13{
 date:string;
 medianGold:number;
 lowGold:number;
 highGold:number;
 sales:number;
 units:number;
}
export interface MarketPriceGraphSnapshotV13{
 itemId:string;
 kind:'resource'|'equipment';
 rarity:string|null;
 periodDays:MarketPriceGraphPeriodV13;
 asOfDate:string;
 minimumDailySales:3;
 hasEnoughData:boolean;
 points:MarketPriceGraphDayV13[];
}
export interface MarketPriceGraphBarV13{
 date:string;
 label:string;
 point:MarketPriceGraphDayV13|null;
}
const dateFormat=/^\d{4}-\d{2}-\d{2}$/;
function dateEpoch(date:string):number|null{
 if(!dateFormat.test(date))return null;
 const epoch=Date.parse(date+'T00:00:00.000Z');
 return Number.isFinite(epoch)&&new Date(epoch).toISOString().slice(0,10)===date?epoch:null;
}
function validPoint(point:MarketPriceGraphDayV13){
 return dateEpoch(point.date)!==null
   &&Number.isSafeInteger(point.sales)&&point.sales>=3
   &&Number.isSafeInteger(point.units)&&point.units>=point.sales
   &&[point.lowGold,point.highGold,point.medianGold].every(v=>
     Number.isSafeInteger(v)&&v>=1&&v<=1_000_000_000_000)
   &&point.lowGold<=point.medianGold&&point.medianGold<=point.highGold;
}
export function marketPriceGraphBarsV13(
 snapshot:MarketPriceGraphSnapshotV13,
):MarketPriceGraphBarV13[]{
 if(![7,30,90].includes(snapshot.periodDays)
   ||snapshot.minimumDailySales!==3
   ||!Array.isArray(snapshot.points))return [];
 const asOf=dateEpoch(snapshot.asOfDate);
 if(asOf===null)return [];
 const indexed=new Map<string,MarketPriceGraphDayV13>();
 for(const point of snapshot.points){
  if(!validPoint(point)||indexed.has(point.date))continue;
  indexed.set(point.date,point);
 }
 return Array.from({length:snapshot.periodDays},(_,index)=>{
  const date=new Date(asOf-(snapshot.periodDays-1-index)*86_400_000)
    .toISOString().slice(0,10);
  return {date,label:date.slice(5),point:indexed.get(date)??null};
 });
}
export function marketPriceGraphHasVisibleSalesV13(snapshot:MarketPriceGraphSnapshotV13){
 return marketPriceGraphBarsV13(snapshot).some(row=>row.point!==null);
}
