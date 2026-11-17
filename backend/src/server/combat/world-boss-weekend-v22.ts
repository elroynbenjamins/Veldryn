/**
 * World Boss V22 — immutable 14-day UTC schedule, NOT wired into live routes.
 *
 * Monday 00:00 UTC (configured launch epoch) -> five full preparation days,
 * then one CONTINUOUS 48-hour weekend raid window, Saturday 00:00 UTC
 * through Monday 00:00 UTC (exclusive). Seven-day cooldown follows.
 * Every account keeps THREE total event attempts; use any time in the weekend.
 */
export const WORLD_BOSS_V22_SCHEDULE_LIVE=false as const;
export const WORLD_BOSS_V22_MAX_ATTEMPTS=3 as const;
export const WORLD_BOSS_V22_DAYS_PER_CYCLE=14 as const;
const DAY=24*60*60*1000;
const PREPARATION=5*DAY;
const WEEK=7*DAY;
const CYCLE=14*DAY;
const safe=(t:number)=>Number.isSafeInteger(t)&&t>=0;

export type WorldBossWeekendPhaseV22=
 'upcoming'|'preparation'|'raid'|'cooldown'|'expired';

export interface WorldBossRaidWindowV22 {
 index:number;day:'weekend';
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
 return [{
  index:0,
  day:'weekend',
  startsAtUtcMs:startUtcMs+PREPARATION,
  endsAtUtcMs:startUtcMs+WEEK,
 }];
}
export function worldBossScheduleAtV22(
 startUtcMs:number,nowUtcMs:number,
):WorldBossScheduleStatusV22{
 const [window]=worldBossWindowsV22(startUtcMs);
 if(!safe(nowUtcMs))throw Error('world_boss_v22_invalid_clock');
 const prepEnds=window.startsAtUtcMs;
 const raidEnds=window.endsAtUtcMs;
 const cycleEnds=startUtcMs+CYCLE;
 const currentWindow=nowUtcMs>=prepEnds&&nowUtcMs<raidEnds?window:undefined;
 const nextWindow=nowUtcMs<prepEnds?window:undefined;
 const phase:WorldBossWeekendPhaseV22=
  nowUtcMs<startUtcMs?'upcoming':
  nowUtcMs<prepEnds?'preparation':
  nowUtcMs<raidEnds?'raid':
  nowUtcMs<cycleEnds?'cooldown':'expired';
 return {
  phase,eventStartsAtUtcMs:startUtcMs,
  preparationEndsAtUtcMs:prepEnds,raidWeekEndsAtUtcMs:raidEnds,
  cycleEndsAtUtcMs:cycleEnds,
  ...(currentWindow?{currentWindow}:{}),
  ...(nextWindow?{nextWindow}:{}),
  remainingWindows:nowUtcMs<raidEnds?1:0,
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
