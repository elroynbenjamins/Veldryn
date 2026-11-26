/**
 * Presentation-only clock for the expensive unclaimed-reward replay.
 * Keep the live HUD, settlement commands and special timed activities on their
 * original clocks. A new state object always invalidates the caller's memo.
 */
export function activityRewardPreviewClock(nowMs:number,activity?:{kind:string;lastClaimAtMs:number},classTraining=false):number{
 if(classTraining||!activity||!['combat','mining','woodcutting','fishing','herbalism','exploration'].includes(activity.kind))return nowMs;
 // Never display rewards at a future timestamp or before the latest claim
 // when the UI clock has already reached that claim.
 return Math.min(nowMs,Math.max(activity.lastClaimAtMs,Math.floor(nowMs/5000)*5000));
}
