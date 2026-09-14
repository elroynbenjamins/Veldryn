/** Invalid or unavailable totals render an empty bar, never a NaN width. */
export function statBarValue(current:number,max:number){
  const total=Number.isFinite(max)?Math.max(0,max):0;
  const value=Number.isFinite(current)?Math.max(0,current):0;
  return {value,total,progress:total>0?Math.min(1,value/total):0};
}
