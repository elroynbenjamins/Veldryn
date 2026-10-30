import type {OnlineSnapshot} from './online-game-repository';

/**
 * Small memory-only cache for the signed-in player's last authoritative game
 * projection. It lets returning screens render immediately while they refresh.
 * Rewards and notices are excluded: only a fresh response may present those.
 */
const MAX_AGE_MS=2*60_000;
const entries=new Map<string,{snapshot:OnlineSnapshot;expiresAt:number}>();

function displaySnapshot(snapshot:OnlineSnapshot):OnlineSnapshot{
 const {accountId,state,version,serverNow}=snapshot;
 return {accountId,state,version,serverNow};
}

export function rememberOnlineSnapshot(snapshot:OnlineSnapshot){
 entries.delete(snapshot.accountId);
 entries.set(snapshot.accountId,{snapshot:displaySnapshot(snapshot),expiresAt:Date.now()+MAX_AGE_MS});
 while(entries.size>3)entries.delete(entries.keys().next().value!);
}

export function peekOnlineSnapshot(accountId:string){
 const entry=entries.get(accountId);
 if(!entry)return null;
 if(entry.expiresAt<=Date.now()){entries.delete(accountId);return null;}
 entries.delete(accountId);entries.set(accountId,entry);
 return entry.snapshot;
}

export function forgetOnlineSnapshot(accountId:string){entries.delete(accountId);}
