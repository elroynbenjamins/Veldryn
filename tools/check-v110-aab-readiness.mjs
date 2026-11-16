#!/usr/bin/env node
// Release metadata gate only. This does not replace CI, server staging or a signed EAS build.
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const json = (relative) => JSON.parse(read(relative));
const failures = [];
const check = (test, message) => { if (!test) failures.push(message); };

const app = json('apps/mobile/app.json').expo;
const pkg = json('apps/mobile/package.json');
const eas = json('apps/mobile/eas.json');
const gradle = read('apps/mobile/android/app/build.gradle');
const releaseFlags = read('apps/mobile/src/core/release-flags.ts');
const roster = read('apps/mobile/src/core/account-roster.ts');
const game = read('apps/mobile/src/core/game.ts');
const cosmetics = read('apps/mobile/src/theme/dungeon-shop-cosmetic-art.ts');
const target = '1.0.10';

check(app.version === target, 'Expo version must be 1.0.10');
check(pkg.version === target, 'Mobile package version must be 1.0.10');
check(app.android?.package === 'com.elroybenjamins.veldryn', 'Android package ID changed');
check(new RegExp('\\bversionName\\s+["\\\']' + target.replaceAll('.', '\\.') + '["\\\']').test(gradle), 'Native Android versionName is not 1.0.10');
const code = gradle.match(/\bversionCode\s+(\d+)/);
check(Boolean(code) && Number(code?.[1]) > 0, 'Native Android versionCode must be positive');
check(eas.cli?.appVersionSource === 'remote', 'EAS build numbers must use the remote version source');
check(eas.build?.production?.autoIncrement === true, 'Production EAS build number must auto-increment');
check(eas.build?.production?.android?.buildType !== 'apk', 'Production Android build must be an AAB, not APK');
check(eas.build?.production?.distribution !== 'internal', 'Production build must not be internal distribution');
check(eas.build?.production?.env?.EXPO_PUBLIC_RELEASE_CHANNEL === 'production', 'Production release channel is not set');
check(eas.build?.staging?.android?.buildType === 'apk', 'Staging must remain the separate internal APK profile');

// Protect intentionally hidden systems and the final three-role account progression.
for (const flag of ['ARENA_RELEASED', 'RANKINGS_RELEASED', 'PLAYER_MARKET_RELEASED', 'MARKET_AUTHENTICATED_SERVICE_READY', 'DUNGEON_MARKS_SHOP_RELEASED']) {
  check(new RegExp('export\\s+const\\s+' + flag + '\\s*=\\s*false\\s*;').test(releaseFlags), 'Unreleased client flag must remain false: ' + flag);
}
check(/export\s+const\s+MAX_NEW_ACCOUNT_CHARACTERS\s*=\s*3\s*;/.test(roster), 'New account character limit must remain 3');
check(/CHARACTER_SLOT_THRESHOLDS\s*=\s*\[0,250,550\]/.test(roster), 'Three-character account unlock thresholds changed');
check(roster.includes('occupiedCharacterRoles') && roster.includes('count>=MAX_NEW_ACCOUNT_CHARACTERS'), 'Role lock and server-command creation cap must remain enforced');
for (const region of ['SUNSCAR', 'FROSTMARCH', 'ASHLANDS']) {
  check(roster.includes("'" + region + "'") && game.includes("id:'region_" + region.toLowerCase() + "'"), 'Regional AFK reward missing or renamed: ' + region);
}
check(!game.includes("id:'character_slot_4'") && !game.includes("id:'character_slot_5'") && !game.includes("id:'class_set'"), 'Retired slot 4/5 or first-set AFK reward was reintroduced');
check(roster.includes('forgeMastery1050Earned') && roster.includes('worldZoneInDevelopment(zone)'), 'Forge legacy benefits or unreleased Ashlands gating no longer enforced');
for (const region of ['asterfall', 'sunscar', 'frostmarch']) {
  for (const kind of ['icon', 'border', 'background']) {
    check(cosmetics.includes('dshop_' + region + '_' + kind + ':'), 'Approved Dungeon Shop cosmetic artwork SKU missing: ' + region + ' ' + kind);
  }
}
const staging = eas.build?.staging?.env ?? {};
const production = eas.build?.production?.env ?? {};
check(staging.EXPO_PUBLIC_SUPABASE_URL !== production.EXPO_PUBLIC_SUPABASE_URL &&
  String(staging.EXPO_PUBLIC_SUPABASE_URL ?? '').includes('iqfmmpvwanvvmxcftfxw') &&
  String(production.EXPO_PUBLIC_SUPABASE_URL ?? '').includes('nyjwigipamnvpdvpauuv'), 'Staging and production Supabase project URLs must be isolated');
check(String(staging.EXPO_PUBLIC_COOP_API_URL ?? '').startsWith(staging.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1/') &&
  String(production.EXPO_PUBLIC_COOP_API_URL ?? '').startsWith(production.EXPO_PUBLIC_SUPABASE_URL + '/functions/v1/'), 'Co-op Edge URL does not match the intended environment');

if (failures.length) {
  console.error('VELDRYN 1.0.10 AAB metadata PRE-FLIGHT FAILED:');
  for (const failure of failures) console.error(' - ' + failure);
  process.exitCode = 1;
} else {
  console.log('PASS: 1.0.10 metadata, hidden-feature safety, three-role AFK progression, environment isolation and AAB settings');
  console.log('Native checked-in versionCode: ' + code[1] + '. Verify next EAS remote code exceeds Google Play before building.');
  console.log('Release is not authorized until Edge parity, mobile/Android CI and staging validation pass.');
}
