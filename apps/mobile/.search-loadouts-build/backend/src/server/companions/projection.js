"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectCompanionTrial = projectCompanionTrial;
exports.projectCompanionAssignments = projectCompanionAssignments;
exports.projectCompanionProvingGrounds = projectCompanionProvingGrounds;
exports.projectCompanionCodex = projectCompanionCodex;
const proving_grounds_1 = require("./proving-grounds");
const trial_season_1 = require("./trial-season");
const assignments_1 = require("./assignments");
const codex_1 = require("./codex");
function projectCompanionTrial(progress, serverNowMs, teamPower) {
    const rolled = (0, trial_season_1.rolloverCompanionTrialSeason)(progress, serverNowMs), info = (0, trial_season_1.companionTrialResetInfo)(serverNowMs), season = rolled.progress.season;
    return { progress: rolled.progress, expiredRunId: rolled.expiredRunId, projection: { seasonKey: season.seasonKey, title: info.title, serverNow: info.serverNow, startsAt: info.startsAt, endsAt: info.endsAt, timezone: 'UTC', remainingMs: info.remainingMs, notice: info.notice, currentFloor: season.currentFloor, checkpointFloor: season.checkpointFloor, currentSeasonHighestFloor: season.currentSeasonHighestFloor, lifetimeHighestFloor: rolled.progress.lifetime.lifetimeHighestFloor, activeRunId: season.activeRun?.runId, teamPower } };
}
function projectCompanionAssignments(assignments, serverNowMs) { return (0, assignments_1.rolloverCompanionAssignmentStatuses)(assignments, serverNowMs).map(a => ({ assignmentId: a.assignmentId, missionId: a.missionId, companionIds: [...a.companionIds], startedAt: a.startedAt, endsAt: a.endsAt, status: a.status, performanceGrade: a.performanceGrade })); }
function projectCompanionProvingGrounds(state, serverNowMs) { const rolled = (0, proving_grounds_1.rolloverCompanionProvingGroundState)(state, serverNowMs), active = (0, proving_grounds_1.activeCompanionProvingGroundChallenges)(serverNowMs); return { state: rolled.state, projection: { weekKey: rolled.state.weekKey, serverNow: new Date(serverNowMs).toISOString(), challengeIds: active.definitions.map(x => x.id), progress: { ...rolled.state.progress }, completedIds: [...rolled.state.completedIds], claimedIds: [...rolled.state.claimedIds] } }; }
function projectCompanionCodex(owned, profile) { const clean = (0, codex_1.sanitizeCompanionShowcase)(profile, owned); return { profile: clean, summary: (0, codex_1.companionCodexSummary)(owned), entries: (0, codex_1.companionCodexDefinitions)().map(id => (0, codex_1.companionCodexEntryV2)(owned[id], id, clean)), milestones: (0, codex_1.availableCompanionCodexMilestones)(owned, clean).map(x => ({ id: x.definition.id, name: x.definition.name, complete: x.complete, claimed: x.claimed })), favoriteCompanionId: clean.favoriteCompanionId, showcaseCompanionIds: [...clean.showcaseCompanionIds], showcaseSlotsUnlocked: clean.showcaseSlotsUnlocked ?? 1 }; }
