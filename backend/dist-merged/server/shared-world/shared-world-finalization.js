"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORLD_BOSS_IN_FLIGHT_GRACE_MS = void 0;
exports.crisisFinalState = crisisFinalState;
exports.finalizeWorldBossRanks = finalizeWorldBossRanks;
const regional_crises_1 = require("./regional-crises");
const world_bosses_1 = require("./world-bosses");
const world_boss_ranking_1 = require("./world-boss-ranking");
/** In-flight scored attempts reserved before resolution may still settle for this long afterwards. */
exports.WORLD_BOSS_IN_FLIGHT_GRACE_MS = 10 * 60_000;
/**
 * Mixed-focus crises must also meet their per-category share, so the final state uses the same evaluation
 * as live progress instead of a bare point comparison. A recorded securedAtMs is authoritative.
 */
function crisisFinalState(input) {
    if (input.securedAtMs != null)
        return 'secured';
    const evaluation = (0, regional_crises_1.evaluateRegionalCrisis)(input.definition, { targetPoints: input.targetPoints, creditedPoints: input.creditedPoints, combatPoints: input.combatPoints ?? 0, skillingPoints: input.skillingPoints ?? 0 });
    if (evaluation.secured)
        return 'secured';
    if (input.nowMs >= input.endsAtMs)
        return 'failed';
    return null;
}
/**
 * A defeated boss stays open for its post-defeat Echo window, so finalizing at the moment of defeat would
 * silently close Echo for late players. Finalization waits for the window and any in-flight attempts.
 */
function finalizeWorldBossRanks(input) {
    const resolutionAt = input.defeatedAtMs ?? input.endsAtMs;
    if (input.nowMs < resolutionAt)
        return { ready: false, reason: 'boss_unresolved', finalRanks: [] };
    if (input.inFlightScoredAttempts > 0 && input.nowMs < resolutionAt + exports.WORLD_BOSS_IN_FLIGHT_GRACE_MS)
        return { ready: false, reason: 'in_flight_attempts', finalRanks: [] };
    if (input.defeatedAtMs != null) {
        const echoEndsAt = (0, world_bosses_1.worldBossEchoWindowEndsAtMs)(input.definition, input.defeatedAtMs, input.endsAtMs);
        if (input.nowMs < echoEndsAt)
            return { ready: false, reason: 'echo_window_open', finalRanks: [] };
        if ((input.inFlightEchoAttempts ?? 0) > 0 && input.nowMs < echoEndsAt + exports.WORLD_BOSS_IN_FLIGHT_GRACE_MS)
            return { ready: false, reason: 'in_flight_attempts', finalRanks: [] };
    }
    return { ready: true, finalRanks: (0, world_boss_ranking_1.rankWorldBossCandidates)(input.rankCandidates) };
}
