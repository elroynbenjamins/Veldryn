/** In-memory screen history. Keep view context with the route, not just a tab label. */
export type ScreenHistoryEntry<Route extends string,Context>={route:Route;context:Context};

export function rememberScreen<Route extends string,Context>(
 history:readonly ScreenHistoryEntry<Route,Context>[],
 current:ScreenHistoryEntry<Route,Context>,
 destination:Route,
 limit=24,
):ScreenHistoryEntry<Route,Context>[] {
 if(destination===current.route)return [...history];
 return [...history,current].slice(-Math.max(1,limit));
}

/** Skip now-inaccessible destinations (for example, a feature locked after character switching). */
export function returnToPreviousScreen<Route extends string,Context>(
 history:readonly ScreenHistoryEntry<Route,Context>[],
 currentRoute:Route,
 canOpen:(route:Route)=>boolean=()=>true,
):{previous?:ScreenHistoryEntry<Route,Context>;remaining:ScreenHistoryEntry<Route,Context>[]} {
 for(let i=history.length-1;i>=0;i--){
  const entry=history[i];
  if(entry.route!==currentRoute&&canOpen(entry.route))return {previous:entry,remaining:history.slice(0,i)};
 }
 return {remaining:[]};
}
