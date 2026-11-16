/**
 * Turning of the Age's read-only, server-scheduled preview.
 * Planning labels and the local device calendar never activate a festival.
 */
export const TURNING_PREVIEW_DAYS = 14;
export const TURNING_SECOND_REVEAL_DAYS = 7;
const DAY_MS = 86_400_000;

export type TurningPreviewPhase = 'teaser' | 'reveal' | null;

export function turningPreviewPhase(startsAtMs: number | undefined, nowMs: number): TurningPreviewPhase {
  if (startsAtMs === undefined || !Number.isFinite(startsAtMs) || !Number.isFinite(nowMs)) return null;
  const remaining = startsAtMs - nowMs;
  if (remaining <= 0 || remaining > TURNING_PREVIEW_DAYS * DAY_MS) return null;
  return remaining <= TURNING_SECOND_REVEAL_DAYS * DAY_MS ? 'reveal' : 'teaser';
}

export function turningPreviewCountdown(targetAtMs: number, nowMs: number): string {
  const minutes = Math.max(0, Math.ceil((targetAtMs - nowMs) / 60_000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

export function turningSecondRevealCountdown(startsAtMs: number, nowMs: number): string {
  return turningPreviewCountdown(startsAtMs - TURNING_SECOND_REVEAL_DAYS * DAY_MS, nowMs);
}
