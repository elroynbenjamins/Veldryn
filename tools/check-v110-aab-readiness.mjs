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

if (failures.length) {
  console.error('VELDRYN 1.0.10 AAB metadata PRE-FLIGHT FAILED:');
  for (const failure of failures) console.error(' - ' + failure);
  process.exitCode = 1;
} else {
  console.log('PASS: 1.0.10 Expo/package/native metadata, production AAB and remote auto-increment settings');
  console.log('Native checked-in versionCode: ' + code[1] + '. Verify next EAS remote code exceeds Google Play before building.');
  console.log('Release is not authorized until Edge parity, mobile/Android CI and staging validation pass.');
}
