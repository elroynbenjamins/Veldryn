/** Display policy only. The authoritative event service still settles every grant.
 * No module-global mutation and no visibility based solely on a local calendar. */
export const FROSTFALL_2026_EVENT_ID='EVT_ANNUAL_012_2026';
export interface FrostfallRuntimeWindow{eventId:string;enabled:boolean;startsAtMs:number;endsAtMs:number;graceEndsAtMs?:number}
export interface FrostfallVisibilityAccount{liveEvent?:FrostfallRuntimeWindow;unlockedCombatCompanionIds?:readonly string[];unlockedCosmeticPetIds?:readonly string[]}
export function frostfallRewardsDiscoverable(account:FrostfallVisibilityAccount,nowMs:number):boolean{
 const event=account.liveEvent;
 if(!event?.enabled||event.eventId!==FROSTFALL_2026_EVENT_ID||!Number.isFinite(nowMs))return false;
 const {startsAtMs,endsAtMs}=event,grace=event.graceEndsAtMs??endsAtMs+2*86400_000;
 return Number.isFinite(startsAtMs)&&Number.isFinite(endsAtMs)&&Number.isFinite(grace)&&startsAtMs<endsAtMs&&endsAtMs<=grace&&nowMs>=startsAtMs&&nowMs<grace;
}
export function frostfallRewardVisible(account:FrostfallVisibilityAccount,id:string,kind:'companion'|'pet',nowMs:number):boolean{
 const owned=kind==='companion'?account.unlockedCombatCompanionIds:account.unlockedCosmeticPetIds;
 return !!owned?.includes(id)||frostfallRewardsDiscoverable(account,nowMs);
}
