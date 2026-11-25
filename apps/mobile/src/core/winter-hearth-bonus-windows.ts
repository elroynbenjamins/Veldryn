import {combatTimeline,type CombatCandyWindow} from './combat-timing';

/**
 * Server-only guild milestone timeline projection. No visual or gameplay
 * integration until event review; all calculations are deterministic and
 * time-scoped so offline claims cannot award pre-unlock or post-season XP.
 */
export interface WinterHearthBonusWindow {
 percent:25|50|75|100;startsAt:string;endsAt:string;
 gatheringSpeedBps:number;skillXpBps:number;combatXpBps:number;
}
export interface WinterHearthBonuses {
 gatheringSpeedBps:number;skillXpBps:number;combatXpBps:number;
}
const ZERO:Readonly<WinterHearthBonuses>=Object.freeze({
 gatheringSpeedBps:0,skillXpBps:0,combatXpBps:0,
});
const EXACT:Record<number,Readonly<WinterHearthBonuses>>={
 25:{gatheringSpeedBps:400,skillXpBps:0,combatXpBps:0},
 50:{gatheringSpeedBps:400,skillXpBps:600,combatXpBps:0},
 75:{gatheringSpeedBps:400,skillXpBps:600,combatXpBps:600},
 100:{gatheringSpeedBps:1000,skillXpBps:1000,combatXpBps:1000},
};
export function validateWinterHearthBonusWindows(value:unknown):WinterHearthBonusWindow[]{
 if(!Array.isArray(value)||value.length>4)throw new Error('Invalid Winter Hearth bonus projection.');
 const seen=new Set<number>(),out:WinterHearthBonusWindow[]=[];
 for(const item of value){
  if(!item||typeof item!=='object')throw new Error('Invalid Winter Hearth bonus window.');
  const row=item as Record<string,unknown>;
  const percent=Number(row.percent),expected=EXACT[percent];
  if(!expected||seen.has(percent)||typeof row.startsAt!=='string'
   ||typeof row.endsAt!=='string'||!Number.isFinite(Date.parse(row.startsAt))
   ||!Number.isFinite(Date.parse(row.endsAt))
   ||Date.parse(row.startsAt)<Date.parse('2026-12-03T00:00:00Z')
   ||Date.parse(row.endsAt)>Date.parse('2026-12-27T00:00:00Z')
   ||Date.parse(row.startsAt)>=Date.parse(row.endsAt)
   ||row.gatheringSpeedBps!==expected.gatheringSpeedBps
   ||row.skillXpBps!==expected.skillXpBps
   ||row.combatXpBps!==expected.combatXpBps)
    throw new Error('Untrusted Winter Hearth milestone effect.');
  seen.add(percent);
  out.push({
   percent:percent as WinterHearthBonusWindow['percent'],
   startsAt:row.startsAt,endsAt:row.endsAt,...expected,
  });
 }
 return out.sort((a,b)=>a.percent-b.percent);
}
/** Server-verified starts/ends and the highest unlocked stage at this time. */
export function winterHearthBonusesAt(windows:readonly WinterHearthBonusWindow[],atMs:number):Readonly<WinterHearthBonuses>{
 if(!Number.isFinite(atMs))return ZERO;
 let result:Readonly<WinterHearthBonuses>=ZERO,stage=0;
 for(const window of windows){
  if(atMs>=Date.parse(window.startsAt)&&atMs<Date.parse(window.endsAt)&&window.percent>stage){
   stage=window.percent;
   result=EXACT[stage]??ZERO;
  }
 }
 return result;
}
/** Compute exact eligible XP for a sequence of authoritative action timestamps.
 * This is a bonus factor only: the caller handles XP caps, rounding and the
 * immutable source action receipts; no direct XP or balance mutation occurs.
 */
export function winterHearthXpFactorForActionTimes(
 windows:readonly WinterHearthBonusWindow[],times:readonly number[],kind:'skill'|'combat'
):number{
 if(times.length===0)return 1;
 let sum=0;
 for(const at of times){
  const bonus=winterHearthBonusesAt(windows,at);
  sum+=kind==='skill'?bonus.skillXpBps:bonus.combatXpBps;
 }
 return 1+sum/(times.length*10000);
}

/**
 * Piecewise-constant gathering pace through actual milestone and candy cutoffs.
 * Progress carries between segments; no bonus is applied to time before a
 * milestone or after the seasonal end. No server action/reward mutations here.
 * This replaces the uniform-cycle preview only when trusted bonus windows exist.
 */
export function winterHearthGatheringTimeline(input:{
 startsAtMs:number;elapsedSeconds:number;progressFraction:number;
 cycleSeconds:number;candy?:CombatCandyWindow;
},windows:readonly WinterHearthBonusWindow[]){
 if(!windows.length)return combatTimeline({
  ...input,preparationEncounters:0,preparedCycleSeconds:input.cycleSeconds,
 });
 const end=input.startsAtMs+Math.max(0,input.elapsedSeconds)*1000;
 const points=[input.startsAtMs,end];
 const add=(point:number)=>{
  if(Number.isFinite(point)&&point>input.startsAtMs&&point<end)points.push(point);
 };
 for(const win of windows){add(Date.parse(win.startsAt));add(Date.parse(win.endsAt));}
 if(input.candy){add(input.candy.startsAtMs);add(input.candy.endsAtMs);}
 const boundaries=[...new Set(points)].sort((a,b)=>a-b);
 let progress=Math.max(0,Math.min(.999999999,input.progressFraction));
 const encounters:ReturnType<typeof combatTimeline>['encounters']=[];
 for(let i=0;i<boundaries.length-1;i++){
  const start=boundaries[i],stop=boundaries[i+1];
  if(stop<=start)continue;
  const bps=winterHearthBonusesAt(windows,start).gatheringSpeedBps;
  const candy=!!input.candy&&start>=input.candy.startsAtMs&&start<input.candy.endsAtMs;
  const effectiveCycle=input.cycleSeconds/(1+bps/10000)/(candy?1.1:1);
  const part=combatTimeline({
   startsAtMs:start,elapsedSeconds:(stop-start)/1000,progressFraction:progress,
   preparationEncounters:0,cycleSeconds:effectiveCycle,preparedCycleSeconds:effectiveCycle,
  });
  encounters.push(...part.encounters.map(row=>({...row,candy})));
  progress=part.nextProgressFraction;
 }
 return {encounters,nextProgressFraction:progress,segments:[]};
}
