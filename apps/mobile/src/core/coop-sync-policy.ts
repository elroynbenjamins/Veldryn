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
 // Echo battles are pre-calculated on the server. During their short
 // handoff, poll once per second to pick up the finalized replay promptly,
 // including when a realtime event is delayed or missed.
 if(urgency==='combat'&&mode==='qmode')return 1_000;
 if(urgency==='combat')return realtimeConnected?6_000:2_500;
 if(!realtimeConnected)return mode==='live'?4_000:6_000;
 return mode==='live'?12_000:20_000;
}
