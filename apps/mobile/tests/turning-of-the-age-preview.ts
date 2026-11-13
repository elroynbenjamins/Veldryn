import {TURNING_PREVIEW_DAYS, TURNING_SECOND_REVEAL_DAYS, turningPreviewCountdown, turningPreviewPhase, turningSecondRevealCountdown} from '../src/content/turning-of-the-age-preview';

const eq = (actual: unknown, expected: unknown, label: string) => {
  if (actual !== expected) throw new Error(`${label}: expected ${String(expected)}, got ${String(actual)}`);
};

const day = 86_400_000;
const launch = Date.UTC(2026, 11, 30);
eq(TURNING_PREVIEW_DAYS, 14, 'two-week teaser');
eq(TURNING_SECOND_REVEAL_DAYS, 7, 'one-week second reveal');
eq(turningPreviewPhase(launch, launch - 14 * day - 1), null, 'before teaser');
eq(turningPreviewPhase(launch, launch - 14 * day), 'teaser', 'teaser boundary');
eq(turningPreviewPhase(launch, launch - 7 * day - 1), 'teaser', 'before reveal');
eq(turningPreviewPhase(launch, launch - 7 * day), 'reveal', 'reveal boundary');
eq(turningPreviewPhase(launch, launch - 1), 'reveal', 'last instant');
eq(turningPreviewPhase(launch, launch), null, 'stop preview when launched');
eq(turningPreviewPhase(launch, launch + day), null, 'no post-launch preview');
eq(turningPreviewPhase(undefined, launch), null, 'no preview without published schedule');
eq(turningPreviewPhase(Number.NaN, launch), null, 'reject invalid schedule');
eq(turningPreviewPhase(launch, Number.POSITIVE_INFINITY), null, 'reject invalid clock');
eq(turningPreviewCountdown(launch, launch - 14 * day), '14d 0h', 'countdown start');
eq(turningPreviewCountdown(launch, launch - 50 * 60_000), '50m', 'countdown last hour');
eq(turningSecondRevealCountdown(launch, launch - 14 * day), '7d 0h', 'reveal countdown');
eq(turningSecondRevealCountdown(launch, launch - 7 * day), '0m', 'reveal complete');
console.log('PASS: Turning of the Age preview boundaries and countdown');
