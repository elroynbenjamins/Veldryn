"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runObservedLiveOpsWorkerTick = runObservedLiveOpsWorkerTick;
const liveops_worker_1 = require("../liveops/liveops-worker");
/**
 * Wire the server's existing once-per-minute v17 worker/cron entrypoint through this wrapper.
 * Do NOT call this from the admin browser. The game server/cron remains authoritative.
 */
async function runObservedLiveOpsWorkerTick(deps, health, nowMs = Date.now()) {
    const component = 'party_liveops_worker';
    const startedAtMs = nowMs;
    await health.markStarted(component, startedAtMs);
    try {
        const result = await (0, liveops_worker_1.runLiveOpsWorkerTick)(deps, nowMs);
        await health.markSucceeded(component, { startedAtMs, completedAtMs: Date.now(), result });
        return result;
    }
    catch (error) {
        await health.markFailed(component, {
            startedAtMs,
            completedAtMs: Date.now(),
            error: error instanceof Error ? error.message.slice(0, 2000) : String(error).slice(0, 2000),
        });
        throw error;
    }
}
