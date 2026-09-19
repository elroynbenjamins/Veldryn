export interface ValidatedIdleCommit { characterId:string; idempotencyKey:string; activityId:string; elapsedSec:number; resourceItemId:string; resourceAmount:number; xp:number; }
export function validateIdleCommit(x:ValidatedIdleCommit):ValidatedIdleCommit {
  if(!x.characterId||!x.idempotencyKey||!x.activityId) throw new Error('missing_identity');
  if(!Number.isInteger(x.elapsedSec)||x.elapsedSec<0||x.elapsedSec>86400) throw new Error('invalid_elapsed');
  if(!Number.isInteger(x.resourceAmount)||x.resourceAmount<0||!Number.isInteger(x.xp)||x.xp<0) throw new Error('invalid_reward');
  return x;
}
