const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mobile = path.resolve(__dirname, '..');
const previewFile = path.join(mobile, 'src/components/FrostfallPreview.tsx');
const preview = fs.readFileSync(previewFile, 'utf8');
const calendar = fs.readFileSync(path.join(mobile, 'src/components/AnnualEventCalendarPanel.tsx'), 'utf8');
const released = fs.readFileSync(path.join(mobile, 'src/content/live-events.ts'), 'utf8');
const eventScreen = fs.readFileSync(path.join(mobile, 'src/screens/EventScreen.tsx'), 'utf8');

assert.match(calendar, /fetchPublicEventCalendar\(/, 'calendar must use the published server schedule');
assert.match(calendar, /frostfallPreviewPhase\(item\.startsAtMs,previewNow\)/, 'preview must be gated by schedule and clock');
assert.match(preview, /frostfallPreviewPhase\(startsAtMs, nowMs\)/, 'standalone preview must also enforce gating');
assert.match(preview, /t\('previewOnly'\)/, 'teaser must clearly identify itself as read-only in all languages');
assert.doesNotMatch(preview, /event_(reward|daily|purchase|cache|weekly)|claimEvent|purchaseEventOffer|onCommand/, 'teaser cannot perform live-event commands');
assert.doesNotMatch(released, /annual-events-v2/, 'future Frostfall gameplay must remain out of released live catalog');
assert.match(preview, /disabled=\{!tile\.unlocked\}/, 'unrevealed teaser cards must not be interactive');
assert.match(preview, /frostfallSecondRevealCountdown\(startsAtMs, nowMs\)/, 'use a changing second-reveal countdown');
assert.match(preview, /GameThemeScope colors=\{winterColors\}/, 'Frostfall preview has a winter-scoped theme');
assert.match(preview, /frostfallPreviewText\(language,key,params\)/, 'localized Frostfall copy is used');
assert.match(preview, /stacked && s\.tileStack/, 'teaser cards must adapt for small screens and large text');
assert.match(preview, /hero: \{minHeight: 184/, 'hero must grow for accessibility font scaling');
assert.doesNotMatch(calendar, /setInterval\(/, 'calendar must reuse the Event Hub clock rather than polling twice');
assert.match(eventScreen, /AnnualEventCalendarPanel state=\{state\} nowMs=\{now\}/, 'Event Hub must pass its shared clock');
assert.match(eventScreen, /showFrostfallPreview=\{!frostfallTeaser\}/, 'upcoming Frostfall must show one teaser, not duplicate cards');
assert.doesNotMatch(preview, /currency_frostbell_token\.png/, 'do not reintroduce an Android-incompatible tiny currency asset');

const arts = [...preview.matchAll(/require\(['"]([^'"]+\/assets\/[^'"]+)['"]\)/g)].map(match => match[1]);
assert.ok(arts.length >= 3, 'real Frostfall background, badge and collectible artwork must be wired');
for (const asset of arts) {
  assert.ok(fs.existsSync(path.resolve(path.dirname(previewFile), asset)), 'missing preview artwork: ' + asset);
}
console.log('PASS: Frostfall teaser assets, schedule gate and read-only release protection');
