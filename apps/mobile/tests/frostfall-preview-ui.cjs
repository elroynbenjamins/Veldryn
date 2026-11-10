const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobile = path.resolve(__dirname, '..');
const previewFile = path.join(mobile, 'src/components/FrostfallPreview.tsx');
const preview = fs.readFileSync(previewFile, 'utf8');
const calendar = fs.readFileSync(path.join(mobile, 'src/components/AnnualEventCalendarPanel.tsx'), 'utf8');
const released = fs.readFileSync(path.join(mobile, 'src/content/live-events.ts'), 'utf8');

assert.match(calendar, /fetchPublicEventCalendar\(/, 'calendar must use the published server schedule');
assert.match(calendar, /frostfallPreviewPhase\(item\.startsAtMs,previewNow\)/, 'preview must be gated by schedule and clock');
assert.match(preview, /frostfallPreviewPhase\(startsAtMs, nowMs\)/, 'standalone preview must also enforce gating');
assert.match(preview, /Preview only/, 'teaser must clearly identify itself as read-only');
assert.doesNotMatch(preview, /event_(reward|daily|purchase|cache|weekly)|claimEvent|purchaseEventOffer|onCommand/, 'teaser cannot perform live-event commands');
assert.doesNotMatch(released, /annual-events-v2/, 'future Frostfall gameplay must remain out of released live catalog');

const arts = [...preview.matchAll(/require\(['"]([^'"]+\/assets\/[^'"]+)['"]\)/g)].map(match => match[1]);
assert.ok(arts.length >= 3, 'real Frostfall background, badge and collectible artwork must be wired');
for (const asset of arts) {
  assert.ok(fs.existsSync(path.resolve(path.dirname(previewFile), asset)), 'missing preview artwork: ' + asset);
}
console.log('PASS: Frostfall teaser assets, schedule gate and read-only release protection');
