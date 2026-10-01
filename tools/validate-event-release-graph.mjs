import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const mobileSrc = path.join(root, 'apps', 'mobile', 'src');
const read = relativePath => fs.readFileSync(path.join(mobileSrc, relativePath), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`Event release graph: ${message}`);
};

const liveEvents = read('content/live-events.ts');
assert(!/annual-events-v[234]/.test(liveEvents), 'future annual event catalogs are imported by the released catalog');
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
assert(!/bg_(bloomwake|veilbreak|frostfall|heartbond|starfall|volcanic_stronghold|aurora_citadel|cosmic_gate)/.test(productionSource), 'a future event background is reachable from production');

const activeModules = [read('theme/event-collectible-assets-active.ts'), read('theme/event-decoration-assets-active.ts'), read('ui/live-event-visuals-active.ts')];
for (const source of activeModules) {
  assert(!/event_collectibles\/(frostfall|veilbreak|bloomwake|heartbond|turning_of_the_age|merchant_guild|starfall|suncrest)/.test(source), 'future collectible art is present in the active pack');
  assert(!/assets\/events\/(frostfall|veilbreak|bloomwake|heartbond|turning-of-the-age|merchant-guild|starfall|suncrest)/.test(source), 'future event art is present in the active pack');
  assert(!/startup_(winters_bell|firstlight)/.test(source), 'future startup art is present in the active pack');
}
assert(!/startup_(winters_bell|firstlight)/.test(read('theme/startup-art.ts')), 'future startup art is reachable from production');

console.log('Event release graph OK: only the active Harvestwake pack is reachable from mobile production sources.');
