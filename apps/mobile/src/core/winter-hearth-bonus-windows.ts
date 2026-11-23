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
