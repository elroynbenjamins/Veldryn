import type { RecordContributionResult } from '../party/party-contract-service';
import type { PartyEventContributionResult } from './party-event-service';
import type { SocialContributionEvent } from './contribution';

export interface ActiveSocialTargets {
  /** Snapshotted at authoritative settlement time, never discovered later by a delayed worker. */
  partyContractInstanceId?: string;
  partyEventInstanceIds: string[];
}

export interface SocialContributionEnvelope {
  event: SocialContributionEvent;
  targets: ActiveSocialTargets;
}

export interface SocialContributionRouterDependencies {
  recordContract?: (contractInstanceId: string, event: SocialContributionEvent) => Promise<RecordContributionResult>;
  recordPartyEvent: (eventInstanceId: string, event: SocialContributionEvent) => Promise<PartyEventContributionResult>;
}

export interface SocialContributionRoutingResult {
  contract?: RecordContributionResult;
  partyEvents: { eventInstanceId: string; result: PartyEventContributionResult }[];
}

/**
 * One trusted settlement event can feed the active Party Contract and active Party Event in parallel.
 * Targets and partyIdAtSettlement are snapshotted when the gameplay/economy transaction commits, so delayed
 * outbox processing cannot reassign credit after a Party change.
 */
export async function routeSocialContribution(
  deps: SocialContributionRouterDependencies,
  envelope: SocialContributionEnvelope,
): Promise<SocialContributionRoutingResult> {
  const { event, targets } = envelope;
  const contract = targets.partyContractInstanceId && deps.recordContract
    ? await deps.recordContract(targets.partyContractInstanceId, event)
    : undefined;
  const partyEvents = [] as SocialContributionRoutingResult['partyEvents'];
  for (const eventInstanceId of targets.partyEventInstanceIds) {
    partyEvents.push({ eventInstanceId, result: await deps.recordPartyEvent(eventInstanceId, event) });
  }
  return { ...(contract ? { contract } : {}), partyEvents };
}
