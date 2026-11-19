"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORLD_BOSS_V50_ORDER = exports.WORLD_BOSS_V50_ROTATION_LIVE = exports.WORLD_BOSS_V22_DAYS_PER_CYCLE = exports.WORLD_BOSS_V22_MAX_ATTEMPTS = exports.WORLD_BOSS_V22_SCHEDULE_LIVE = void 0;
exports.worldBossWindowsV22 = worldBossWindowsV22;
exports.worldBossScheduleAtV22 = worldBossScheduleAtV22;
exports.assertWorldBossAttackWindowV22 = assertWorldBossAttackWindowV22;
exports.nextWorldBossCycleV22 = nextWorldBossCycleV22;
exports.worldBossRotationForCycleV50 = worldBossRotationForCycleV50;
exports.worldBossRotationAtV50 = worldBossRotationAtV50;
exports.assertWorldBossCanonicalEventV50 = assertWorldBossCanonicalEventV50;
/**
 * World Boss V22 — immutable 14-day UTC schedule, NOT wired into live routes.
 *
 * Monday 00:00 UTC (configured launch epoch) -> five full preparation days,
 * then one CONTINUOUS 48-hour weekend raid window, Saturday 00:00 UTC
 * through Monday 00:00 UTC (exclusive). Seven-day cooldown follows.
 * Every account keeps THREE total event attempts; use any time in the weekend.
 */
exports.WORLD_BOSS_V22_SCHEDULE_LIVE = false;
exports.WORLD_BOSS_V22_MAX_ATTEMPTS = 3;
exports.WORLD_BOSS_V22_DAYS_PER_CYCLE = 14;
const DAY = 24 * 60 * 60 * 1000;
const PREPARATION = 5 * DAY;
const WEEK = 7 * DAY;
const CYCLE = 14 * DAY;
const safe = (t) => Number.isSafeInteger(t) && t >= 0;
/** Launch-epoch alignment is a server-only setting, not client-supplied. */
function worldBossWindowsV22(startUtcMs) {
    if (!safe(startUtcMs) || new Date(startUtcMs).getUTCDay() !== 1 ||
        startUtcMs % DAY !== 0 || !safe(startUtcMs + CYCLE))
        throw Error('world_boss_v22_invalid_monday_start_utc');
    return [{
            index: 0,
            day: 'weekend',
            startsAtUtcMs: startUtcMs + PREPARATION,
            endsAtUtcMs: startUtcMs + WEEK,
        }];
}
function worldBossScheduleAtV22(startUtcMs, nowUtcMs) {
    const [window] = worldBossWindowsV22(startUtcMs);
    if (!safe(nowUtcMs))
        throw Error('world_boss_v22_invalid_clock');
    const prepEnds = window.startsAtUtcMs;
    const raidEnds = window.endsAtUtcMs;
    const cycleEnds = startUtcMs + CYCLE;
    const currentWindow = nowUtcMs >= prepEnds && nowUtcMs < raidEnds ? window : undefined;
    const nextWindow = nowUtcMs < prepEnds ? window : undefined;
    const phase = nowUtcMs < startUtcMs ? 'upcoming' :
        nowUtcMs < prepEnds ? 'preparation' :
            nowUtcMs < raidEnds ? 'raid' :
                nowUtcMs < cycleEnds ? 'cooldown' : 'expired';
    return {
        phase, eventStartsAtUtcMs: startUtcMs,
        preparationEndsAtUtcMs: prepEnds, raidWeekEndsAtUtcMs: raidEnds,
        cycleEndsAtUtcMs: cycleEnds,
        ...(currentWindow ? { currentWindow } : {}),
        ...(nextWindow ? { nextWindow } : {}),
        remainingWindows: nowUtcMs < raidEnds ? 1 : 0,
    };
}
/** SQL must independently enforce this under the event row lock. */
function assertWorldBossAttackWindowV22(startUtcMs, nowUtcMs) {
    const result = worldBossScheduleAtV22(startUtcMs, nowUtcMs);
    if (result.phase !== 'raid' || !result.currentWindow)
        throw Error('world_boss_v22_attack_window_closed');
    return result.currentWindow;
}
/** Fixed UTC calendar generation; does not depend on server process timezone. */
function nextWorldBossCycleV22(startUtcMs) {
    worldBossWindowsV22(startUtcMs);
    return startUtcMs + CYCLE;
}
/**
 * V50 — pure, hidden global boss rotation contract.
 *
 * This computes one canonical boss identity per 14-day cycle from a trusted
 * launch Monday. Never accept a player-provided epoch, cycle or boss ID.
 * The eventual database must separately enforce uniqueness and non-overlap
 * under a transaction; this helper does not create, activate or pay events.
 */
exports.WORLD_BOSS_V50_ROTATION_LIVE = false;
exports.WORLD_BOSS_V50_ORDER = ['hollowroot', 'sunscar', 'frostmarch'];
/** Deterministic cycle index; zero is Hollowroot, then Solbrand, Rimewarden. */
function worldBossRotationForCycleV50(launchMondayUtcMs, index) {
    worldBossWindowsV22(launchMondayUtcMs);
    if (!Number.isSafeInteger(index) || index < 0 ||
        !safe(launchMondayUtcMs + index * CYCLE) ||
        !safe(launchMondayUtcMs + (index + 1) * CYCLE))
        throw Error('world_boss_v50_invalid_cycle_index');
    const startsAtUtcMs = launchMondayUtcMs + index * CYCLE;
    return {
        index,
        bossId: exports.WORLD_BOSS_V50_ORDER[index % exports.WORLD_BOSS_V50_ORDER.length],
        startsAtUtcMs,
        battleStartsAtUtcMs: startsAtUtcMs + PREPARATION,
        battleEndsAtUtcMs: startsAtUtcMs + WEEK,
        cycleEndsAtUtcMs: startsAtUtcMs + CYCLE,
    };
}
/** Resolve exactly one current (or prelaunch upcoming) cycle, not three bosses. */
function worldBossRotationAtV50(launchMondayUtcMs, nowUtcMs) {
    worldBossWindowsV22(launchMondayUtcMs);
    if (!safe(nowUtcMs))
        throw Error('world_boss_v50_invalid_clock');
    const index = nowUtcMs < launchMondayUtcMs ? 0 :
        Math.floor((nowUtcMs - launchMondayUtcMs) / CYCLE);
    return worldBossRotationForCycleV50(launchMondayUtcMs, index);
}
/**
 * Fail closed if a proposed authoritative event row disagrees with the
 * launch epoch's canonical identity or dates. Call only on the trusted
 * event provisioning path with values read from the database.
 */
function assertWorldBossCanonicalEventV50(launchMondayUtcMs, proposed) {
    const expected = worldBossRotationForCycleV50(launchMondayUtcMs, proposed.index);
    if (proposed.bossId !== expected.bossId ||
        proposed.startsAtUtcMs !== expected.startsAtUtcMs ||
        proposed.cycleEndsAtUtcMs !== expected.cycleEndsAtUtcMs)
        throw Error('world_boss_v50_noncanonical_event');
    return expected;
}
