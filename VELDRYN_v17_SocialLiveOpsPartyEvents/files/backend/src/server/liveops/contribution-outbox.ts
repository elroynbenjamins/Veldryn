import type { SocialContributionEnvelope, SocialContributionRoutingResult, SocialContributionRouterDependencies } from './social-contribution-router';
import { routeSocialContribution } from './social-contribution-router';

export type ContributionOutboxStatus = 'pending' | 'processing' | 'processed' | 'dead_letter';
export interface ContributionOutboxRecord {
  id: string;
  sourceEventId: string;
  envelope: SocialContributionEnvelope;
  attempts: number;
  status: ContributionOutboxStatus;
}

export interface ContributionOutboxRepository {
  /** Must be inserted in the same DB transaction as the authoritative gameplay/economy settlement. */
  enqueue(envelope: SocialContributionEnvelope): Promise<'inserted' | 'duplicate'>;
  claimBatch(limit: number): Promise<ContributionOutboxRecord[]>;
  markProcessed(id: string, result: SocialContributionRoutingResult): Promise<void>;
  markRetry(id: string, attempts: number, error: string): Promise<void>;
  markDeadLetter(id: string, attempts: number, error: string): Promise<void>;
}

export const SOCIAL_CONTRIBUTION_OUTBOX_MAX_ATTEMPTS = 12;

export async function enqueueSocialContribution(
  repo: ContributionOutboxRepository,
  envelope: SocialContributionEnvelope,
): Promise<'inserted' | 'duplicate'> {
  if (envelope.event.sourceEventId.trim().length === 0) throw new Error('source_event_id_required');
  return repo.enqueue(envelope);
}

export async function processSocialContributionOutboxBatch(
  repo: ContributionOutboxRepository,
  router: SocialContributionRouterDependencies,
  limit = 100,
): Promise<{ processed: number; retried: number; deadLettered: number }> {
  const records = await repo.claimBatch(Math.max(1, Math.min(500, Math.floor(limit))));
  let processed = 0, retried = 0, deadLettered = 0;
  for (const record of records) {
    try {
      const result = await routeSocialContribution(router, record.envelope);
      await repo.markProcessed(record.id, result);
      processed++;
    } catch (error) {
      const attempts = record.attempts + 1;
      const message = error instanceof Error ? error.message.slice(0, 500) : 'unknown_outbox_error';
      if (attempts >= SOCIAL_CONTRIBUTION_OUTBOX_MAX_ATTEMPTS) {
        await repo.markDeadLetter(record.id, attempts, message);
        deadLettered++;
      } else {
        await repo.markRetry(record.id, attempts, message);
        retried++;
      }
    }
  }
  return { processed, retried, deadLettered };
}
