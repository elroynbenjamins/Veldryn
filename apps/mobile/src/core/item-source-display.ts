/** Presentation-only ordering for Quick Inspect. Never removes item sources,
 * bypasses unlock checks, invents drop rates, or changes navigation.
 * Keep source author order among equally accessible options.
 */
export type ItemDisplayAvailability='ready'|'travel'|'locked'|'info';
export type InspectDisplaySource={
 kind:string;
 availability?:{status:ItemDisplayAvailability;canNavigate?:boolean};
};
export type InspectDisplayRecipe={
 availability:{status:ItemDisplayAvailability};
 level:number;
 name:string;
};

function sourcePriority(source:InspectDisplaySource){
 if(source.kind==='starting')return 0;
 if(source.availability?.canNavigate===false)return 4;
 switch(source.availability?.status){
  case 'ready':return 0;
  case 'travel':return 1;
  case 'locked':return 3;
  case 'info':return 4;
  default:return 2;
 }
}
function recipePriority(recipe:InspectDisplayRecipe){
 switch(recipe.availability.status){
  case 'ready':return 0;
  case 'travel':return 1;
  case 'locked':return 2;
  case 'info':return 3;
 }
}
/** Stable copy; never mutates the canonical source array. */
export function prioritizeItemSources<T extends InspectDisplaySource>(sources:readonly T[]):T[]{
 return sources.map((source,index)=>({source,index}))
  .sort((a,b)=>sourcePriority(a.source)-sourcePriority(b.source)||a.index-b.index)
  .map(row=>row.source);
}
/** Present available recipes first, then lower-level unlocks. */
export function prioritizeItemUses<T extends InspectDisplayRecipe>(recipes:readonly T[]):T[]{
 return recipes.map((recipe,index)=>({recipe,index}))
  .sort((a,b)=>recipePriority(a.recipe)-recipePriority(b.recipe)
    ||a.recipe.level-b.recipe.level||a.index-b.index)
  .map(row=>row.recipe);
}
