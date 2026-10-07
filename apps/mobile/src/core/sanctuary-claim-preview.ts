/** Mirrors the complete-period caps used by the existing Sanctuary commands. */
export function sanctuaryClaimPreview(now:number,last:number|undefined,period:number,cap:number){
 const elapsed=last===undefined?0:Math.max(0,now-last);
 return {periods:Math.min(cap,Math.floor(elapsed/period)),hoursUntilNext:Math.max(1,Math.ceil((period-elapsed%period)/3600000)),initial:last===undefined};
}
