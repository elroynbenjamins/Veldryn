"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateRuntimeMembers = evaluateRuntimeMembers;
exports.shouldExpireQueueTicket = shouldExpireQueueTicket;
exports.nextReadyReplacementCycle = nextReadyReplacementCycle;
const live_dungeon_policy_1 = require("./live-dungeon-policy");
const reconnect_afk_1 = require("./reconnect-afk");
function evaluateRuntimeMembers(input) {
    return input.members.map(m => {
        const presence = (0, reconnect_afk_1.classifyPresence)({ nowMs: input.nowMs, lastHeartbeatMs: m.lastHeartbeatMs, leftRun: m.leftRun });
        const afk = (0, reconnect_afk_1.classifyAfk)({ secondsSinceMeaningfulInput: Math.max(0, (input.nowMs - m.lastMeaningfulInputMs) / 1000), inCombat: true });
        const reward = (0, live_dungeon_policy_1.rewardEligibility)({ wasReady: m.wasReady, combatParticipation: m.combatParticipation, mechanicParticipation: m.mechanicParticipation, routeVotesCast: m.routeVotesCast, safetyAiSeconds: m.safetyAiSeconds, runDurationSeconds: input.runDurationSeconds, leftRun: m.leftRun, completedRun: input.completedRun });
        return { accountId: m.accountId, presence, afk, rewardEligible: reward.eligible, participationScore: reward.participationScore };
    });
}
function shouldExpireQueueTicket(input) { return input.nowMs - input.queuedAtMs >= live_dungeon_policy_1.LIVE_DUNGEON_POLICY.queueTicketTtlSeconds * 1000; }
function nextReadyReplacementCycle(current) { return Math.min(live_dungeon_policy_1.LIVE_DUNGEON_POLICY.maxReadyReplacementCycles, current + 1); }
