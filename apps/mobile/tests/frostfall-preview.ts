import {FROSTFALL_PREVIEW_DAYS, FROSTFALL_SECOND_REVEAL_DAYS, frostfallPreviewCountdown, frostfallPreviewPhase} from '../src/content/frostfall-preview';

function eq(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
}

const day = 86_400_000;
const start = Date.UTC(2026, 11, 3);
eq(FROSTFALL_PREVIEW_DAYS, 14, 'first reveal lead time');
eq(FROSTFALL_SECOND_REVEAL_DAYS, 7, 'second reveal lead time');
eq(frostfallPreviewPhase(start, start - 14 * day - 1), null, 'not visible earlier than 14 days');
eq(frostfallPreviewPhase(start, start - 14 * day), 'teaser', '14-day boundary');
eq(frostfallPreviewPhase(start, start - 7 * day - 1), 'teaser', 'before second reveal');
eq(frostfallPreviewPhase(start, start - 7 * day), 'reveal', '7-day boundary');
eq(frostfallPreviewPhase(start, start - 1), 'reveal', 'one millisecond before launch');
eq(frostfallPreviewPhase(start, start), null, 'teaser closes when event begins');
eq(frostfallPreviewPhase(start, start + 1), null, 'never display teaser after launch');
eq(frostfallPreviewPhase(undefined, start), null, 'unpublished schedule must not show preview');
eq(frostfallPreviewPhase(Number.NaN, start), null, 'invalid schedule must not show preview');
eq(frostfallPreviewPhase(start, Number.POSITIVE_INFINITY), null, 'invalid clock must not show preview');
eq(frostfallPreviewCountdown(start, start - 14 * day), '14d 0h', 'countdown at first reveal');
eq(frostfallPreviewCountdown(start, start - 7 * day), '7d 0h', 'countdown at second reveal');
eq(frostfallPreviewCountdown(start, start - 45 * 60_000), '45m', 'last-hour countdown');

console.log('PASS: Frostfall preview scheduling, unlock boundaries, and countdown');
