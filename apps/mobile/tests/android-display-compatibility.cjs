const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

const config=JSON.parse(read('app.json')).expo;
const plugin=read('plugins/with-veldryn-game-category.js');
const nativeManifest=read('android/app/src/main/AndroidManifest.xml');
const gradle=read('android/gradle.properties');
const nav=read('src/components/PrimaryNavigation.tsx');

assert.equal(config.orientation,'portrait','Keep intentional phone-first portrait design until adaptive layouts are reviewed');
assert(config.plugins.includes('./plugins/with-veldryn-game-category'),'EAS prebuild must register game category plugin');
assert(plugin.includes("'android:appCategory':'game'"),'Game classification must be applied to generated manifest');
assert(nativeManifest.includes('android:appCategory="game"'),'Checked-in native manifest must match prebuild output');
assert(gradle.includes('edgeToEdgeEnabled=true'),'Do not disable Android edge-to-edge to suppress Play Console warnings');
assert(nav.includes('useSafeAreaInsets')&&nav.includes('paddingBottom:bottomInset'),'Primary navigation must account for Android gesture inset');
console.log('PASS: native Android game classification, portrait-first design, and edge-to-edge inset safeguards');
