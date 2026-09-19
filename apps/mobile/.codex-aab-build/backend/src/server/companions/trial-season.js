"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPANION_TRIAL_TIMEZONE = void 0;
exports.companionTrialSeasonKey = companionTrialSeasonKey;
exports.companionTrialSeasonBounds = companionTrialSeasonBounds;
exports.companionTrialWeekKey = companionTrialWeekKey;
exports.newCompanionTrialSeasonState = newCompanionTrialSeasonState;
exports.newCompanionTrialLifetimeStats = newCompanionTrialLifetimeStats;
exports.createCompanionTrialProgress = createCompanionTrialProgress;
exports.rolloverCompanionTrialSeason = rolloverCompanionTrialSeason;
exports.companionTrialResetInfo = companionTrialResetInfo;
const content_1 = require("./content");
exports.COMPANION_TRIAL_TIMEZONE = 'UTC';
function companionTrialSeasonKey(nowMs) { const d = new Date(nowMs); if (!Number.isFinite(d.getTime()))
    throw new Error('invalid_server_time'); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; }
function companionTrialSeasonBounds(seasonKey) { const def = (0, content_1.companionTrialSeasonDefinition)(seasonKey); return { startsAt: def.startsAt, endsAt: def.endsAt }; }
function companionTrialWeekKey(nowMs) {
    const d = new Date(nowMs), day = (d.getUTCDay() + 6) % 7;
    const monday = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
    const md = new Date(monday);
    return `${md.getUTCFullYear()}-${String(md.getUTCMonth() + 1).padStart(2, '0')}-${String(md.getUTCDate()).padStart(2, '0')}`;
}
function newCompanionTrialSeasonState(seasonKey) { return { seasonKey, currentFloor: 1, checkpointFloor: 1, currentSeasonHighestFloor: 0, firstClearFloors: [], bossRewardFloors: [], specialObjectives: {}, monthlyChallengeCompletion: {}, leaderboardScore: 0, weeklyChallengeCompletion: {}, weeklyChallengeClaims: [] }; }
function newCompanionTrialLifetimeStats() { return { lifetimeHighestFloor: 0, totalTrialBossesDefeated: 0, totalTrialFloorsCleared: 0, monthlySeasonsParticipated: 1, monthlyFloor30Clears: 0, bestEverCompanionTeamPower: 0 }; }
function createCompanionTrialProgress(nowMs) { const seasonKey = companionTrialSeasonKey(nowMs); return { season: newCompanionTrialSeasonState(seasonKey), lifetime: newCompanionTrialLifetimeStats(), archive: [] }; }
function rolloverCompanionTrialSeason(progress, serverNowMs) {
    const currentKey = companionTrialSeasonKey(serverNowMs);
    if (!progress)
        return { progress: createCompanionTrialProgress(serverNowMs), rolled: true, expiredRunId: undefined };
    if (progress.season.seasonKey === currentKey)
        return { progress, rolled: false, expiredRunId: undefined };
    const prior = progress.season, expiredRunId = prior.activeRun?.runId;
    const archive = [...(progress.archive ?? []), { seasonKey: prior.seasonKey, highestFloor: prior.currentSeasonHighestFloor, floor30Cleared: prior.currentSeasonHighestFloor >= 30, leaderboardScore: prior.leaderboardScore }].slice(-36);
    const lifetime = { ...progress.lifetime, monthlySeasonsParticipated: Math.max(1, progress.lifetime.monthlySeasonsParticipated) + 1 };
    return { progress: { season: newCompanionTrialSeasonState(currentKey), lifetime, archive }, rolled: true, expiredRunId };
}
function companionTrialResetInfo(serverNowMs) { const seasonKey = companionTrialSeasonKey(serverNowMs), def = (0, content_1.companionTrialSeasonDefinition)(seasonKey), endMs = Date.parse(def.endsAt), remainingMs = Math.max(0, endMs - serverNowMs); return { seasonKey, serverNow: new Date(serverNowMs).toISOString(), startsAt: def.startsAt, endsAt: def.endsAt, remainingMs, timezone: exports.COMPANION_TRIAL_TIMEZONE, title: `Companion Trials — ${new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(serverNowMs))}`, notice: 'Trial progress resets each month. Companion progression does not.' }; }
