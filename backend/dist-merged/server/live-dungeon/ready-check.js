"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveReadyCheck = resolveReadyCheck;
exports.readyDeadline = readyDeadline;
const live_dungeon_policy_1 = require("./live-dungeon-policy");
function resolveReadyCheck(input) {
    const ready = input.members.filter(x => x.response === 'ready').map(x => x.accountId);
    const declined = input.members.filter(x => x.response === 'declined').map(x => x.accountId);
    const expired = input.nowMs >= input.deadlineMs;
    if (!expired && !declined.length && ready.length < input.members.length)
        return { state: 'waiting', notReadyAccountIds: [], readyAccountIds: ready };
    const notReady = input.members.filter(x => x.response !== 'ready').map(x => x.accountId);
    if (!notReady.length)
        return { state: 'launch', notReadyAccountIds: [], readyAccountIds: ready };
    if (input.replacementCycle >= live_dungeon_policy_1.LIVE_DUNGEON_POLICY.maxReadyReplacementCycles)
        return { state: 'cancel', notReadyAccountIds: notReady, readyAccountIds: ready };
    return { state: 'replace', notReadyAccountIds: notReady, readyAccountIds: ready };
}
function readyDeadline(startedAtMs) { return startedAtMs + live_dungeon_policy_1.LIVE_DUNGEON_POLICY.readyCheckSeconds * 1000; }
