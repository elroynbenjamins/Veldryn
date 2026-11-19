"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSharedWorldWorker = runSharedWorldWorker;
/**
 * Run once per minute from the same worker/cron infrastructure used by v17 Live-Ops.
 * Each step is idempotent and isolated: one failing step is reported in the heartbeat instead of
 * stopping unrelated crisis or boss lifecycle steps for the whole minute.
 */
async function runSharedWorldWorker(store, clock) {
    const nowMs = clock.nowMs();
    const errors = [];
    const step = async (name, run) => {
        if (!run)
            return 0;
        try {
            return await run();
        }
        catch (error) {
            errors.push({ step: name, message: error instanceof Error ? error.message : String(error) });
            return 0;
        }
    };
    const activatedCrises = await step('activateDueCrises', () => store.activateDueCrises(nowMs));
    const failedCrises = await step('failExpiredCrises', () => store.failExpiredCrises(nowMs));
    const spawnedBosses = await step('spawnUnlockedWorldBosses', () => store.spawnUnlockedWorldBosses(nowMs));
    const activatedBosses = await step('activateDueWorldBosses', () => store.activateDueWorldBosses(nowMs));
    const expiredAttempts = await step('expireStaleBossAttempts', store.expireStaleBossAttempts ? () => store.expireStaleBossAttempts(nowMs) : undefined);
    const expiredBosses = await step('expireWorldBosses', () => store.expireWorldBosses(nowMs));
    const finalizedCrises = await step('finalizeResolvedCrises', () => store.finalizeResolvedCrises(nowMs));
    const finalizedBosses = await step('finalizeWorldBosses', () => store.finalizeWorldBosses(nowMs));
    const result = { activatedCrises, failedCrises, finalizedCrises, spawnedBosses, activatedBosses, expiredAttempts, expiredBosses, finalizedBosses, errors };
    await store.heartbeat('shared_world_v19', { ...result, ok: errors.length === 0 });
    return result;
}
