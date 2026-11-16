const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const mobile=path.resolve(__dirname,'..');
const source=(p)=>fs.readFileSync(path.join(mobile,p),'utf8');
const previewPath=path.join(mobile,'src/components/TurningOfTheAgePreview.tsx');
const preview=fs.readFileSync(previewPath,'utf8');
const calendar=source('src/components/AnnualEventCalendarPanel.tsx');
const screen=source('src/screens/EventScreen.tsx');
const released=source('src/content/live-events.ts');
const future=source('src/ui/live-event-visuals-future.ts');

assert.match(calendar,/fetchPublicEventCalendar\(/,'preview dates must come from the server schedule');
assert.match(calendar,/turningPreviewPhase\(item\.startsAtMs,previewNow\)/,'calendar teaser uses published time boundaries');
assert.match(calendar,/TurningOfTheAgePreview startsAtMs=\{turningWindow\.startsAtMs\}/,'calendar renders the new teaser');
assert.match(calendar,/const detailEventYear=/,'January collection must resolve the previous December season');
assert.match(calendar,/const seasonLabel=/,'cross-year season is displayed correctly');
assert.match(calendar,/cosmic_gate_wide_v2\.webp/,'Turning hero uses dedicated existing artwork rather than missing art');
assert.match(screen,/turningPreviewPhase\(event\.runtime\.startsAtMs,now\)/,'upcoming event checks exact preview phase');
assert.match(screen,/showTurningPreview=\{!turningTeaser\}/,'do not show two teasers');
assert.match(preview,/turningPreviewPhase\(startsAtMs,nowMs\)/,'standalone teaser guards its own render');
assert.match(preview,/turningPreviewText\(language,key,params\)/,'preview uses localized text');
assert.match(preview,/narrow&&s\.tileNarrow/,'tiles adapt to narrow width or larger font');
assert.match(preview,/t\('previewOnly'\)/,'make read-only status visible');
assert.doesNotMatch(preview,/claimEvent|purchaseEventOffer|onCommand|applyEventDrops/,'preview must not grant currency, unlocks or rewards');
assert.doesNotMatch(released,/import .*annual-events-v3/,'event is not prematurely registered as live');
assert.match(future,/export const TURNING_OF_THE_AGE/,'art bundle remains source-only');
for(const asset of [...preview.matchAll(/require\(['"]([^'"]+\/assets\/[^'"]+)['"]\)/g)].map(x=>x[1])){
  assert.ok(fs.existsSync(path.resolve(path.dirname(previewPath),asset)),'preview artwork missing: '+asset);
}
console.log('PASS: Turning teaser preview is schedule-gated, read-only, localized and uses existing art');
