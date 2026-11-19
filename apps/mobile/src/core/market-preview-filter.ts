/**
 * Pure browsing logic for the developer-only Market design catalog.
 * Caller-supplied samples are never mutated or treated as live offers.
 * A future live market must use authenticated, server-paginated search.
 */
export type MarketPreviewCategory='Resources'|'Materials'|'Gems'|'Equipment';
export type MarketPreviewSort='unit'|'lot'|'name'|'unit-desc';
export type MarketPreviewItem={
 id:string;
 name:string;
 type:MarketPreviewCategory;
 amount:number;
 unit:number;
 requiredLevel?:number;
 rarity?:string;
 tier?:number;
 slot?:string;
 bonusPreview?:string;
};

export function filterMarketPreviewItems(
 items:readonly MarketPreviewItem[],
 category:MarketPreviewCategory|'All',
 query:string,
 sort:MarketPreviewSort,
):MarketPreviewItem[]{
 const term=query.trim().toLowerCase();
 return items.filter(item=>
  (category==='All'||item.type===category)
  &&(term===''||[item.name,item.type,item.rarity??'',item.slot??'',item.tier?'T'+item.tier:'']
   .some(field=>field.toLowerCase().includes(term)))
 ).sort((a,b)=>{
  const order=sort==='name'?a.name.localeCompare(b.name)
   :sort==='lot'?(a.unit*a.amount)-(b.unit*b.amount)
   :sort==='unit-desc'?b.unit-a.unit:a.unit-b.unit;
  return order||a.name.localeCompare(b.name)||a.id.localeCompare(b.id);
 });
}
