export interface IdleActivity { activityId:string; startedAtMs:number; lastClaimAtMs:number; ratePerHour:number; xpPerHour:number; maxOfflineHours:number; }
export interface IdleClaim { elapsedSec:number; resourceAmount:number; xp:number; newLastClaimAtMs:number; }
export function calculateIdleClaim(a:IdleActivity,nowMs:number):IdleClaim {
  if (![nowMs,a.startedAtMs,a.lastClaimAtMs].every(Number.isSafeInteger)
      || a.startedAtMs < 0 || a.lastClaimAtMs < a.startedAtMs || nowMs <= a.lastClaimAtMs) {
    throw new Error('invalid_claim_time');
  }
  if (![a.ratePerHour,a.xpPerHour,a.maxOfflineHours].every(Number.isFinite)
      || a.ratePerHour < 0 || a.xpPerHour < 0 || a.maxOfflineHours <= 0) {
    throw new Error('invalid_activity');
  }
  const maxSec = Math.floor(a.maxOfflineHours * 3600);
  if (!Number.isSafeInteger(maxSec) || maxSec < 1) throw new Error('invalid_activity');
  const availableSec = Math.floor((nowMs-a.lastClaimAtMs)/1000);
  const elapsedSec = Math.min(maxSec,availableSec);
  const resourceAmount = Math.floor(a.ratePerHour*elapsedSec/3600);
  const xp = Math.floor(a.xpPerHour*elapsedSec/3600);
  if (![resourceAmount,xp].every(Number.isSafeInteger)) throw new Error('invalid_reward');
  // Consume excess offline time too: the cap limits earnings, not each request.
  // Keep only the unprocessed sub-second remainder for the next claim.
  return {elapsedSec,resourceAmount,xp,newLastClaimAtMs:a.lastClaimAtMs+availableSec*1000};
}
