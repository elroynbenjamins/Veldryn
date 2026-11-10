/** Prelaunch presentation only. These phases never grant or activate event rewards. */
export const FROSTFALL_PREVIEW_DAYS = 14;
export const FROSTFALL_SECOND_REVEAL_DAYS = 7;
const DAY_MS = 86_400_000;

export type FrostfallPreviewPhase = 'teaser' | 'reveal' | null;

/** Use the server-published UTC event start; never infer launch from calendar month labels. */
export function frostfallPreviewPhase(startsAtMs: number | undefined, nowMs: number): FrostfallPreviewPhase {
  if (startsAtMs === undefined || !Number.isFinite(startsAtMs) || !Number.isFinite(nowMs)) return null;
  const remaining = startsAtMs - nowMs;
  if (remaining <= 0 || remaining > FROSTFALL_PREVIEW_DAYS * DAY_MS) return null;
  return remaining <= FROSTFALL_SECOND_REVEAL_DAYS * DAY_MS ? 'reveal' : 'teaser';
}

/** Exact countdown for the second-stage reveal; avoids saying "in 7 days" all week. */
export function frostfallSecondRevealCountdown(startsAtMs: number, nowMs: number): string {
  return frostfallPreviewCountdown(startsAtMs - FROSTFALL_SECOND_REVEAL_DAYS * DAY_MS, nowMs);
}

export function frostfallPreviewCountdown(startsAtMs: number, nowMs: number): string {
  const minutes = Math.max(0, Math.ceil((startsAtMs - nowMs) / 60_000));
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}
