export interface CombatCandyWindow{startsAtMs:number;endsAtMs:number;}
export interface CombatTimelineSegment{
  startsAtMs:number;
  endsAtMs:number;
  fromFraction:number;
  toFraction:number;
  prepared:boolean;
  candy:boolean;
  cycleSeconds:number;
  encounterIndex:number;
}
/** Advance normalized encounter progress through timed speed changes. Preparation
 * charges expire at completed encounters, never at a claim boundary.
 * Optional segments let combat settle individual attacks even inside an unfinished kill. */
export function combatTimeline(input:{startsAtMs:number;elapsedSeconds:number;progressFraction:number;preparationEncounters:number;cycleSeconds:number;preparedCycleSeconds:number;candy?:CombatCandyWindow;trackSegments?:boolean;cycleSecondsForEncounter?:(encounterIndex:number,prepared:boolean)=>number}){
 const end=input.startsAtMs+Math.max(0,input.elapsedSeconds)*1000;
 let at=input.startsAtMs,progress=Math.max(0,Math.min(.999999999,input.progressFraction)),remaining=Math.max(0,Math.floor(input.preparationEncounters));
 const encounters:Array<{atMs:number;prepared:boolean;candy:boolean;cycleSeconds:number}>=[];
 const segments:CombatTimelineSegment[]=[];
 while(at<end){
  const prepared=remaining>0,candy=!!input.candy&&at>=input.candy.startsAtMs&&at<input.candy.endsAtMs;
  const authoredSeconds=input.cycleSecondsForEncounter?.(encounters.length,prepared)??(prepared?input.preparedCycleSeconds:input.cycleSeconds);
  const cycleSeconds=authoredSeconds/(candy?1.1:1);
  if(!Number.isFinite(cycleSeconds)||cycleSeconds<=0)throw new Error('Invalid combat cycle');
  const boundary=Math.min(end,...(input.candy?[input.candy.startsAtMs,input.candy.endsAtMs].filter(t=>t>at):[]));
  const fromFraction=progress,startsAtMs=at;
  const needed=(1-progress)*cycleSeconds*1000,available=boundary-at;
  if(needed<=available+1e-6){
   at=Math.min(boundary,at+needed);progress=0;
   if(input.trackSegments)segments.push({startsAtMs,endsAtMs:at,fromFraction,toFraction:1,prepared,candy,cycleSeconds,encounterIndex:encounters.length});
   encounters.push({atMs:at,prepared,candy,cycleSeconds});if(prepared)remaining--;
  }else{
   progress+=available/(cycleSeconds*1000);at=boundary;
   if(input.trackSegments)segments.push({startsAtMs,endsAtMs:at,fromFraction,toFraction:progress,prepared,candy,cycleSeconds,encounterIndex:encounters.length});
  }
 }
 return {encounters,nextProgressFraction:progress,segments};
}
