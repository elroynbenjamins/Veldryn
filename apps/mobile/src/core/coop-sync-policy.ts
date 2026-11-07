/**
 * Backup polling for dungeon views. Realtime notifications trigger immediate reads;
 * these intervals are a recovery path when notifications are dropped or unavailable.
 * Keep short decisions responsive even if a subscribed channel stops delivering updates.
 */
export type CoopSyncMode='live'|'qmode'|'event';
export type CoopSyncUrgency='decision'|'combat'|'idle';

export const COOP_CHAT_REFRESH_MS=5_000;

export function coopSyncIntervalMs(mode:CoopSyncMode,urgency:CoopSyncUrgency,realtimeConnected:boolean):number{
 if(urgency==='decision')return realtimeConnected?3_500:2_000;
 // Echo rooms now settle after a short server-owned handoff. A quicker,
 // short-lived fallback poll prevents the finished result appearing stuck
 // if the realtime notification is late or lost.
 if(urgency==='combat'&&mode==='qmode')return realtimeConnected?2_500:1_250;
 if(urgency==='combat')return realtimeConnected?6_000:2_500;
 if(!realtimeConnected)return mode==='live'?4_000:6_000;
 return mode==='live'?12_000:20_000;
}
