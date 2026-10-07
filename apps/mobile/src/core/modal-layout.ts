/** One viewport limit, rather than percentages nested inside percentages. */
export function modalAvailableHeight(height:number,top:number,bottom:number){
 return Math.max(0,height-Math.max(12,top)-Math.max(12,bottom)-16);
}
export function modalNeedsScroll(contentHeight:number,viewportHeight:number){
 return viewportHeight>0&&contentHeight>viewportHeight+1;
}
