import type { ScheduledPartyEvent } from './event-definitions';

export type LiveOpsNotificationKind = 'event_started' | 'event_ending_soon' | 'event_rewards_ready';
export interface LiveOpsNotificationIntent { kind: LiveOpsNotificationKind; eventInstanceId: string; deliverAtMs: number; dedupeKey: string; }

export function notificationIntentsForPartyEvent(event: ScheduledPartyEvent): LiveOpsNotificationIntent[] {
  const endingSoonAt = Math.max(event.startsAtMs, event.endsAtMs - 6 * 60 * 60 * 1000);
  const rewardsReadyAt = event.endsAtMs + event.settlementGraceMinutes * 60_000;
  return [
    { kind: 'event_started', eventInstanceId: event.instanceId, deliverAtMs: event.startsAtMs, dedupeKey: `${event.instanceId}:started` },
    { kind: 'event_ending_soon', eventInstanceId: event.instanceId, deliverAtMs: endingSoonAt, dedupeKey: `${event.instanceId}:ending_soon` },
    { kind: 'event_rewards_ready', eventInstanceId: event.instanceId, deliverAtMs: rewardsReadyAt, dedupeKey: `${event.instanceId}:rewards_ready` },
  ];
}
