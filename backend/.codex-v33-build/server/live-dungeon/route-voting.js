"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeVoteDeadline = routeVoteDeadline;
exports.resolveRouteVote = resolveRouteVote;
const live_dungeon_policy_1 = require("./live-dungeon-policy");
function hash(text) { let h = 2166136261; for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
} return h >>> 0; }
function routeVoteDeadline(startedAtMs, seconds = live_dungeon_policy_1.LIVE_DUNGEON_POLICY.routeVoteSeconds) {
    const clamped = Math.max(live_dungeon_policy_1.LIVE_DUNGEON_POLICY.routeVoteMinSeconds, Math.min(live_dungeon_policy_1.LIVE_DUNGEON_POLICY.routeVoteMaxSeconds, seconds));
    return startedAtMs + clamped * 1000;
}
function resolveRouteVote(input) {
    const counts = {};
    for (const id of input.optionIds)
        counts[id] = 0;
    const eligible = new Set(input.eligibleAccountIds);
    const latest = new Map();
    for (const vote of input.votes) {
        if (vote.eligible && eligible.has(vote.accountId) && input.optionIds.includes(vote.optionId))
            latest.set(vote.accountId, vote);
    }
    for (const vote of latest.values())
        counts[vote.optionId] = (counts[vote.optionId] ?? 0) + 1;
    const activeCount = eligible.size;
    if (activeCount > 0 && latest.size === activeCount) {
        const unique = new Set([...latest.values()].map(v => v.optionId));
        if (unique.size === 1)
            return { resolved: true, optionId: [...unique][0], reason: 'unanimous', counts };
    }
    if (input.nowMs < input.deadlineMs)
        return { resolved: false, counts };
    const max = Math.max(0, ...Object.values(counts));
    const tied = input.optionIds.filter(id => counts[id] === max);
    if (tied.length === 1)
        return { resolved: true, optionId: tied[0], reason: 'majority', counts };
    const pick = tied.length ? tied[hash(input.seed) % tied.length] : input.optionIds[hash(input.seed) % input.optionIds.length];
    return { resolved: true, optionId: pick, reason: tied.length > 1 ? 'tie_break' : 'deadline', counts };
}
