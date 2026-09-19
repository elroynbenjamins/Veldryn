import { cappedEventCredit, scoreLiveOpsContribution, type SocialContributionEvent } from './contribution';
import { evaluatePartyEvent, type PartyEventPartyProgress } from './party-events';
import type { PartyLiveOpsEventDefinition, ScheduledPartyEvent } from './event-definitions';
import { eventPhase } from './scheduler';

export interface PartyEventBinding {
  accountId: string;
  partyId: string;
  lockedAtMs: number;
  pointsAtLock: number;
}

export interface LockedPartyEventRepository {
  getScheduledEvent(instanceId: string): Promise<ScheduledPartyEvent | null>;
  contributionReceiptExists(instanceId: string, accountId: string, sourceEventId: string): Promise<boolean>;
  pointsCreditedToday(instanceId: string, accountId: string, dateKey: string): Promise<number>;
  getBinding(instanceId: string, accountId: string): Promise<PartyEventBinding | null>;
  getMemberPartyPoints(instanceId: string, partyId: string, accountId: string): Promise<number>;
  getPartyProgress(instanceId: string, partyId: string): Promise<PartyEventPartyProgress>;
  commitContribution(input: {
    instanceId: string;
    accountId: string;
    partyId: string;
    partyNameAtSettlement?: string;
    sourceEventId: string;
    dateKey: string;
    category: 'combat' | 'skilling';
    activityKind: string;
    contentId: string;
    rawPoints: number;
    creditedPoints: number;
    partyCreditedPoints: number;
    occurredAtMs: number;
  }): Promise<'inserted' | 'duplicate'>;
  lockBinding(input: PartyEventBinding): Promise<void>;
}

export interface PartyEventRepository {
  withEventAccountLock<T>(instanceId: string, accountId: string, work: (repo: LockedPartyEventRepository) => Promise<T>): Promise<T>;
}

export type PartyEventContributionResult =
  | { ok: false; code: 'event_not_found' | 'event_not_active' | 'no_party' | 'activity_not_eligible' }
  | { ok: true; duplicate: true }
  | { ok: true; duplicate: false; rawPoints: number; creditedPoints: number; partyCreditedPoints: number; bindingPartyId?: string; partyEvaluation: ReturnType<typeof evaluatePartyEvent> };

/**
 * Trusted contribution entrypoint for Party Events. It is intentionally account-serialized to protect daily caps and party binding.
 * Personal event points remain creditable after switching parties, but once binding locks, only the bound party receives party/ranking points.
 */
export async function recordPartyEventContribution(
  repo: PartyEventRepository,
  instanceId: string,
  contribution: SocialContributionEvent,
  nowMs = contribution.occurredAtMs,
): Promise<PartyEventContributionResult> {
  return repo.withEventAccountLock(instanceId, contribution.accountId, async (locked) => {
    const scheduled = await locked.getScheduledEvent(instanceId);
    if (!scheduled) return { ok: false, code: 'event_not_found' } as const;
    if (eventPhase(scheduled, nowMs) !== 'active') return { ok: false, code: 'event_not_active' } as const;
    const score = scoreLiveOpsContribution(contribution, scheduled.definition);
    if (!score.eligible) return { ok: false, code: 'activity_not_eligible' } as const;
    const currentPartyId = contribution.partyIdAtSettlement;
    if (!currentPartyId) return { ok: false, code: 'no_party' } as const;
    if (await locked.contributionReceiptExists(instanceId, contribution.accountId, contribution.sourceEventId)) return { ok: true, duplicate: true } as const;

    const creditedToday = await locked.pointsCreditedToday(instanceId, contribution.accountId, contribution.dateKey);
    const creditedPoints = cappedEventCredit(score.eventPoints, creditedToday, scheduled.definition.contributionRules.dailyAccountCreditCap);
    const binding = await locked.getBinding(instanceId, contribution.accountId);
    const partyCreditedPoints = !binding || binding.partyId === currentPartyId ? creditedPoints : 0;

    const committed = await locked.commitContribution({
      instanceId, accountId: contribution.accountId, partyId: currentPartyId, partyNameAtSettlement: contribution.partyNameAtSettlement, sourceEventId: contribution.sourceEventId,
      dateKey: contribution.dateKey, category: contribution.profile.category, activityKind: contribution.activityKind,
      contentId: contribution.contentId, rawPoints: score.eventPoints, creditedPoints, partyCreditedPoints, occurredAtMs: contribution.occurredAtMs,
    });
    if (committed === 'duplicate') return { ok: true, duplicate: true } as const;

    let bindingPartyId = binding?.partyId;
    if (!binding && partyCreditedPoints > 0) {
      const newPartyPoints = await locked.getMemberPartyPoints(instanceId, currentPartyId, contribution.accountId);
      if (newPartyPoints >= scheduled.definition.partyBindingLockPoints) {
        await locked.lockBinding({ accountId: contribution.accountId, partyId: currentPartyId, lockedAtMs: nowMs, pointsAtLock: newPartyPoints });
        bindingPartyId = currentPartyId;
      }
    }
    const partyProgress = await locked.getPartyProgress(instanceId, currentPartyId);
    return {
      ok: true, duplicate: false, rawPoints: score.eventPoints, creditedPoints, partyCreditedPoints,
      ...(bindingPartyId ? { bindingPartyId } : {}), partyEvaluation: evaluatePartyEvent(scheduled.definition, partyProgress),
    } as const;
  });
}

export interface PartyEventFinalizationSnapshot {
  instanceId: string;
  definitionId: string;
  definitionVersion: number;
  finalizedAtMs: number;
  rankedParties: number;
  checksum: string;
}

export function personalClaimKey(instanceId: string, accountId: string, milestonePoints: number): string {
  return `${instanceId}:personal:${accountId}:${milestonePoints}`;
}
export function partyClaimKey(instanceId: string, partyId: string, accountId: string, milestonePoints: number): string {
  return `${instanceId}:party:${partyId}:${accountId}:${milestonePoints}`;
}
export function rankingClaimKey(instanceId: string, partyId: string, accountId: string): string {
  return `${instanceId}:ranking:${partyId}:${accountId}`;
}

export function immutableDefinitionIdentity(definition: PartyLiveOpsEventDefinition): string {
  return `${definition.id}@${definition.version}`;
}
