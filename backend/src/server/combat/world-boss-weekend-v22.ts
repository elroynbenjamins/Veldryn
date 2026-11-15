/**
 * World Boss V22 — immutable 14-day UTC schedule, NOT wired into live routes.
 *
 * Monday 00:00 UTC (configured launch epoch) -> five full preparation days,
 * then six weekend 30-minute raid windows 8 hours apart. Seven-day cooldown.
 * Every account keeps THREE attempts total for the event, not per window.
 * All three can be used in one session, sequentially.
 */
export const WORLD_BOSS_V22_SCHEDULE_LIVE=false as const;
export const WORLD_BOSS_V22_MAX_ATTEMPTS=3 as const;
export const WORLD_BOSS_V22_DAYS_PER_CYCLE=14 as const;
const HOUR=60*60*1000, DAY=24*HOUR;
const PREPARATION=5*DAY;
const WEEK=7*DAY;
const CYCLE=14*DAY;
const WINDOW_INTERVAL=8*HOUR;
const WINDOW_DURATION=30*60*1000;
const WINDOW_COUNT=6;
const safe=(t:number)=>Number.isSafeInteger(t)&&t>=0;

export type WorldBossWeekendPhaseV22=
 'upcoming'|'preparation'|'raid'|'between_windows'|'cooldown'|'expired';

export interface WorldBossRaidWindowV22 {
 index:number;day:'saturday'|'sunday';
 startsAtUtcMs:number;endsAtUtcMs:number;
}
export interface WorldBossScheduleStatusV22 {
 phase:WorldBossWeekendPhaseV22;
 eventStartsAtUtcMs:number;
 preparationEndsAtUtcMs:number;
 raidWeekEndsAtUtcMs:number;
 cycleEndsAtUtcMs:number;
 currentWindow?:WorldBossRaidWindowV22;
 nextWindow?:WorldBossRaidWindowV22;
 remainingWindows:number;
}

/** Launch-epoch alignment is a server-only setting, not client-supplied. */
export function worldBossWindowsV22(startUtcMs:number):readonly WorldBossRaidWindowV22[]{
 if(!safe(startUtcMs)||new Date(startUtcMs).getUTCDay()!==1||
  startUtcMs%DAY!==0||!safe(startUtcMs+CYCLE))
  throw Error('world_boss_v22_invalid_monday_start_utc');
 return Array.from({length:WINDOW_COUNT},(_,index)=>{
  const startsAtUtcMs=startUtcMs+PREPARATION+index*WINDOW_INTERVAL;
  return {
   index,
   day:index<3?'saturday':'sunday',
   startsAtUtcMs,
   endsAtUtcMs:startsAtUtcMs+WINDOW_DURATION,
  };
 });
}
export function worldBossScheduleAtV22(
 startUtcMs:number,nowUtcMs:number,
):WorldBossScheduleStatusV22{
 const windows=worldBossWindowsV22(startUtcMs);
 if(!safe(nowUtcMs))throw Error('world_boss_v22_invalid_clock');
 const prepEnds=startUtcMs+PREPARATION;
 const raidEnds=startUtcMs+WEEK;
 const cycleEnds=startUtcMs+CYCLE;
 const currentWindow=windows.find(w=>nowUtcMs>=w.startsAtUtcMs&&nowUtcMs<w.endsAtUtcMs);
 const nextWindow=windows.find(w=>w.startsAtUtcMs>nowUtcMs);
 const phase:WorldBossWeekendPhaseV22=
  nowUtcMs<startUtcMs?'upcoming':
  nowUtcMs<prepEnds?'preparation':
  currentWindow?'raid':
  nowUtcMs<raidEnds?'between_windows':
  nowUtcMs<cycleEnds?'cooldown':'expired';
 return {
  phase,eventStartsAtUtcMs:startUtcMs,
  preparationEndsAtUtcMs:prepEnds,raidWeekEndsAtUtcMs:raidEnds,
  cycleEndsAtUtcMs:cycleEnds,
  ...(currentWindow?{currentWindow}:{}),
  ...(nextWindow?{nextWindow}:{}),
  remainingWindows:windows.filter(w=>w.endsAtUtcMs>nowUtcMs).length,
 };
}
/** SQL must independently enforce this under the event row lock. */
export function assertWorldBossAttackWindowV22(startUtcMs:number,nowUtcMs:number){
 const result=worldBossScheduleAtV22(startUtcMs,nowUtcMs);
 if(result.phase!=='raid'||!result.currentWindow)
  throw Error('world_boss_v22_attack_window_closed');
 return result.currentWindow;
}
/** Fixed UTC calendar generation; does not depend on server process timezone. */
export function nextWorldBossCycleV22(startUtcMs:number){
 worldBossWindowsV22(startUtcMs);
 return startUtcMs+CYCLE;
}
