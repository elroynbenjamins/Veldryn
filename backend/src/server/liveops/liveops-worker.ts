import { eventPhase } from './scheduler';
import type { ScheduledPartyEvent } from './event-definitions';
import { finalizePartyEvent, type PartyEventFinalizationRepository } from './party-event-finalization';
import { processSocialContributionOutboxBatch, type ContributionOutboxRepository } from './contribution-outbox';
import type { SocialContributionRouterDependencies } from './social-contribution-router';

export type StoredLifecycleStatus = 'scheduled' | 'active' | 'settling';
export interface StoredLifecycleEvent extends ScheduledPartyEvent { storedStatus: StoredLifecycleStatus; }
export interface LiveOpsLifecycleRepository {
  listNonFinalizedPartyEvents(): Promise<StoredLifecycleEvent[]>;
  setEventStatus(eventInstanceId: string, status: StoredLifecycleStatus): Promise<void>;
}
export interface LiveOpsWorkerDependencies {
  lifecycle: LiveOpsLifecycleRepository;
  finalization: PartyEventFinalizationRepository;
  outbox: ContributionOutboxRepository;
  router: SocialContributionRouterDependencies;
}

/** Intended for the existing server cron/worker runner (recommended about once per minute). */
export async function runLiveOpsWorkerTick(
  deps: LiveOpsWorkerDependencies,
  nowMs = Date.now(),
): Promise<{ activated: number; settling: number; finalized: number; outboxProcessed: number; outboxRetried: number; outboxDeadLettered: number }> {
  const outbox = await processSocialContributionOutboxBatch(deps.outbox, deps.router, 200);
  let activated = 0, settling = 0, finalized = 0;
  for (const event of await deps.lifecycle.listNonFinalizedPartyEvents()) {
    const phase = eventPhase(event, nowMs);
    if (phase === 'active' && event.storedStatus !== 'active') {
      await deps.lifecycle.setEventStatus(event.instanceId, 'active');
      activated++;
    } else if (phase === 'settling' && event.storedStatus !== 'settling') {
      await deps.lifecycle.setEventStatus(event.instanceId, 'settling');
      settling++;
    } else if (phase === 'finalizable') {
      const result = await finalizePartyEvent(deps.finalization, event.instanceId, nowMs);
      if (result.finalized) finalized++;
    }
  }
  return { activated, settling, finalized, outboxProcessed: outbox.processed, outboxRetried: outbox.retried, outboxDeadLettered: outbox.deadLettered };
}
