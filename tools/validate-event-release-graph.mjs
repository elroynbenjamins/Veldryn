import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const mobileSrc = path.join(root, 'apps', 'mobile', 'src');
const read = relativePath => fs.readFileSync(path.join(mobileSrc, relativePath), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`Event release graph: ${message}`);
};

const liveEvents = read('content/live-events.ts');
assert(!/annual-events-v[34]/.test(liveEvents), 'unreleased future annual event catalogs are imported by the released catalog');
assert(/import \{FROSTFALL_EVENT\} from '\.\/annual-events-v2'/.test(liveEvents), 'Frostfall scheduled release is missing from the playable definition catalog');
assert(/LIVE_EVENT_CATALOG:LiveEventDef\[\]=\[VEILBREAK_EVENT,FROSTFALL_EVENT\]/.test(liveEvents), 'only Veilbreak and scheduled Frostfall should be registered');
assert((liveEvents.match(/export const LIVE_EVENT_CATALOG/g) ?? []).length === 1, 'released catalog has an unexpected shape');

const productionFiles = [
  'theme/pet-art.ts', 'theme/companion-art.ts', 'theme/profile-border-assets.ts',
  'components/PlayerProfileCard.tsx', 'components/ProfileScenePreview.tsx',
  'components/EventIdentityBadge.tsx', 'screens/EventScreen.tsx', 'content/collectibles.ts',
  'theme/profile-background-assets.ts', 'theme/card-background-assets.ts',
];
const productionSource = productionFiles.map(read).join('\n');
assert(!/event-collectible-assets['"]/.test(productionSource), 'an unfiltered collectible registry is reachable from production');
assert(!/event-decoration-assets['"]/.test(productionSource), 'an unfiltered decoration registry is reachable from production');
assert(!/live-event-visuals['"]/.test(productionSource), 'the all-event visual registry is reachable from production');
assert(!/event-collectible-content['"]/.test(productionSource), 'the all-event collectible content registry is reachable from production');
assert(!/bg_(bloomwake|heartbond|starfall|volcanic_stronghold|aurora_citadel|cosmic_gate)/.test(productionSource), 'a future event background is reachable from production');

const activeModules = [read('theme/event-collectible-assets-active.ts'), read('theme/event-decoration-assets-active.ts'), read('ui/live-event-visuals-active.ts')];
for (const source of activeModules) {
  assert(!/event_collectibles\/(bloomwake|heartbond|turning_of_the_age|merchant_guild|starfall|suncrest)/.test(source), 'future collectible art is present in the active pack');
  assert(!/assets\/events\/(bloomwake|heartbond|turning-of-the-age|merchant-guild|starfall|suncrest)/.test(source), 'future event art is present in the active pack');
  assert(!/startup_(winters_bell|firstlight)/.test(source), 'future startup art is present in the active pack');
}
assert(!/startup_(winters_bell|firstlight)/.test(read('theme/startup-art.ts')), 'future startup art is reachable from production');

const frostfallActivation = fs.readFileSync(path.join(root, 'backend/supabase/migrations/20261125140600_frostfall_2026_scheduled_activation_v1.sql'), 'utf8');
assert(/autoActivationArmed[^\n]*true/.test(frostfallActivation), 'Frostfall launch migration must arm without pre-enabling the event');
assert(/clock_timestamp\(\)>=starts_at[\s\S]*clock_timestamp\(\)<ends_at/.test(frostfallActivation), 'Frostfall activation must use the exact server-owned active window');
assert(/2026-12-03 00:00:00\+00/.test(frostfallActivation) && /2026-12-27 00:00:00\+00/.test(frostfallActivation) && /2026-12-29 00:00:00\+00/.test(frostfallActivation), 'Frostfall activation dates drifted from the published schedule');
assert(/cron\.unschedule\('veldryn-frostfall-2026-activate'\)/.test(frostfallActivation), 'activation job must self-remove after success');
assert(/stop_frostfall_2026_v1[\s\S]*enabled=false[\s\S]*autoActivationArmed[^\n]*false/.test(frostfallActivation), 'emergency stop must disable and disarm Frostfall');
assert(/close_frostfall_2026_v1[\s\S]*clock_timestamp\(\)>=grace_ends_at/.test(frostfallActivation), 'Frostfall must close only after the claim grace boundary');

console.log('Event release graph OK: Veilbreak and scheduled Frostfall only; other unreleased annual packs remain blocked.');
