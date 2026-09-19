import type { LiveOpsActivityKind } from './event-definitions';

export interface EventContributionReceiptView {
  accountId: string;
  dateKey: string;
  activityKind: LiveOpsActivityKind;
  contentId: string;
  creditedPoints: number;
  occurredAtMs: number;
}

export interface EventContributionBreakdownRow {
  activityKind: LiveOpsActivityKind;
  points: number;
}

export interface EventContributionDetailRow {
  contentId: string;
  activityKind: LiveOpsActivityKind;
  points: number;
}

export interface EventContributionBreakdown {
  totalPoints: number;
  byActivity: EventContributionBreakdownRow[];
  topDetails: EventContributionDetailRow[];
}

export function aggregateContributionBreakdown(receipts: readonly EventContributionReceiptView[], maxDetails = 20): EventContributionBreakdown {
  const byActivity = new Map<LiveOpsActivityKind, number>();
  const byDetail = new Map<string, EventContributionDetailRow>();
  let totalPoints = 0;
  for (const receipt of receipts) {
    const points = Math.max(0, Math.floor(receipt.creditedPoints));
    totalPoints += points;
    byActivity.set(receipt.activityKind, (byActivity.get(receipt.activityKind) ?? 0) + points);
    const key = `${receipt.activityKind}:${receipt.contentId}`;
    const current = byDetail.get(key);
    byDetail.set(key, current ? { ...current, points: current.points + points } : { contentId: receipt.contentId, activityKind: receipt.activityKind, points });
  }
  return {
    totalPoints,
    byActivity: [...byActivity.entries()].map(([activityKind, points]) => ({ activityKind, points })).sort((a, b) => b.points - a.points),
    topDetails: [...byDetail.values()].sort((a, b) => b.points - a.points || a.contentId.localeCompare(b.contentId)).slice(0, Math.max(1, Math.min(50, maxDetails))),
  };
}
