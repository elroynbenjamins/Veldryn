"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.crisisFinalState = crisisFinalState;
exports.finalizeWorldBossRanks = finalizeWorldBossRanks;
const world_boss_ranking_1 = require("./world-boss-ranking");
function crisisFinalState(input) {
    if (input.securedAtMs != null || input.creditedPoints >= input.targetPoints)
        return 'secured';
    if (input.nowMs >= input.endsAtMs)
        return 'failed';
    return null;
}
function finalizeWorldBossRanks(input) {
    const resolutionAt = input.defeatedAtMs ?? input.endsAtMs;
    const scoredGraceEnds = resolutionAt + 10 * 60_000;
    if (input.nowMs < resolutionAt)
        return { ready: false, reason: 'boss_unresolved', finalRanks: [] };
    if (input.inFlightScoredAttempts > 0 && input.nowMs < scoredGraceEnds)
        return { ready: false, reason: 'in_flight_attempts', finalRanks: [] };
    return { ready: true, finalRanks: (0, world_boss_ranking_1.rankWorldBossCandidates)(input.rankCandidates) };
}
