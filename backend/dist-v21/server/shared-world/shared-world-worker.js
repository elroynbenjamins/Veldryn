"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSharedWorldWorker = runSharedWorldWorker;
/** Run once per minute from the same worker/cron infrastructure used by v17 Live-Ops. */
async function runSharedWorldWorker(store, clock) {
    const nowMs = clock.nowMs();
    const activatedCrises = await store.activateDueCrises(nowMs);
    const failedCrises = await store.failExpiredCrises(nowMs);
    const spawnedBosses = await store.spawnUnlockedWorldBosses(nowMs);
    const activatedBosses = await store.activateDueWorldBosses(nowMs);
    const expiredBosses = await store.expireWorldBosses(nowMs);
    const finalizedCrises = await store.finalizeResolvedCrises(nowMs);
    const finalizedBosses = await store.finalizeWorldBosses(nowMs);
    const result = { activatedCrises, failedCrises, finalizedCrises, spawnedBosses, activatedBosses, expiredBosses, finalizedBosses };
    await store.heartbeat('shared_world_v19', result);
    return result;
}
