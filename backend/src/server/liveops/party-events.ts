import type { ContributionCategory } from '../party/party-contracts';
import type { PartyLiveOpsEventDefinition, RewardBundleRef } from './event-definitions';

export interface PartyEventAccountProgress {
  accountId: string;
  personalPoints: number;
  combatPoints: number;
  skillingPoints: number;
}

export interface PartyEventMemberProgress {
  accountId: string;
  partyId: string;
  points: number;
  combatPoints: number;
  skillingPoints: number;
  firstContributionAtMs?: number;
  lastContributionAtMs?: number;
}

export interface PartyEventPartyProgress {
  partyId: string;
  score: number;
  combatPoints: number;
  skillingPoints: number;
  lastScoreAtMs: number;
  members: readonly PartyEventMemberProgress[];
}

export interface PartyEventEvaluation {
  partyScore: number;
  combatPoints: number;
  skillingPoints: number;
  meaningfulContributors: string[];
  rankedEligible: boolean;
  rankedEligibilityMissing: string[];
  reachedPartyMilestones: number[];
}

export interface LeaderboardEntry {
  partyId: string;
  partyName?: string;
  score: number;
  lastScoreAtMs: number;
  meaningfulContributors: number;
  rankedEligible: boolean;
  rank?: number;
  percentile?: number;
}

export type RankingRewardBand = 'top10' | 'top100' | 'top10_percent' | 'top25_percent' | 'qualified' | 'none';

export function evaluatePartyEvent(definition: PartyLiveOpsEventDefinition, progress: PartyEventPartyProgress): PartyEventEvaluation {
  const meaningfulContributors = progress.members
    .filter((member) => member.points >= definition.meaningfulContributorPoints)
    .map((member) => member.accountId);
  const missing: string[] = [];
  if (progress.score < definition.rankedMinimumPartyPoints) missing.push('party_points');
  if (meaningfulContributors.length < definition.rankedMinimumMeaningfulContributors) missing.push('meaningful_contributors');
  const categoryTotals: Record<ContributionCategory, number> = { combat: progress.combatPoints, skilling: progress.skillingPoints };
  for (const [category, fraction] of Object.entries(definition.contributionRules.minimumCategoryFraction ?? {}) as [ContributionCategory, number][]) {
    if (categoryTotals[category] < Math.ceil(definition.rankedMinimumPartyPoints * fraction)) missing.push(`minimum_${category}_share`);
  }
  return {
    partyScore: progress.score,
    combatPoints: progress.combatPoints,
    skillingPoints: progress.skillingPoints,
    meaningfulContributors,
    rankedEligible: missing.length === 0,
    rankedEligibilityMissing: missing,
    reachedPartyMilestones: definition.partyMilestones.filter((m) => progress.score >= m.points).map((m) => m.points),
  };
}

export function reachedPersonalMilestones(definition: PartyLiveOpsEventDefinition, personalPoints: number): number[] {
  return definition.personalMilestones.filter((m) => personalPoints >= m.points).map((m) => m.points);
}

export function rankPartyEntries(entries: readonly LeaderboardEntry[]): LeaderboardEntry[] {
  const eligible = entries.filter((entry) => entry.rankedEligible)
    .sort((a, b) => b.score - a.score || a.lastScoreAtMs - b.lastScoreAtMs || a.partyId.localeCompare(b.partyId));
  const total = eligible.length;
  return eligible.map((entry, index) => ({ ...entry, rank: index + 1, percentile: total === 0 ? 100 : ((index + 1) / total) * 100 }));
}

export function rankingRewardBand(rank: number | undefined, eligiblePartyCount: number, rankedEligible: boolean): RankingRewardBand {
  if (!rankedEligible || !rank || eligiblePartyCount <= 0) return 'none';
  if (rank <= 10) return 'top10';
  if (rank <= 100) return 'top100';
  if (rank <= Math.max(1, Math.ceil(eligiblePartyCount * 0.10))) return 'top10_percent';
  if (rank <= Math.max(1, Math.ceil(eligiblePartyCount * 0.25))) return 'top25_percent';
  return 'qualified';
}

export function rankingRewardForBand(definition: PartyLiveOpsEventDefinition, band: RankingRewardBand): RewardBundleRef | undefined {
  switch (band) {
    case 'top10': return definition.rankingRewards.top10 ?? definition.rankingRewards.top100 ?? definition.rankingRewards.qualified;
    case 'top100': return definition.rankingRewards.top100 ?? definition.rankingRewards.top10Percent ?? definition.rankingRewards.qualified;
    case 'top10_percent': return definition.rankingRewards.top10Percent ?? definition.rankingRewards.top25Percent ?? definition.rankingRewards.qualified;
    case 'top25_percent': return definition.rankingRewards.top25Percent ?? definition.rankingRewards.qualified;
    case 'qualified': return definition.rankingRewards.qualified;
    default: return undefined;
  }
}

export function memberEligibleForPartyEventReward(definition: PartyLiveOpsEventDefinition, member: PartyEventMemberProgress | undefined): boolean {
  return Boolean(member && member.points >= definition.personalPartyRewardEligibilityPoints);
}
