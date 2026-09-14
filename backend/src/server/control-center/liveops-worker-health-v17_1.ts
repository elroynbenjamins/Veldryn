import { runLiveOpsWorkerTick, type LiveOpsWorkerDependencies } from '../liveops/liveops-worker';

export interface LiveOpsWorkerHealthRepository {
  markStarted(component: string, startedAtMs: number): Promise<void>;
  markSucceeded(component: string, input: { startedAtMs: number; completedAtMs: number; result: unknown }): Promise<void>;
  markFailed(component: string, input: { startedAtMs: number; completedAtMs: number; error: string }): Promise<void>;
}

/**
 * Wire the server's existing once-per-minute v17 worker/cron entrypoint through this wrapper.
 * Do NOT call this from the admin browser. The game server/cron remains authoritative.
 */
export async function runObservedLiveOpsWorkerTick(
  deps: LiveOpsWorkerDependencies,
  health: LiveOpsWorkerHealthRepository,
  nowMs = Date.now(),
) {
  const component = 'party_liveops_worker';
  const startedAtMs = nowMs;
  await health.markStarted(component, startedAtMs);
  try {
    const result = await runLiveOpsWorkerTick(deps, nowMs);
    await health.markSucceeded(component, { startedAtMs, completedAtMs: Date.now(), result });
    return result;
  } catch (error) {
    await health.markFailed(component, {
      startedAtMs,
      completedAtMs: Date.now(),
      error: error instanceof Error ? error.message.slice(0, 2000) : String(error).slice(0, 2000),
    });
    throw error;
  }
}
