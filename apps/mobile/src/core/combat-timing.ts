export interface CombatCandyWindow{startsAtMs:number;endsAtMs:number;}
/** Advance normalized encounter progress through timed speed changes. Preparation
 * charges expire at completed encounters, never at a claim boundary. */
export function combatTimeline(input:{startsAtMs:number;elapsedSeconds:number;progressFraction:number;preparationEncounters:number;cycleSeconds:number;preparedCycleSeconds:number;candy?:CombatCandyWindow}){
 const end=input.startsAtMs+Math.max(0,input.elapsedSeconds)*1000;
 let at=input.startsAtMs,progress=Math.max(0,Math.min(.999999999,input.progressFraction)),remaining=Math.max(0,Math.floor(input.preparationEncounters));
 const encounters:Array<{atMs:number;prepared:boolean;candy:boolean;cycleSeconds:number}>=[];
 while(at<end){
  const prepared=remaining>0,candy=!!input.candy&&at>=input.candy.startsAtMs&&at<input.candy.endsAtMs;
  const cycleSeconds=(prepared?input.preparedCycleSeconds:input.cycleSeconds)/(candy?1.1:1);
  if(!Number.isFinite(cycleSeconds)||cycleSeconds<=0)throw new Error('Invalid combat cycle');
  const boundary=Math.min(end,...(input.candy?[input.candy.startsAtMs,input.candy.endsAtMs].filter(t=>t>at):[]));
  const needed=(1-progress)*cycleSeconds*1000,available=boundary-at;
  if(needed<=available+1e-6){
   at=Math.min(boundary,at+needed);progress=0;
   encounters.push({atMs:at,prepared,candy,cycleSeconds});if(prepared)remaining--;
  }else{progress+=available/(cycleSeconds*1000);at=boundary;}
 }
 return {encounters,nextProgressFraction:progress};
}
