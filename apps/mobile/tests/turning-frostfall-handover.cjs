const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const mobile=path.resolve(__dirname,'..');
const repo=path.resolve(mobile,'../..');

const migration=fs.readFileSync(path.join(repo,'backend/supabase/migrations/20261113043200_frostfall_turning_of_the_age_2026_handover.sql'),'utf8');
const calendar=fs.readFileSync(path.join(mobile,'src/content/annual-event-calendar.ts'),'utf8');
const frostfall=fs.readFileSync(path.join(mobile,'src/content/annual-events-v2.ts'),'utf8');
const turning=fs.readFileSync(path.join(mobile,'src/content/annual-events-v3.ts'),'utf8');

const dates={
  frostLastPlayable:'2026-12-27T00:00:00Z',
  frostClaimClose:'2026-12-29T00:00:00Z',
  turningStart:'2026-12-29T00:00:00Z',
  turningLastPlayable:'2027-01-05T00:00:00Z',
  turningClaimClose:'2027-01-12T00:00:00Z',
};
for(const [name,value] of Object.entries(dates)){
  assert.ok(migration.includes(value),`missing ${name}: ${value}`);
}
assert.equal(Date.parse(dates.frostClaimClose),Date.parse(dates.turningStart),'handover instant must be exact');
assert.equal((Date.parse(dates.frostClaimClose)-Date.parse(dates.frostLastPlayable))/86400000,2,'Frostfall has two claim-only days');
assert.equal((Date.parse(dates.turningLastPlayable)-Date.parse(dates.turningStart))/86400000,7,'Turning is seven playable days');
assert.equal((Date.parse(dates.turningClaimClose)-Date.parse(dates.turningLastPlayable))/86400000,7,'Turning has seven claim-only days');
assert.match(migration,/year_end_handover_requires_both_events_disabled/,'schedule migration cannot unexpectedly rewrite enabled events');
assert.doesNotMatch(migration,/set\s+enabled\s*=/i,'the schedule migration must not activate events');
assert.match(calendar,/EVT_ANNUAL_012_2026:\{windowLabel:'Dec 3 – Dec 26'/,'calendar must show Dec 26 last playable day');
assert.match(calendar,/EVT_ANNUAL_001_2026:\{windowLabel:'Dec 29 – Jan 4'/,'Turning calendar window unchanged');
const frostfallDefinition=frostfall.slice(frostfall.indexOf('export const FROSTFALL_EVENT'));
assert.match(frostfallDefinition,/claimGraceDays:2/,'client fallback agrees with shortened server grace');
assert.match(turning,/claimGraceDays:7/,'Turning retains one week to claim');
console.log('PASS: year-end handover UTC windows, grace fallback and launch safety');
