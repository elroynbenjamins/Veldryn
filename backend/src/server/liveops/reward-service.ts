import { memberEligibleForPartyEventReward, rankingRewardForBand, reachedPersonalMilestones, type PartyEventMemberProgress, type RankingRewardBand } from './party-events';
import { partyClaimKey, personalClaimKey, rankingClaimKey, type PartyEventBinding } from './party-event-service';
import type { PartyLiveOpsEventDefinition, ScheduledPartyEvent } from './event-definitions';

export type LiveOpsRewardClaimInput =
  | { kind: 'personal_milestone'; eventInstanceId: string; accountId: string; milestonePoints: number }
  | { kind: 'party_milestone'; eventInstanceId: string; accountId: string; milestonePoints: number }
  | { kind: 'ranking'; eventInstanceId: string; accountId: string };

export interface LiveOpsRankSnapshotForClaim { partyId: string; rewardBand: Exclude<RankingRewardBand, 'none'>; }
export interface LiveOpsRewardRepository {
  withRewardClaimLock<T>(claimKey: string, work: () => Promise<T>): Promise<T>;
  getScheduledEvent(eventInstanceId: string): Promise<ScheduledPartyEvent | null>;
  getPersonalPoints(eventInstanceId: string, accountId: string): Promise<number>;
  getBinding(eventInstanceId: string, accountId: string): Promise<PartyEventBinding | null>;
  getMemberProgress(eventInstanceId: string, partyId: string, accountId: string): Promise<PartyEventMemberProgress | null>;
  getPartyScore(eventInstanceId: string, partyId: string): Promise<number>;
  getFinalRank(eventInstanceId: string, partyId: string): Promise<LiveOpsRankSnapshotForClaim | null>;
  isFinalized(eventInstanceId: string): Promise<boolean>;
  claimExists(claimKey: string): Promise<boolean>;
  /** Existing economy transaction path; must itself be idempotent by claimKey. */
  grantRewardBundle(accountId: string, rewardBundleId: string, claimKey: string): Promise<string>;
  recordClaim(input: { claimKey: string; eventInstanceId: string; accountId: string; partyId?: string; rewardKind: LiveOpsRewardClaimInput['kind']; milestonePoints?: number; rewardBundleId: string; grantedTransactionId: string }): Promise<void>;
}

function milestoneBundle(definition: PartyLiveOpsEventDefinition, kind: 'personal' | 'party', points: number): string | undefined {
  const milestones = kind === 'personal' ? definition.personalMilestones : definition.partyMilestones;
  return milestones.find((milestone) => milestone.points === points)?.reward.bundleId;
}

export async function claimLiveOpsEventReward(repo: LiveOpsRewardRepository, input: LiveOpsRewardClaimInput): Promise<{ claimed: boolean; rewardBundleId?: string; transactionId?: string }> {
  const event = await repo.getScheduledEvent(input.eventInstanceId);
  if (!event) throw new Error('event_not_found');
  const binding = await repo.getBinding(input.eventInstanceId, input.accountId);
  const claimKey = input.kind === 'personal_milestone'
    ? personalClaimKey(input.eventInstanceId, input.accountId, input.milestonePoints)
    : input.kind === 'party_milestone'
      ? partyClaimKey(input.eventInstanceId, binding?.partyId ?? 'unbound', input.accountId, input.milestonePoints)
      : rankingClaimKey(input.eventInstanceId, binding?.partyId ?? 'unbound', input.accountId);

  return repo.withRewardClaimLock(claimKey, async () => {
    if (await repo.claimExists(claimKey)) return { claimed: false };
    let rewardBundleId: string | undefined;
    let partyId: string | undefined;

    if (input.kind === 'personal_milestone') {
      const personalPoints = await repo.getPersonalPoints(input.eventInstanceId, input.accountId);
      if (!reachedPersonalMilestones(event.definition, personalPoints).includes(input.milestonePoints)) throw new Error('personal_milestone_not_reached');
      rewardBundleId = milestoneBundle(event.definition, 'personal', input.milestonePoints);
    } else if (input.kind === 'party_milestone') {
      if (!binding) throw new Error('party_event_binding_required');
      partyId = binding.partyId;
      const member = await repo.getMemberProgress(input.eventInstanceId, partyId, input.accountId);
      if (!memberEligibleForPartyEventReward(event.definition, member ?? undefined)) throw new Error('personal_party_reward_eligibility_not_met');
      const partyScore = await repo.getPartyScore(input.eventInstanceId, partyId);
      if (partyScore < input.milestonePoints) throw new Error('party_milestone_not_reached');
      rewardBundleId = milestoneBundle(event.definition, 'party', input.milestonePoints);
    } else {
      if (!await repo.isFinalized(input.eventInstanceId)) throw new Error('ranking_not_finalized');
      if (!binding) throw new Error('party_event_binding_required');
      partyId = binding.partyId;
      const member = await repo.getMemberProgress(input.eventInstanceId, partyId, input.accountId);
      if (!memberEligibleForPartyEventReward(event.definition, member ?? undefined)) throw new Error('personal_party_reward_eligibility_not_met');
      const rank = await repo.getFinalRank(input.eventInstanceId, partyId);
      if (!rank) throw new Error('party_not_ranked');
      rewardBundleId = rankingRewardForBand(event.definition, rank.rewardBand)?.bundleId;
    }
    if (!rewardBundleId) throw new Error('reward_bundle_not_configured');
    const transactionId = await repo.grantRewardBundle(input.accountId, rewardBundleId, claimKey);
    await repo.recordClaim({ claimKey, eventInstanceId: input.eventInstanceId, accountId: input.accountId, ...(partyId ? { partyId } : {}), rewardKind: input.kind, ...('milestonePoints' in input ? { milestonePoints: input.milestonePoints } : {}), rewardBundleId, grantedTransactionId: transactionId });
    return { claimed: true, rewardBundleId, transactionId };
  });
}
